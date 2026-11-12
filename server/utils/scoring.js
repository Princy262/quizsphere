// Cleans one selection: unique, sorted, all indexes valid.
// Returns null if the selection is invalid.
export const normalizeSelection = (selected, optionCount) => {
  if (!Array.isArray(selected)) return null;

  const unique = [...new Set(selected)];
  const valid = unique.every(
    (i) => Number.isInteger(i) && i >= 0 && i < optionCount
  );

  return valid ? unique.sort((a, b) => a - b) : null;
};

// Cleans a full answers list. Invalid entries are dropped,
// and if a question appears twice the last entry wins.
export const sanitizeAnswers = (rawAnswers, questions) => {
  if (!Array.isArray(rawAnswers)) return [];

  const byQuestion = new Map();

  for (const item of rawAnswers) {
    const index = item?.questionIndex;
    if (!Number.isInteger(index) || index < 0 || index >= questions.length) continue;

    const selected = normalizeSelection(item.selected, questions[index].options.length);
    if (selected === null) continue;

    byQuestion.set(index, selected);
  }

  return [...byQuestion].map(([questionIndex, selected]) => ({
    questionIndex,
    selected,
  }));
};

// A question is correct only if the selected set EXACTLY matches the correct set
export const calculateScore = (questions, answers) => {
  const selectedByQuestion = new Map(
    answers.map((a) => [a.questionIndex, a.selected])
  );

  let score = 0;

  questions.forEach((question, index) => {
    const selected = selectedByQuestion.get(index) || [];
    const correct = question.correctAnswers;

    const isCorrect =
      selected.length === correct.length &&
      correct.every((i) => selected.includes(i));

    if (isCorrect) score += 1;
  });

  return { score, totalQuestions: questions.length };
};