// Y-axis tick values for a quiz with `maxScore` questions
// up to 10 questions -> 1, 2, 3 ... ; more than 10 -> 2, 4, 6 ...
export const getYTicks = (maxScore) => {
  const step = maxScore <= 10 ? 1 : 2;
  const top = Math.ceil(maxScore / step) * step;

  const ticks = [];
  for (let v = step; v <= top; v += step) ticks.push(v);
  return ticks;
};