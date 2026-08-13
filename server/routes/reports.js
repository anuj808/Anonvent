import express from 'express';
import rateLimit from 'express-rate-limit';
import Report from '../models/Report.js';
import Post from '../models/Post.js';
import Message from '../models/Message.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for reporting: max 10 reports per hour per user
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { message: 'Report rate limit exceeded. Please wait an hour before submitting more.' },
});

// POST /api/reports (Protected)
// Creates a new report ticket
router.post('/', authMiddleware, reportLimiter, async (req, res) => {
  try {
    const { reportType, targetId, reason, details } = req.body;

    if (!reportType || !targetId || !reason) {
      return res.status(400).json({ message: 'reportType, targetId, and reason are required' });
    }

    if (!['post', 'message'].includes(reportType)) {
      return res.status(400).json({ message: 'Invalid reportType. Must be post or message' });
    }

    let reportedUserId;

    if (reportType === 'post') {
      const post = await Post.findById(targetId);
      if (!post) {
        return res.status(404).json({ message: 'Target post not found' });
      }
      reportedUserId = post.authorId;
    } else {
      const message = await Message.findById(targetId);
      if (!message) {
        return res.status(404).json({ message: 'Target message not found' });
      }
      reportedUserId = message.senderId;
    }

    // Reporter cannot report themselves
    if (reportedUserId.toString() === req.user.userId) {
      return res.status(400).json({ message: 'You cannot report your own content' });
    }

    const report = new Report({
      reporterId: req.user.userId,
      reportedUserId,
      reportType,
      targetId,
      reason,
      details: details ? details.trim() : '',
    });

    await report.save();

    return res.status(201).json({
      success: true,
      message: 'Thanks — our team will look into this',
    });
  } catch (error) {
    console.error('Error submitting report');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
