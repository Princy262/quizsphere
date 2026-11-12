// Takes one entry per student and returns them sorted and ranked.
// entry = { studentId, name, bestScore, timeTaken, ... }
export const rankStudents = (entries) => {
  const sorted = [...entries].sort(
    (a, b) =>
      b.bestScore - a.bestScore || // 1. higher score first
      a.timeTaken - b.timeTaken || // 2. lower time first
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || // 3. A to Z (display only)
      String(a.studentId).localeCompare(String(b.studentId)) // 4. stable order for identical names
  );

  let rank = 0;

  return sorted.map((entry, index) => {
    const previous = sorted[index - 1];

    // A new rank starts only when score or time differs from the previous student.
    // Using index + 1 makes ranks skip after a tie: 1, 1, 3
    if (!previous || previous.bestScore !== entry.bestScore || previous.timeTaken !== entry.timeTaken) {
      rank = index + 1;
    }

    return { ...entry, rank };
  });
};