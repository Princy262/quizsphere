import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  createQuiz,
  getMyQuizzes,
  getMyQuizById,
  updateQuiz,
  deleteQuiz,
  getAllCategories,
} from '../controllers/quizController.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';
import { uploadImage } from '../controllers/imageController.js';


const router = express.Router();

// Every route in this file requires login AND the examiner role
router.use(protect, authorize('examiner'));

router.get('/ping', (req, res) => {
  res.json({ message: `Hello examiner ${req.user.name}` });
});
router.get('/categories', getAllCategories);
router.post('/images', uploadSingleImage, uploadImage);

router.route('/quizzes').post(createQuiz).get(getMyQuizzes);

router
  .route('/quizzes/:id')
  .get(getMyQuizById)
  .put(updateQuiz)
  .delete(deleteQuiz);
  
router.get('/quizzes/:id/leaderboard', getLeaderboard);

export default router;