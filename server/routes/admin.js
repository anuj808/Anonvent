import express from 'express';
import Report from '../models/Report.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Middleware to ensure user is an Admin
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied: Admin verification failed' });
  }
  next();
};

// GET /api/admin/reports (Protected, Admin Only)
// Lists reports, filterable by status, paginated
router.get('/reports', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const statusFilter = req.query.status || 'pending';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ status: statusFilter })
      .populate('reporterId', 'anonId')
      .populate('reportedUserId', 'anonId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments({ status: statusFilter });

    return res.status(200).json({
      reports,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReports: total,
    });
  } catch (error) {
    console.error('Error fetching admin reports');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/admin/reports/:id (Protected, Admin Only)
// Updates the status of a report ticket
router.patch('/reports/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'reviewed', 'actioned', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid report status value' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report ticket not found' });
    }

    report.status = status;
    await report.save();

    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Error updating report status');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/admin/flagged-posts (Protected, Admin Only)
// Lists all posts flagged for review by the crisis checks
router.get('/flagged-posts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ flaggedForReview: true }).sort({ createdAt: -1 });
    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching flagged posts');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/admin/posts/:id/unflag (Protected, Admin Only)
// Unflags a post, making it visible again
router.patch('/posts/:id/unflag', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.flaggedForReview = false;
    await post.save();

    return res.status(200).json({ success: true, message: 'Post unflagged successfully', post });
  } catch (error) {
    console.error('Error unflagging post');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/admin/posts/:id (Protected, Admin Only)
// Deletes an offending post
router.delete('/posts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res.status(200).json({ success: true, message: 'Post deleted successfully by admin' });
  } catch (error) {
    console.error('Error deleting flagged post');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
