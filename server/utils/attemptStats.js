import Attempt from '../models/Attempt.js';

// Best attempt = highest score, and for equal scores the lowest time.
// Attempts still in progress are ignored.
export const pickBest = (attempts) => {
  const done = attempts.filter((a) => a.status !== 'in-progress');
  if (done.length === 0) return null;

  return done.reduce((best, a) =>
    a.score > best.score || (a.score === best.score && a.timeTaken < best.timeTaken)
      ? a
      : best
  );
};

// attemptsUsed + best score for one student across many quizzes (one DB query)
export const getStudentStats = async (studentId, quizIds) => {
  const attempts = await Attempt.find({ student: studentId, quiz: { $in: quizIds } })
    .select('quiz score timeTaken status')
    .lean();

  const grouped = new Map();
  for (const a of attempts) {
    const key = String(a.quiz);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(a);
  }

  const stats = new Map();
  for (const [quizId, list] of grouped) {
    const best = pickBest(list);
    stats.set(quizId, {
      attemptsUsed: list.length, // in-progress ones count too
      bestScore: best ? best.score : null,
      bestTime: best ? best.timeTaken : null,
    });
  }
  return stats;
};