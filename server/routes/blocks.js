import express from 'express';
import Block from '../models/Block.js';
import User from '../models/User.js';
import ChatRoom from '../models/ChatRoom.js';
import Post from '../models/Post.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// POST /api/blocks (Protected)
// Blocks a user, closing active chat rooms between them
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { blockedAnonId, roomId, blockedUserId } = req.body;

    let targetUserId;

    if (blockedAnonId) {
      const targetUser = await User.findOne({ anonId: blockedAnonId });
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      targetUserId = targetUser._id;
    } else if (roomId) {
      const room = await ChatRoom.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Chat room not found' });
      }
      targetUserId = room.participants.find((p) => p.toString() !== req.user.userId);
    } else if (blockedUserId) {
      targetUserId = blockedUserId;
    }

    if (!targetUserId) {
      return res.status(400).json({ message: 'Provide blockedAnonId, roomId, or blockedUserId' });
    }

    // Blocker cannot block themselves
    if (targetUserId.toString() === req.user.userId) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    // Check if block already exists
    const existingBlock = await Block.findOne({
      blockerId: req.user.userId,
      blockedUserId: targetUserId,
    });

    if (existingBlock) {
      return res.status(200).json({ success: true, message: 'User is already blocked' });
    }

    // Save block record
    const block = new Block({
      blockerId: req.user.userId,
      blockedUserId: targetUserId,
    });
    await block.save();

    // Immediately close any active chat rooms between these two users
    const roomsToClose = await ChatRoom.find({
      participants: { $all: [req.user.userId, targetUserId] },
      status: 'active',
    });

    for (const room of roomsToClose) {
      room.status = 'closed';
      await room.save();

      // Set the post status to closed
      const post = await Post.findById(room.postId);
      if (post) {
        post.status = 'closed';
        await post.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: 'User blocked successfully. All active chats ended.',
    });
  } catch (error) {
    console.error('Error blocking user');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/blocks (Protected)
// Returns list of blocked users' anonIds
router.get('/', authMiddleware, async (req, res) => {
  try {
    const blocks = await Block.find({ blockerId: req.user.userId }).populate('blockedUserId', 'anonId');
    
    const blockedList = blocks
      .filter((b) => b.blockedUserId) // In case referenced user is deleted
      .map((b) => ({
        _id: b._id,
        anonId: b.blockedUserId.anonId,
      }));

    return res.status(200).json(blockedList);
  } catch (error) {
    console.error('Error fetching block list');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/blocks/:id (Protected)
// Unblocks a user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const block = await Block.findOneAndDelete({
      _id: req.params.id,
      blockerId: req.user.userId,
    });

    if (!block) {
      return res.status(404).json({ message: 'Block record not found or unauthorized' });
    }

    return res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
