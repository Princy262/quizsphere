import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';
import Image from '../models/Image.js';

// Fields an examiner is allowed to set. createdBy is NOT in this list.
const EDITABLE_FIELDS = ['title', 'description', 'category', 'timeLimit', 'questions'];

// Finds a quiz only if it belongs to the logged-in examiner
const findOwnedQuiz = async (quizId, examinerId, res) => {
  const quiz = await Quiz.findOne({ _id: quizId, createdBy: examinerId });
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  return quiz;
};

// Used to detect whether the questions were really changed
const fingerprint = (questions) =>
  JSON.stringify(
    (questions || []).map((q) => ({
      text: String(q?.text ?? '').trim(),
      image: String(q?.image ?? ''),
      options: (q?.options || []).map((o) => String(o).trim()),
      correctAnswers: [...(q?.correctAnswers || [])].sort((a, b) => a - b),
    }))
  );

// @route   POST /api/examiner/quizzes
export const createQuiz = async (req, res, next) => {
  try {
    const data = {};
    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    });

    const quiz = await Quiz.create({ ...data, createdBy: req.user.id });

    res.status(201).json({ message: 'Quiz created', quiz });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/examiner/quizzes
export const getMyQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const list = quizzes.map(({ questions, ...rest }) => {
      const msqCount = questions.filter((q) => q.correctAnswers.length > 1).length;
      return {
        ...rest,
        questionCount: questions.length,
        hasMSQ: msqCount > 0,
        msqCount,
      };
    });

    res.json({ count: list.length, quizzes: list });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/examiner/quizzes/:id
export const getMyQuizById = async (req, res, next) => {
  try {
    const quiz = await findOwnedQuiz(req.params.id, req.user.id, res);
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/examiner/quizzes/:id
// Owner only. Questions are locked once any student has attempted the quiz.
export const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await findOwnedQuiz(req.params.id, req.user.id, res);

    if (
      req.body.questions !== undefined &&
      fingerprint(req.body.questions) !== fingerprint(quiz.questions)
    ) {
      const hasAttempts = await Attempt.exists({ quiz: quiz._id });
      if (hasAttempts) {
        res.status(409);
        throw new Error(
          'Questions cannot be changed because students have already attempted this quiz'
        );
      }
    }

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) quiz[field] = req.body[field];
    });

    await quiz.save();
    res.json({ message: 'Quiz updated', quiz });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/examiner/quizzes/:id
// Also deletes every attempt and every image of this quiz
export const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await findOwnedQuiz(req.params.id, req.user.id, res);

    const imageIds = quiz.questions.map((q) => q.image).filter(Boolean);

    await Attempt.deleteMany({ quiz: quiz._id });
    if (imageIds.length > 0) {
      await Image.deleteMany({ _id: { $in: imageIds } });
    }
    await quiz.deleteOne();

    res.json({ message: 'Quiz, its attempts and images deleted' });
  } catch (error) {
    next(error);
  }
};
// @route   GET /api/examiner/categories
// Every category used by ANY examiner's quiz (not just this examiner's)
export const getAllCategories = async (req, res, next) => {
  try {
    const all = await Quiz.distinct('category');

    // "Electrical" and "electrical" count as one category
    const unique = new Map();
    for (const category of all) {
      const key = category.toLowerCase();
      if (!unique.has(key)) unique.set(key, category);
    }

    const categories = [...unique.values()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    res.json({ count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};