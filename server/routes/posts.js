import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import Post from '../models/Post.js';
import Block from '../models/Block.js';
import authMiddleware from '../middleware/auth.js';
import { ALLOWED_TAGS } from '../config/constants.js';

const router = express.Router();

const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'hurt myself',
  'cutting',
  'overdose',
  'ending my life',
  'suicidal',
  'kill my self',
];

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

// User-keyed rate limiter: Max 5 posts per hour per user
const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => {
    // authMiddleware runs first, guaranteeing req.user is set
    return req.user?.userId || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You can only create up to 5 posts per hour. Please take a deep breath.' },
});

// POST /api/posts (Protected)
router.post('/', authMiddleware, postLimiter, async (req, res) => {
  try {
    const { content, tags } = req.body;

    // Validate content length
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ message: 'Content must be at least 10 characters long' });
    }
    if (content.length > 1000) {
      return res.status(400).json({ message: 'Content cannot exceed 1000 characters' });
    }

    // Validate tags
    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: 'Tags must be an array' });
    }
    if (tags.length > 3) {
      return res.status(400).json({ message: 'You can choose up to 3 tags only' });
    }
    const tagsValid = tags.every(t => ALLOWED_TAGS.includes(t));
    if (!tagsValid) {
      return res.status(400).json({ message: 'Selected tags are invalid' });
    }

    // Sanitize content
    const sanitizedContent = sanitizeContent(content);

    // Crisis keyword check
    const contentLower = content.toLowerCase();
    const isCrisis = CRISIS_KEYWORDS.some(kw => contentLower.includes(kw));

    // Create post
    const newPost = new Post({
      authorId: req.user.userId,
      authorAnonId: req.user.anonId,
      content: sanitizedContent,
      tags,
      flaggedForReview: isCrisis,
    });

    await newPost.save();

    // Map response structure excluding authorId
    const responsePost = {
      _id: newPost._id,
      authorAnonId: newPost.authorAnonId,
      content: newPost.content,
      tags: newPost.tags,
      status: newPost.status,
      createdAt: newPost.createdAt,
    };

    return res.status(201).json({
      post: responsePost,
      crisisResourceShown: isCrisis,
    });
  } catch (error) {
    console.error('Error creating post'); // No req.body logs to protect password / credentials
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/posts (Public, paginated, supports tag filter)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const tag = req.query.tag;
    const limit = 20;
    const skip = (page - 1) * limit;

    const query = { flaggedForReview: false }; // Hide flagged posts for safety
    if (tag && ALLOWED_TAGS.includes(tag)) {
      query.tags = tag;
    }

    // Optional decode: Exclude posts authored by blocked users (and vice-versa)
    let loggedInUserId = null;
    const token = req.cookies?.token;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'change_this_to_a_secure_random_string_in_production';
        const decoded = jwt.verify(token, secret);
        loggedInUserId = decoded.userId;
      } catch (err) {
        // Continue anonymously if token is invalid/expired
      }
    }

    if (loggedInUserId) {
      const blocks = await Block.find({
        $or: [
          { blockerId: loggedInUserId },
          { blockedUserId: loggedInUserId },
        ],
      });

      const excludeUserIds = blocks.map((b) =>
        b.blockerId.toString() === loggedInUserId.toString() ? b.blockedUserId : b.blockerId
      );

      if (excludeUserIds.length > 0) {
        query.authorId = { $nin: excludeUserIds };
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id authorAnonId content tags status createdAt'); // Exclude authorId

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/posts/mine (Protected, returns user's own posts)
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('_id authorAnonId content tags status createdAt'); // Exclude authorId

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching user posts');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/posts/:id (Protected, validates ownership)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Verify authorship
    if (post.authorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
