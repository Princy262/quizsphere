import assert from 'node:assert';
import { rankStudents } from '../utils/ranking.js';

const show = (list) => list.map((s) => `${s.rank}:${s.name}`).join(', ');

// Test 1: score first, then time (your section 30 and 39 examples)
const t1 = rankStudents([
  { studentId: 'a', name: 'Student A', bestScore: 9, timeTaken: 1200 },
  { studentId: 'b', name: 'Student B', bestScore: 9, timeTaken: 900 },
  { studentId: 'c', name: 'Student C', bestScore: 10, timeTaken: 1500 },
  { studentId: 'd', name: 'Student D', bestScore: 8, timeTaken: 600 },
]);
assert.strictEqual(show(t1), '1:Student C, 2:Student B, 3:Student A, 4:Student D');

// Test 2: exact tie shares a rank, next rank skips, names alphabetical
const t2 = rankStudents([
  { studentId: '3', name: 'Riya', bestScore: 8, timeTaken: 600 },
  { studentId: '2', name: 'Ananya', bestScore: 9, timeTaken: 900 },
  { studentId: '1', name: 'Aarav', bestScore: 9, timeTaken: 900 },
]);
assert.strictEqual(show(t2), '1:Aarav, 1:Ananya, 3:Riya');

// Test 3: same score but different time is NOT a tie
const t3 = rankStudents([
  { studentId: '1', name: 'Aarav', bestScore: 9, timeTaken: 901 },
  { studentId: '2', name: 'Ananya', bestScore: 9, timeTaken: 900 },
]);
assert.strictEqual(show(t3), '1:Ananya, 2:Aarav');

// Test 4: three-way tie, then the next rank is 4
const t4 = rankStudents([
  { studentId: '1', name: 'C', bestScore: 7, timeTaken: 100 },
  { studentId: '2', name: 'B', bestScore: 7, timeTaken: 100 },
  { studentId: '3', name: 'A', bestScore: 7, timeTaken: 100 },
  { studentId: '4', name: 'D', bestScore: 6, timeTaken: 50 },
]);
assert.strictEqual(show(t4), '1:A, 1:B, 1:C, 4:D');

// Test 5: empty list
assert.deepStrictEqual(rankStudents([]), []);

console.log('All ranking tests passed');