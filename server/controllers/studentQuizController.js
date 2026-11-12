import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import { MAX_ATTEMPTS } from '../models/Attempt.js';
import { getStudentStats } from '../utils/attemptStats.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds a safe summary of each quiz. Questions and answers never leave MongoDB.
const summaryPipeline = (match) => [
  { $match: match },
  {
    $lookup: {
      from: 'users',
      localField: 'createdBy',
      foreignField: '_id',
      as: 'examinerDoc',
    },
  },
  {
    $project: {
      title: 1,
      description: 1,
      category: 1,
      timeLimit: 1,
      createdAt: 1,
      examiner: { $ifNull: [{ $arrayElemAt: ['$examinerDoc.name', 0] }, 'Unknown'] },
      questionCount: { $size: '$questions' },
      // Questions with more than one correct answer = MSQ
      msqCount: {
        $size: {
          $filter: {
            input: '$questions',
            as: 'q',
            cond: { $gt: [{ $size: '$$q.correctAnswers' }, 1] },
          },
        },
      },
    },
  },
  { $sort: { createdAt: -1 } },
];

const formatSummary = (q, stats) => {
  const attemptsUsed = stats?.attemptsUsed ?? 0;
  return {
    _id: q._id,
    title: q.title,
    description: q.description,
    category: q.category,
    timeLimit: q.timeLimit,
    questionCount: q.questionCount,
    examiner: q.examiner,
    createdAt: q.createdAt,
    hasMSQ: q.msqCount > 0,
    msqCount: q.msqCount,
    msqNote:
      q.msqCount > 0
        ? 'This quiz contains MSQ (multiple correct answer) questions'
        : null,
    attemptsUsed,
    maxAttempts: MAX_ATTEMPTS,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attemptsUsed),
    bestScore: stats?.bestScore ?? null,
    bestTime: stats?.bestTime ?? null, // seconds
  };
};

// @route   GET /api/student/categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Quiz.distinct('category');
    categories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    res.json({ count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/student/quizzes?category=Computer Science
export const getAllQuizzes = async (req, res, next) => {
  try {
    const match = {};
    const { category } = req.query;

    if (
      typeof category === 'string' &&
      category.trim() !== '' &&
      category.trim().toLowerCase() !== 'all categories'
    ) {
      match.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
    }

    const quizzes = await Quiz.aggregate(summaryPipeline(match));
    const stats = await getStudentStats(req.user.id, quizzes.map((q) => q._id));

    const list = quizzes.map((q) => formatSummary(q, stats.get(String(q._id))));

    res.json({ count: list.length, quizzes: list });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/student/quizzes/:id
export const getQuizDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid ID format');
    }

    // aggregate() does not auto-convert ids, so we convert it ourselves
    const [quiz] = await Quiz.aggregate(
      summaryPipeline({ _id: new mongoose.Types.ObjectId(id) })
    );

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    const stats = await getStudentStats(req.user.id, [quiz._id]);

    res.json({ quiz: formatSummary(quiz, stats.get(String(quiz._id))) });
  } catch (error) {
    next(error);
  }
};