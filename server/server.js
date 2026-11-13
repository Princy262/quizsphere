import 'dotenv/config';            
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import examinerRoutes from './routes/examinerRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { startAttemptSweeper } from './utils/attemptSweeper.js';
import imageRoutes from './routes/imageRoutes.js';

// Wait for the database before doing anything else
await connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'QuizSphere API is running' });
});

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