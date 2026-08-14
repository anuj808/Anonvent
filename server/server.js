import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import postsRouter from './routes/posts.js';
import chatRouter from './routes/chat.js';
import reportsRouter from './routes/reports.js';
import blocksRouter from './routes/blocks.js';
import adminRouter from './routes/admin.js';
import { initSocket } from './sockets/socket.js';

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Set up secure HTTP headers
app.use(helmet());

// Set up CORS with support for multiple origins (comma-separated list)
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''))
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Prevent NoSQL query injection
app.use(mongoSanitize());

// Global Rate Limiter: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use(limiter);

// Parse JSON and Cookies
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB Database
connectDB();

// Stricter Rate Limiter for Authentication: max 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes' }
});

// API Routes
app.get('/', (req, res) => {
  res.json({ message: 'AnonVent API Server is running successfully' });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/admin', adminRouter);
app.use('/api', healthRouter);

// Production Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err); // Log full error details server-side
  
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  
  res.status(status).json({
    error: isProduction ? 'Something went wrong' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
initSocket(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
