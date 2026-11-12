import Attempt from '../models/Attempt.js';
import { finalizeAttempt, getDeadline } from './finalizeAttempt.js';

const SWEEP_INTERVAL_MS = 10 * 1000;
let running = false; // prevents two sweeps overlapping

const sweepOnce = async () => {
  const timeoutMs = (Number(process.env.HEARTBEAT_TIMEOUT_SECONDS) || 30) * 1000;
  const now = Date.now();

  const open = await Attempt.find({ status: 'in-progress' })
    .select('startedAt timeLimit lastHeartbeat')
    .lean();

  for (const attempt of open) {
    const deadline = getDeadline(attempt);
    const lastBeat = new Date(attempt.lastHeartbeat).getTime();
    const goneAt = lastBeat + timeoutMs;

    if (goneAt < deadline && now > goneAt) {
      // Student disappeared before the timer ended
      await finalizeAttempt(attempt._id, { status: 'left-window', endedAt: lastBeat });
    } else if (now >= deadline) {
      // Timer ran out
      await finalizeAttempt(attempt._id, { status: 'auto-submitted', endedAt: deadline });
    }
  }
};

export const startAttemptSweeper = () => {
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await sweepOnce();
    } catch (error) {
      console.error('Attempt sweeper error:', error.message);
    } finally {
      running = false;
    }
  }, SWEEP_INTERVAL_MS);

  console.log('Attempt sweeper started');
};