import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import examinerRoutes from './routes/examinerRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { startAttemptSweeper } from './utils/attemptSweeper.js';

// Refuse to start with a missing or weak secret
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set and at least 32 characters long');
  process.exit(1);
}

// Wait for the database before doing anything else
await connectDB();

const app = express();

// Hosting platforms sit behind a proxy; this lets rate limiting see the real IP
app.set('trust proxy', 1);

// Security headers. "cross-origin" is needed so question images can load
// on the frontend, which runs on a different address than the API.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Only your own frontend may call the API from a browser
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = Postman or server-to-server, allow it
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

// Slow down password guessing: failed logins and registrations are limited per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true, // normal successful logins never count
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});

app.get('/', (req, res) => {
  res.json({ message: 'QuizSphere API is running' });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/examiner', examinerRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/images', imageRoutes);

app.use(notFound);
app.use(errorHandler);

startAttemptSweeper();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});