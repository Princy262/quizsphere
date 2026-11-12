import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  getCategories,
  getAllQuizzes,
  getQuizDetails,
} from '../controllers/studentQuizController.js';
import {
  startAttempt,
  saveAnswer,
  heartbeat,
  submitAttempt,
  leaveAttempt,
  getAttemptHistory,
  reviewAnswers,
} from '../controllers/attemptController.js';

const router = express.Router();

// Every route in this file requires login AND the student role
router.use(protect, authorize('student'));

router.get('/ping', (req, res) => {
  res.json({ message: `Hello student ${req.user.name}` });
});

// Browsing
router.get('/categories', getCategories);
router.get('/quizzes', getAllQuizzes);
router.get('/quizzes/:id', getQuizDetails);

// Attempting
router.post('/quizzes/:id/start', startAttempt);
router.patch('/attempts/:attemptId/answers', saveAnswer);
router.post('/attempts/:attemptId/heartbeat', heartbeat);
router.post('/attempts/:attemptId/submit', submitAttempt);
router.post('/attempts/:attemptId/leave', leaveAttempt);
router.get('/quizzes/:id/attempts', getAttemptHistory);
router.get('/quizzes/:id/review', reviewAnswers);

export default router;