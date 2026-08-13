import express from 'express';
import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import Block from '../models/Block.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// POST /api/chat/start (Protected)
// Starts a 1:1 chat between post author and current user
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Requester cannot be the author
    if (post.authorId.toString() === req.user.userId) {
      return res.status(400).json({ message: 'You cannot start a conversation on your own post' });
    }

    // Check if block relationship exists between requester and post author
    const blockExists = await Block.findOne({
      $or: [
        { blockerId: req.user.userId, blockedUserId: post.authorId },
        { blockerId: post.authorId, blockedUserId: req.user.userId },
      ],
    });

    if (blockExists) {
      return res.status(400).json({ message: 'Cannot start conversation: A block exists between you and this user' });
    }

    // Check for existing active room
    const existingRoom = await ChatRoom.findOne({
      postId,
      participants: { $all: [req.user.userId, post.authorId] },
      status: 'active',
    });

    if (existingRoom) {
      return res.status(200).json({ roomId: existingRoom._id });
    }

    // Create a new room
    const newRoom = new ChatRoom({
      postId,
      participants: [req.user.userId, post.authorId],
      participantAnonIds: [req.user.anonId, post.authorAnonId],
    });

    await newRoom.save();

    // Update post status to in_conversation
    post.status = 'in_conversation';
    await post.save();

    return res.status(201).json({ roomId: newRoom._id });
  } catch (error) {
    console.error('Error starting conversation');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/chat/rooms (Protected)
// Returns all rooms the logged-in user is a participant of
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({ participants: req.user.userId });

    const roomsWithPreview = await Promise.all(
      rooms.map(async (room) => {
        // Fetch last message
        const lastMsg = await Message.findOne({ roomId: room._id }).sort({ createdAt: -1 });

        // Identify other participant
        const otherIndex = room.participants.indexOf(req.user.userId) === 0 ? 1 : 0;
        const otherAnonId = room.participantAnonIds[otherIndex];

        return {
          _id: room._id,
          postId: room.postId,
          status: room.status,
          otherParticipantAnonId: otherAnonId,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                createdAt: lastMsg.createdAt,
              }
            : null,
          createdAt: room.createdAt,
          lastActivityAt: lastMsg ? lastMsg.createdAt : room.createdAt,
        };
      })
    );

    // Sort by last activity descending
    roomsWithPreview.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

    return res.status(200).json(roomsWithPreview);
  } catch (error) {
    console.error('Error fetching chat rooms');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/chat/rooms/:roomId/messages (Protected)
// Returns message history, verified server-side
router.get('/rooms/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // CRITICAL SECURITY: Verify requester is a participant of the room
    const isParticipant = room.participants.some(
      (pId) => pId.toString() === req.user.userId
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied: You are not a participant in this conversation' });
    }

    const messages = await Message.find({ roomId: req.params.roomId })
      .sort({ createdAt: 1 })
      .select('_id roomId senderAnonId content createdAt'); // Excludes private senderId

    return res.status(200).json({
      status: room.status,
      participantAnonIds: room.participantAnonIds,
      messages,
    });
  } catch (error) {
    console.error('Error fetching messages');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/chat/rooms/:roomId/close (Protected)
// Ends the conversation and closes the room
router.post('/rooms/:roomId/close', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Verify participation
    const isParticipant = room.participants.some(
      (pId) => pId.toString() === req.user.userId
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    room.status = 'closed';
    await room.save();

    // Close the post associated as well, staying closed once ended
    const post = await Post.findById(room.postId);
    if (post) {
      post.status = 'closed';
      await post.save();
    }

    return res.status(200).json({ success: true, message: 'Conversation ended successfully' });
  } catch (error) {
    console.error('Error closing conversation');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
