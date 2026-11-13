import { useEffect, useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../api/axios.js';

const emptyQuestion = () => ({ text: '', options: ['', ''], correctAnswers: [] });

// Used by Create Quiz now, and by Edit Quiz later.
// onSubmit(payload) should throw if saving fails.
const QuizForm = ({ initial, onSubmit, submitLabel = 'Save Quiz' }) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [timeLimit, setTimeLimit] = useState(initial?.timeLimit ?? '');
  const [questions, setQuestions] = useState(
    initial?.questions?.length ? initial.questions : [emptyQuestion()]
  );

  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Existing categories, offered as suggestions (a new one can still be typed)
  useEffect(() => {
    api
      .get('/examiner/categories')
      .then(({ data }) => setSuggestions(data.categories))
      .catch(() => {});
  }, []);

  // ---------- question helpers ----------
  const updateQuestion = (qi, patch) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);

  const removeQuestion = (qi) =>
    setQuestions((qs) => (qs.length > 1 ? qs.filter((_, i) => i !== qi) : qs));

  const setOption = (qi, oi, value) => {
    const options = questions[qi].options.map((o, i) => (i === oi ? value : o));
    updateQuestion(qi, { options });
  };

  const addOption = (qi) => {
    if (questions[qi].options.length >= 6) return;
    updateQuestion(qi, { options: [...questions[qi].options, ''] });
  };

  const removeOption = (qi, oi) => {
    const q = questions[qi];
    if (q.options.length <= 2) return;

    // Keep the correct answers pointing at the right options
    const correctAnswers = q.correctAnswers
      .filter((c) => c !== oi)
      .map((c) => (c > oi ? c - 1 : c));

    updateQuestion(qi, {
      options: q.options.filter((_, i) => i !== oi),
      correctAnswers,
    });
  };

  const toggleCorrect = (qi, oi) => {
    const current = questions[qi].correctAnswers;
    const next = current.includes(oi)
      ? current.filter((c) => c !== oi)
      : [...current, oi].sort((a, b) => a - b);
    updateQuestion(qi, { correctAnswers: next });
  };

  // ---------- validation + submit ----------
  const validate = () => {
    if (!title.trim()) return 'Quiz title is required';
    if (!category.trim()) return 'Category is required';

    const minutes = Number(timeLimit);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 300) {
      return 'Time limit must be a whole number between 1 and 300 minutes';
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const n = i + 1;
      if (!q.text.trim()) return `Question ${n}: write the question text`;
      if (q.options.some((o) => !o.trim())) return `Question ${n}: fill in every option`;
      if (q.correctAnswers.length === 0) {
        return `Question ${n}: tick at least one correct option`;
      }
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        timeLimit: Number(timeLimit),
        questions: questions.map((q) => ({
          text: q.text.trim(),
          options: q.options.map((o) => o.trim()),
          correctAnswers: q.correctAnswers,
        })),
      });
    } catch (err) {
      setError(getErrorMessage(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h2>Quiz details</h2>

        <div className="form-grid">
          <div className="full">
            <label className="field-label">Quiz title *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DBMS Fundamentals"
              maxLength={100}
            />
          </div>

          <div>
            <label className="field-label">Category *</label>
            <input
              className="input"
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Pick one or type a new category"
            />
            <datalist id="category-suggestions">
              {suggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="hint">A new category automatically appears in every filter.</p>
          </div>

          <div>
            <label className="field-label">Time limit (minutes) *</label>
            <input
              className="input"
              type="number"
              min="1"
              max="300"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="e.g. 15"
            />
            <p className="hint">Every student attempt gets this full time.</p>
          </div>

          <div className="full">
            <label className="field-label">Description (optional)</label>
            <textarea
              className="input textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this quiz about?"
              maxLength={500}
            />
          </div>
        </div>
      </div>

      {questions.map((q, qi) => (
        <div className="card question-card" key={qi}>
          <div className="question-head">
            <h3>
              Question {qi + 1}
              {q.correctAnswers.length > 1 && <span className="chip chip-msq">MSQ</span>}
            </h3>
            <button
              type="button"
              className="icon-btn"
              onClick={() => removeQuestion(qi)}
              disabled={questions.length === 1}
              aria-label={`Delete question ${qi + 1}`}
            >
              <Trash2 size={17} />
            </button>
          </div>

          <textarea
            className="input textarea"
            value={q.text}
            onChange={(e) => updateQuestion(qi, { text: e.target.value })}
            placeholder="Type the question"
          />

          <p className="hint">
            Tick every correct option. Tick more than one to make it an MSQ.
          </p>

          {q.options.map((option, oi) => {
            const isCorrect = q.correctAnswers.includes(oi);
            return (
              <div className="option-row" key={oi}>
                <label className={`correct-toggle ${isCorrect ? 'on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isCorrect}
                    onChange={() => toggleCorrect(qi, oi)}
                  />
                  Correct
                </label>
                <input
                  className="input"
                  value={option}
                  onChange={(e) => setOption(qi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}`}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeOption(qi, oi)}
                  disabled={q.options.length <= 2}
                  aria-label={`Remove option ${oi + 1}`}
                >
                  <X size={17} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => addOption(qi)}
            disabled={q.options.length >= 6}
          >
            <Plus size={15} /> Add option
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginTop: 18 }}
        onClick={addQuestion}
      >
        <Plus size={18} /> Add question
      </button>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default QuizForm;