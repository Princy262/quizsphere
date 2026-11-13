import mongoose from 'mongoose';
import Attempt, { MAX_ATTEMPTS } from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import { normalizeSelection } from '../utils/scoring.js';
import { pickBest } from '../utils/attemptStats.js';
import {
  finalizeAttempt,
  getDeadline,
  isExpired,
  getRemainingSeconds,
  SUBMIT_GRACE_MS,
} from '../utils/finalizeAttempt.js';

// ---------- helpers ----------

// Finds an attempt only if it belongs to the logged-in student
const getOwnedAttempt = async (attemptId, studentId, res) => {
  const attempt = await Attempt.findOne({ _id: attemptId, student: studentId }).lean();
  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }
  return attempt;
};

// Like getOwnedAttempt, but the attempt must still be running.
// If its time has run out, it is finalized right here.
const getOpenAttempt = async (attemptId, studentId, res) => {
  const attempt = await getOwnedAttempt(attemptId, studentId, res);

  if (attempt.status !== 'in-progress') {
    res.status(409);
    throw new Error('This attempt has already ended');
  }

  if (isExpired(attempt)) {
    await finalizeAttempt(attempt._id, {
      status: 'auto-submitted',
      endedAt: getDeadline(attempt),
    });
    res.status(409);
    throw new Error('Time is up. Your attempt was submitted automatically');
  }

  return attempt;
};

// Result shown after an attempt ends. NEVER contains correct answers.
const formatResult = async (attempt) => {
  const attemptsUsed = await Attempt.countDocuments({
    quiz: attempt.quiz,
    student: attempt.student,
  });

  const answered = attempt.answers.filter((a) => a.selected.length > 0).length;

  return {
    attemptId: attempt._id,
    quizId: attempt.quiz,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    correct: attempt.score,
    incorrect: answered - attempt.score,
    unanswered: attempt.totalQuestions - answered,
    timeTaken: attempt.timeTaken, // seconds
    submittedAt: attempt.submittedAt,
    attemptsUsed,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attemptsUsed),
    // The server still re-checks this on the review endpoint
    canReviewAnswers: attemptsUsed >= MAX_ATTEMPTS,
  };
};

// ---------- start ----------

// @route   POST /api/student/quizzes/:id/start
export const startAttempt = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    const msqCount = quiz.questions.filter((q) => q.correctAnswers.length > 1).length;

    // An attempt already running for this quiz?
    const open = await Attempt.findOne({
      quiz: quiz._id,
      student: req.user.id,
      status: 'in-progress',
    }).lean();

    if (open) {
      if (!isExpired(open)) {
        res.status(409);
        throw new Error('You already have an attempt in progress for this quiz');
      }
      // Its time ran out earlier: close it so it counts as used
      await finalizeAttempt(open._id, {
        status: 'auto-submitted',
        endedAt: getDeadline(open),
      });
    }

    // Every attempt counts: submitted, timed out or left
    const used = await Attempt.countDocuments({
      quiz: quiz._id,
      student: req.user.id,
    });

    if (used >= MAX_ATTEMPTS) {
      res.status(403);
      throw new Error(`You have used all ${MAX_ATTEMPTS} attempts for this quiz`);
    }

    let attempt;
    try {
      attempt = await Attempt.create({
        quiz: quiz._id,
        student: req.user.id,
        attemptNumber: used + 1,
        timeLimit: quiz.timeLimit,
        totalQuestions: quiz.questions.length,
      });
    } catch (err) {
      // Two Start clicks at the same moment: the database index rejects the second
      if (err.code === 11000) {
        res.status(409);
        throw new Error('An attempt for this quiz was just started. Please try again');
      }
      throw err;
    }

    res.status(201).json({
      message: 'Attempt started',
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        maxAttempts: MAX_ATTEMPTS,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: new Date(getDeadline(attempt)),
        serverTime: new Date(),
        remainingSeconds: getRemainingSeconds(attempt),
      },
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        category: quiz.category,
        timeLimit: quiz.timeLimit,
        // MSQ info for the frontend
        hasMSQ: msqCount > 0,
        msqCount,
        msqNote:
          msqCount > 0
            ? 'This quiz contains MSQ (multiple correct answer) questions'
            : null,
        // Question text, image and options only. No correctAnswers.
        questions: quiz.questions.map((q, index) => ({
          questionIndex: index,
          text: q.text,
          image: q.image || null, // ⭐ NEW
          options: q.options,
          multiple: q.correctAnswers.length > 1, // checkboxes vs radio buttons
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- autosave ----------

// Atomic: replace the saved answer for a question, or add it if new
const applyAnswer = async (attemptId, questionIndex, selected) => {
  const replaceFilter = {
    _id: attemptId,
    status: 'in-progress',
    'answers.questionIndex': questionIndex,
  };
  const replaceUpdate = {
    $set: { 'answers.$.selected': selected, lastHeartbeat: new Date() },
  };

  const replaced = await Attempt.updateOne(replaceFilter, replaceUpdate);
  if (replaced.matchedCount > 0) return true;

  const pushed = await Attempt.updateOne(
    {
      _id: attemptId,
      status: 'in-progress',
      'answers.questionIndex': { $ne: questionIndex },
    },
    {
      $push: { answers: { questionIndex, selected } },
      $set: { lastHeartbeat: new Date() },
    }
  );
  if (pushed.matchedCount > 0) return true;

  // A parallel save of the same question got there first: replace again once
  const retry = await Attempt.updateOne(replaceFilter, replaceUpdate);
  return retry.matchedCount > 0;
};

// @route   PATCH /api/student/attempts/:attemptId/answers
// Body: { "questionIndex": 0, "selected": [1, 3] }
// An empty selected array clears the answer.
export const saveAnswer = async (req, res, next) => {
  try {
    const { questionIndex, selected } = req.body ?? {};

    const attempt = await getOpenAttempt(req.params.attemptId, req.user.id, res);

    const quiz = await Quiz.findById(attempt.quiz).select('questions.options').lean();
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz no longer exists');
    }

    if (
      !Number.isInteger(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= quiz.questions.length
    ) {
      res.status(400);
      throw new Error('Invalid question index');
    }

    const clean = normalizeSelection(selected, quiz.questions[questionIndex].options.length);
    if (clean === null) {
      res.status(400);
      throw new Error('Invalid selection');
    }

    const saved = await applyAnswer(attempt._id, questionIndex, clean);
    if (!saved) {
      res.status(409);
      throw new Error('This attempt has already ended');
    }

    res.json({ saved: true, remainingSeconds: getRemainingSeconds(attempt) });
  } catch (error) {
    next(error);
  }
};

// ---------- heartbeat ----------

// @route   POST /api/student/attempts/:attemptId/heartbeat
// The frontend calls this every ~10 seconds. A 409 means "attempt ended".
export const heartbeat = async (req, res, next) => {
  try {
    const attempt = await getOpenAttempt(req.params.attemptId, req.user.id, res);

    await Attempt.updateOne(
      { _id: attempt._id, status: 'in-progress' },
      { $set: { lastHeartbeat: new Date() } }
    );

    res.json({
      ok: true,
      remainingSeconds: getRemainingSeconds(attempt),
      serverTime: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

// ---------- submit ----------

// @route   POST /api/student/attempts/:attemptId/submit
// Body (optional): { "answers": [ { "questionIndex": 0, "selected": [1] }, ... ] }
// If "answers" is sent it replaces the autosaved ones. If not, autosaved ones are used.
export const submitAttempt = async (req, res, next) => {
  try {
    const attempt = await getOwnedAttempt(req.params.attemptId, req.user.id, res);

    // Already ended (e.g. the timer submit and a manual submit collided): same result again
    if (attempt.status !== 'in-progress') {
      return res.json({
        message: 'This attempt was already submitted',
        alreadySubmitted: true,
        result: await formatResult(attempt),
      });
    }

    const now = Date.now();
    const deadline = getDeadline(attempt);

    let finalized;
    if (now > deadline + SUBMIT_GRACE_MS) {
      // Too late: ignore the body, use the autosaved answers
      finalized = await finalizeAttempt(attempt._id, {
        status: 'auto-submitted',
        endedAt: deadline,
      });
    } else {
      finalized = await finalizeAttempt(attempt._id, {
        // Within the last 2 seconds this is the timer reaching 00:00
        status: now >= deadline - 2000 ? 'auto-submitted' : 'submitted',
        endedAt: now,
        answers: req.body?.answers,
      });
    }

    if (!finalized) {
      res.status(404);
      throw new Error('Quiz no longer exists');
    }

    res.json({
      message: 'Attempt submitted',
      result: await formatResult(finalized),
    });
  } catch (error) {
    next(error);
  }
};

// ---------- leave ----------

// @route   POST /api/student/attempts/:attemptId/leave
// Called by the frontend when the tab closes or refreshes.
// Ends the attempt with the answers saved so far.
export const leaveAttempt = async (req, res, next) => {
  try {
    const attempt = await getOwnedAttempt(req.params.attemptId, req.user.id, res);

    if (attempt.status !== 'in-progress') {
      return res.json({ alreadyEnded: true, result: await formatResult(attempt) });
    }

    const finalized = await finalizeAttempt(attempt._id, {
      status: 'left-window',
      endedAt: Date.now(),
    });

    if (!finalized) {
      res.status(404);
      throw new Error('Quiz no longer exists');
    }

    res.json({
      message: 'Attempt ended because the quiz window was left',
      result: await formatResult(finalized),
    });
  } catch (error) {
    next(error);
  }
};

// ---------- history and review ----------

// Closes this student's running attempt on a quiz if its time already ran out,
// so it is counted before we show history or decide about the review
const closeExpiredOpenAttempt = async (quizId, studentId) => {
  const open = await Attempt.findOne({
    quiz: quizId,
    student: studentId,
    status: 'in-progress',
  }).lean();

  if (open && isExpired(open)) {
    await finalizeAttempt(open._id, {
      status: 'auto-submitted',
      endedAt: getDeadline(open),
    });
  }
};

const assertValidId = (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid ID format');
  }
};

// @route   GET /api/student/quizzes/:id/attempts
// The student's OWN attempts only. Correct answers are never included.
export const getAttemptHistory = async (req, res, next) => {
  try {
    assertValidId(req.params.id, res);

    const quiz = await Quiz.findById(req.params.id)
      .select('title category timeLimit questions.text')
      .lean();
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    await closeExpiredOpenAttempt(quiz._id, req.user.id);

    const all = await Attempt.find({ quiz: quiz._id, student: req.user.id })
      .sort({ attemptNumber: 1 })
      .lean();

    const finished = all.filter((a) => a.status !== 'in-progress');
    const best = pickBest(all);
    const maxScore = quiz.questions.length;

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        category: quiz.category,
        timeLimit: quiz.timeLimit,
        maxScore,
      },
      attemptsUsed: all.length,
      maxAttempts: MAX_ATTEMPTS,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - all.length),
      hasAttemptInProgress: all.some((a) => a.status === 'in-progress'),
      attempts: finished.map((a) => ({
        attemptId: a._id,
        attemptNumber: a.attemptNumber,
        score: a.score,
        totalQuestions: a.totalQuestions,
        timeTaken: a.timeTaken,
        status: a.status,
        submittedAt: a.submittedAt,
      })),
      best: best
        ? {
            attemptNumber: best.attemptNumber,
            score: best.score,
            timeTaken: best.timeTaken,
          }
        : null,
      // Always 3 entries (Attempt 1, 2, 3), ready for the graph
      chartData: Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const a = finished.find((x) => x.attemptNumber === i + 1);
        return {
          attemptNumber: i + 1,
          label: `Attempt ${i + 1}`,
          score: a ? a.score : null,
        };
      }),
      canReviewAnswers: finished.length >= MAX_ATTEMPTS,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/student/quizzes/:id/review
// Correct answers are released ONLY when all 3 attempts on THIS quiz are finalized.
export const reviewAnswers = async (req, res, next) => {
  try {
    assertValidId(req.params.id, res);

    await closeExpiredOpenAttempt(req.params.id, req.user.id);

    const attempts = await Attempt.find({
      quiz: req.params.id,
      student: req.user.id,
      status: { $ne: 'in-progress' },
    })
      .sort({ attemptNumber: 1 })
      .lean();

    // The server decides. Hiding a button in React is not security.
    if (attempts.length < MAX_ATTEMPTS) {
      res.status(403);
      throw new Error(
        `Correct answers unlock after you finish all ${MAX_ATTEMPTS} attempts ` +
          `(${attempts.length}/${MAX_ATTEMPTS} done)`
      );
    }

    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    const best = pickBest(attempts);

    const questions = quiz.questions.map((q, index) => ({
      questionIndex: index,
      text: q.text,
      image: q.image || null, 
      options: q.options,
      correctAnswers: q.correctAnswers,
      multiple: q.correctAnswers.length > 1,
      yourAnswers: attempts.map((attempt) => {
        const given = attempt.answers.find((a) => a.questionIndex === index);
        const selected = given ? given.selected : [];
        const isCorrect =
          selected.length === q.correctAnswers.length &&
          q.correctAnswers.every((i) => selected.includes(i));

        return { attemptNumber: attempt.attemptNumber, selected, isCorrect };
      }),
    }));

    res.json({
      quiz: { _id: quiz._id, title: quiz.title, category: quiz.category },
      bestScore: best.score,
      totalQuestions: quiz.questions.length,
      attempts: attempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        score: a.score,
        timeTaken: a.timeTaken,
      })),
      questions,
    });
  } catch (error) {
    next(error);
  }
};