import mongoose from 'mongoose';

export const MAX_ATTEMPTS = 3;

const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true, min: 0 },
    selected: { type: [Number], default: [] },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_ATTEMPTS,
    },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },

    // Copy of the quiz time limit (minutes) taken when the attempt starts
    timeLimit: { type: Number, required: true },

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    lastHeartbeat: { type: Date, default: Date.now },
    timeTaken: { type: Number, default: null }, // seconds

    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'auto-submitted', 'left-window'],
      default: 'in-progress',
    },
  },
  { timestamps: true }
);

// A student can never have two attempts with the same number on one quiz
attemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 }, { unique: true });

// A student can have only ONE in-progress attempt per quiz
attemptSchema.index(
  { quiz: 1, student: 1 },
  { unique: true, partialFilterExpression: { status: 'in-progress' } }
);

// Used by the sweeper in Part B
attemptSchema.index({ status: 1, lastHeartbeat: 1 });

const Attempt = mongoose.model('Attempt', attemptSchema);

export default Attempt;