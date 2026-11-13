import { useEffect, useRef, useState } from 'react';
import { Plus, X, Trash2, ImagePlus } from 'lucide-react';
import api, { getErrorMessage } from '../api/axios.js';
import { imageUrl } from '../utils/imageUrl.js';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const emptyQuestion = () => ({
  text: '',
  image: null,
  options: ['', ''],
  correctAnswers: [],
});

// Used by Create Quiz and Edit Quiz.
// onSubmit(payload) should throw if saving fails.
const QuizForm = ({ initial, onSubmit, submitLabel = 'Save Quiz' }) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [timeLimit, setTimeLimit] = useState(initial?.timeLimit ?? '');
  const [questions, setQuestions] = useState(
    initial?.questions?.length
      ? initial.questions.map((q) => ({ ...q, image: q.image || null }))
      : [emptyQuestion()]
  );

  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputs = useRef({});

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

  // ---------- images ----------
  const uploadImage = async (qi, file) => {
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Only PNG, JPG, WEBP or GIF images are allowed');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large. Maximum size is 2 MB');
      return;
    }

    setError('');
    setUploadingIndex(qi);
    try {
      const formData = new FormData();
      formData.append('image', file);
      // Do not set Content-Type by hand: the browser adds it with the boundary
      const { data } = await api.post('/examiner/images', formData);
      updateQuestion(qi, { image: data.imageId });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingIndex(null);
    }
  };

  // Ctrl+V anywhere inside a question card pastes the image into that question
  const handlePaste = (qi, e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(
      (item) => item.kind === 'file' && item.type.startsWith('image/')
    );
    if (!imageItem) return; // normal text paste, leave it alone

    e.preventDefault();
    uploadImage(qi, imageItem.getAsFile());
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

    if (uploadingIndex !== null) {
      setError('Please wait for the image to finish uploading');
      return;
    }

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
          image: q.image || null,
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
        <div
          className="card question-card"
          key={qi}
          onPaste={(e) => handlePaste(qi, e)}
        >
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

          {/* ----- question image ----- */}
          <div className="image-area">
            {q.image ? (
              <div className="image-preview">
                <img src={imageUrl(q.image)} alt={`Question ${qi + 1}`} />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => updateQuestion(qi, { image: null })}
                >
                  <Trash2 size={15} /> Remove image
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputs.current[qi]?.click()}
                disabled={uploadingIndex === qi}
              >
                <ImagePlus size={16} />
                {uploadingIndex === qi ? 'Uploading...' : 'Add image'}
              </button>
            )}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              ref={(el) => (fileInputs.current[qi] = el)}
              onChange={(e) => {
                uploadImage(qi, e.target.files[0]);
                e.target.value = ''; // lets the same file be picked again
              }}
            />

            {!q.image && (
              <p className="hint">
                Or copy an image and press Ctrl+V inside this question. PNG, JPG, WEBP or GIF, up
                to 2 MB.
              </p>
            )}
          </div>

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
        <button className="btn btn-primary" disabled={submitting || uploadingIndex !== null}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default QuizForm;