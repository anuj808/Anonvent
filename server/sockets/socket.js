import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';
import Block from '../models/Block.js';
import Post from '../models/Post.js';

let io;

// Custom utility to parse raw handshake cookies
const parseCookies = (cookieString) => {
  const list = {};
  if (!cookieString) return list;
  cookieString.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

// Helper to escape HTML tags to prevent XSS
const sanitizeContent = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const initSocket = (httpServer) => {
  const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''))
    : ['http://localhost:5173'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware via JWT Cookie
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const cookies = parseCookies(cookieHeader);
      const token = cookies.token;

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const secret = process.env.JWT_SECRET || 'change_this_to_a_secure_random_string_in_production';
      const decoded = jwt.verify(token, secret);

      socket.user = {
        userId: decoded.userId,
        anonId: decoded.anonId,
      };

      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.user.anonId})`);

    // In-memory rate limiting counters per socket connection
    socket.msgCount = 0;
    socket.lastMsgReset = Date.now();

    // Event: Join Room (secured with DB verification check)
    socket.on('join_room', async ({ roomId }) => {
      try {
        if (!roomId) return;
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          return socket.emit('error_message', { message: 'Chat room not found' });
        }

        // Verify socket user is in participants list
        const isParticipant = room.participants.some(
          (pId) => pId.toString() === socket.user.userId
        );
        if (!isParticipant) {
          return socket.emit('error_message', { message: 'Access denied: You are not in this conversation' });
        }

        if (room.status === 'closed') {
          return socket.emit('error_message', { message: 'This conversation has been closed' });
        }

        socket.join(roomId);
        console.log(`User ${socket.user.anonId} joined room ${roomId}`);
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to join room' });
      }
    });

    // Event: Send Message (sanitized and rate limited)
    socket.on('send_message', async ({ roomId, content }) => {
      try {
        if (!roomId || !content) return;

        // Rate limiting check: max 30 messages per minute
        const now = Date.now();
        if (now - socket.lastMsgReset > 60000) {
          socket.msgCount = 0;
          socket.lastMsgReset = now;
        }
        if (socket.msgCount >= 30) {
          return socket.emit('error_message', { message: 'Rate limit exceeded. Please slow down.' });
        }
        socket.msgCount++;

        const room = await ChatRoom.findById(roomId);
        if (!room) {
          return socket.emit('error_message', { message: 'Room not found' });
        }

        if (room.status === 'closed') {
          return socket.emit('error_message', { message: 'This conversation has been closed' });
        }

        // Verify socket user is in participants list
        const isParticipant = room.participants.some(
          (pId) => pId.toString() === socket.user.userId
        );
        if (!isParticipant) {
          return socket.emit('error_message', { message: 'Access denied' });
        }

        // Check if blocker relationship exists between participants
        const otherParticipantId = room.participants.find(
          (pId) => pId.toString() !== socket.user.userId
        );
        const blockExists = await Block.findOne({
          $or: [
            { blockerId: socket.user.userId, blockedUserId: otherParticipantId },
            { blockerId: otherParticipantId, blockedUserId: socket.user.userId },
          ],
        });

        if (blockExists) {
          // Reject silently: close room and post, emit error, do not deliver
          room.status = 'closed';
          await room.save();

          const post = await Post.findById(room.postId);
          if (post) {
            post.status = 'closed';
            await post.save();
          }

          socket.emit('error_message', { message: 'This conversation has been closed' });
          return;
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0 || trimmedContent.length > 2000) {
          return socket.emit('error_message', { message: 'Invalid message length' });
        }

        // Sanitize XSS tags
        const sanitizedContent = sanitizeContent(trimmedContent);

        // Save Message
        const message = new Message({
          roomId,
          senderId: socket.user.userId,
          senderAnonId: socket.user.anonId,
          content: sanitizedContent,
        });
        await message.save();

        // Broadcast Message
        io.to(roomId).emit('receive_message', {
          _id: message._id,
          roomId,
          senderAnonId: message.senderAnonId,
          content: message.content,
          createdAt: message.createdAt,
        });
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to send message' });
      }
    });

    // Event: Typing Indicators
    socket.on('typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', { roomId, senderAnonId: socket.user.anonId });
    });

    socket.on('stop_typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_stop_typing', { roomId, senderAnonId: socket.user.anonId });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};
