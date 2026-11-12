import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';
import { rankStudents } from '../utils/ranking.js';

// @route   GET /api/examiner/quizzes/:id/leaderboard
// Only for quizzes created by the logged-in examiner
export const getLeaderboard = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid ID format');
    }

    // Ownership check: another examiner's quiz looks like it doesn't exist
    const quiz = await Quiz.findOne({ _id: id, createdBy: req.user.id })
      .select('title category timeLimit questions.text')
      .lean();

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    // One row per student: their best finished attempt
    const rows = await Attempt.aggregate([
      {
        $match: {
          quiz: new mongoose.Types.ObjectId(id), // aggregate() does not auto-convert ids
          status: { $ne: 'in-progress' },
        },
      },
      // Best first: highest score, then lowest time
      { $sort: { score: -1, timeTaken: 1 } },
      {
        $group: {
          _id: '$student',
          bestScore: { $first: '$score' },
          timeTaken: { $first: '$timeTaken' },
          bestAttemptNumber: { $first: '$attemptNumber' },
          attemptsUsed: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentDoc',
        },
      },
      { $unwind: { path: '$studentDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          name: { $ifNull: ['$studentDoc.name', 'Deleted user'] },
          email: { $ifNull: ['$studentDoc.email', ''] },
          bestScore: 1,
          timeTaken: 1,
          bestAttemptNumber: 1,
          attemptsUsed: 1,
        },
      },
    ]);

    const totalQuestions = quiz.questions.length;

    const leaderboard = rankStudents(rows).map((row) => ({
      ...row,
      totalQuestions,
    }));

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        category: quiz.category,
        timeLimit: quiz.timeLimit,
        totalQuestions,
      },
      totalStudents: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    next(error);
  }
};