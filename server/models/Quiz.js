import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  options: {
    type: [{ type: String, trim: true }],
    validate: [
      {
        validator: (arr) => arr.length >= 2 && arr.length <= 6,
        message: 'Each question needs between 2 and 6 options',
      },
      {
        validator: (arr) => arr.every((o) => o && o.length > 0),
        message: 'Options cannot be empty',
      },
    ],
  },
  // Indexes of the correct options, e.g. [0, 2] means option 1 and option 3
  correctAnswers: {
    type: [Number],
    validate: [
      {
        validator: (arr) => arr.length >= 1,
        message: 'Each question needs at least one correct answer',
      },
      {
        validator: (arr) => new Set(arr).size === arr.length,
        message: 'Correct answers cannot contain duplicates',
      },
      {
        // "this" is the question being validated
        validator: function (arr) {
          return arr.every(
            (i) => Number.isInteger(i) && i >= 0 && i < this.options.length
          );
        },
        message: 'A correct answer index does not match any option',
      },
    ],
  },
});

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      // "Computer   Science " becomes "Computer Science"
      set: (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v),
      index: true,
    },
    // Time limit in MINUTES
    timeLimit: {
      type: Number,
      required: [true, 'Time limit is required'],
      min: [1, 'Time limit must be at least 1 minute'],
      max: [300, 'Time limit cannot exceed 300 minutes'],
      validate: {
        validator: Number.isInteger,
        message: 'Time limit must be a whole number of minutes',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'A quiz needs at least one question',
      },
    },
  },
  { timestamps: true }
);

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;