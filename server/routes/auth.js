import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// List of disposable email domains to reject
const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'yopmail.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'getairmail.com',
  'burnermail.io',
  'dispostable.com',
  'trashmail.com'
];

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address format' });
    }

    // Reject disposable domains
    const domain = email.split('@')[1]?.toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return res.status(400).json({ message: 'Temporary or disposable email domains are not allowed' });
    }

    // Password strength check (min 8 chars)
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Generate unique anonId with collision check
    let anonId;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const hex = crypto.randomBytes(3).toString('hex').toLowerCase();
      anonId = `Anon_${hex}`;
      const conflict = await User.findOne({ anonId });
      if (!conflict) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ message: 'Error generating unique identity' });
    }

    // Hash password with 12 rounds
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user record
    const newUser = new User({
      email,
      passwordHash,
      anonId
    });

    await newUser.save();

    // Secure payload: Only return anonId and isAdmin (false by default)
    return res.status(201).json({ anonId, isAdmin: false });
  } catch (error) {
    console.error('Registration error occurred'); // Avoid logging req.body or passwords
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Generic message to prevent email harvesting
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Issue JWT
    const secret = process.env.JWT_SECRET || 'change_this_to_a_secure_random_string_in_production';
    const token = jwt.sign(
      { userId: user._id, anonId: user.anonId, isAdmin: user.isAdmin },
      secret,
      { expiresIn: '7d' }
    );

    // Set cookie based on environment for cross-site cookie sharing
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Secure payload: return anonId and isAdmin
    return res.status(200).json({ anonId: user.anonId, isAdmin: user.isAdmin });
  } catch (error) {
    console.error('Login error occurred'); // Avoid logging req.body or passwords
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  // Returns the anonId and isAdmin status
  return res.status(200).json({ anonId: req.user.anonId, isAdmin: req.user.isAdmin });
});

export default router;
