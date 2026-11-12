import Attempt from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import { sanitizeAnswers, calculateScore } from './scoring.js';

// A submit that arrives this long after the deadline is still accepted
export const SUBMIT_GRACE_MS = 5000;

export const getDeadline = (attempt) =>
  new Date(attempt.startedAt).getTime() + attempt.timeLimit * 60 * 1000;

export const isExpired = (attempt) => Date.now() >= getDeadline(attempt);

export const getRemainingSeconds = (attempt) =>
  Math.max(0, Math.ceil((getDeadline(attempt) - Date.now()) / 1000));

/**
 * The ONLY place where an attempt is ended.
 *
 * options.status   'submitted' | 'auto-submitted' | 'left-window'
 * options.endedAt  milliseconds timestamp (default: now), capped at the deadline
 * options.answers  optional full answers array that replaces the saved ones
 *
 * Safe to call many times at once: only the first caller finalizes,
 * everyone else just gets the already-finalized attempt back.
 */
export const finalizeAttempt = async (
  attemptId,
  { status, endedAt = Date.now(), answers } = {}
) => {
  const attempt = await Attempt.findById(attemptId).lean();
  if (!attempt) return null;
  if (attempt.status !== 'in-progress') return attempt; // already finalized

  const quiz = await Quiz.findById(attempt.quiz)
    .select('questions.options questions.correctAnswers')
    .lean();
  if (!quiz) return null;

  // Time taken can never exceed the time limit
  const startedMs = new Date(attempt.startedAt).getTime();
  const endMs = Math.max(startedMs, Math.min(Number(endedAt), getDeadline(attempt)));
  const timeTaken = Math.round((endMs - startedMs) / 1000);

  const update = { status, submittedAt: new Date(endMs), timeTaken };
  if (Array.isArray(answers)) {
    update.answers = sanitizeAnswers(answers, quiz.questions);
  }

  // Atomic claim: only one caller can move it out of 'in-progress'
  const claimed = await Attempt.findOneAndUpdate(
    { _id: attemptId, status: 'in-progress' },
    { $set: update },
    { new: true }
  ).lean();

  // Someone else finalized it a moment ago
  if (!claimed) return Attempt.findById(attemptId).lean();

  const { score, totalQuestions } = calculateScore(quiz.questions, claimed.answers);

  return Attempt.findByIdAndUpdate(
    attemptId,
    { $set: { score, totalQuestions } },
    { new: true }
  ).lean();
};