import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import { imageUrl } from '../../utils/imageUrl.js';
import { useTheme } from '../../utils/useTheme.js';
import { formatDuration } from '../../utils/formatTime.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AttemptScreen = ({ quizId, data }) => {
  useTheme('student');
  const navigate = useNavigate();

  const { attempt, quiz } = data;
  const attemptId = attempt._id;
  const questions = quiz.questions;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionIndex: [selected option numbers] }
  const [remaining, setRemaining] = useState(attempt.remainingSeconds);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Refs hold values that timers and page-close handlers must always see fresh
  const answersRef = useRef({});
  const endedRef = useRef(false); // true once the attempt is over from our side
  const offsetRef = useRef(0); // ⭐ FIX: no Date.now() during render
  const expiresRef = useRef(new Date(attempt.expiresAt).getTime());

  const goToDetails = useCallback(
    () => navigate(`/student/quizzes/${quizId}`, { replace: true }),
    [navigate, quizId]
  );

  // ⭐ FIX: work out the difference between the server clock and this computer's clock.
  // This effect is declared first, so it runs before the countdown starts.
  useEffect(() => {
    offsetRef.current = new Date(attempt.serverTime).getTime() - Date.now();
  }, [attempt.serverTime]);

  // ---------- submit (manual or when the timer hits 0) ----------
  const finish = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setSubmitting(true);

    try {
      const payload = Object.entries(answersRef.current).map(([qi, selected]) => ({
        questionIndex: Number(qi),
        selected,
      }));
      const { data: res } = await api.post(`/student/attempts/${attemptId}/submit`, {
        answers: payload,
      });
      navigate(`/student/quizzes/${quizId}/result`, {
        state: { result: res.result },
        replace: true,
      });
    } catch (err) {
      if (err.response) {
        // The server already ended it (for example the time ran out)
        goToDetails();
      } else {
        // No connection: allow another try in a few seconds
        setMessage('Cannot reach the server. Retrying...');
        setSubmitting(false);
        setTimeout(() => {
          endedRef.current = false;
        }, 3000);
      }
    }
  }, [attemptId, navigate, quizId, goToDetails]);

  // ---------- countdown ----------
  useEffect(() => {
    // ⭐ FIX: no immediate tick(). `remaining` already starts at the server value,
    // and the interval below takes over within 250 ms.
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((expiresRef.current - (Date.now() + offsetRef.current)) / 1000)
      );
      setRemaining(left);
      if (left <= 0) finish();
    }, 250);
    return () => clearInterval(id);
  }, [finish]);

  // ---------- heartbeat: tells the server "I am still here" ----------
  useEffect(() => {
    const beat = async () => {
      if (endedRef.current) return;
      try {
        const { data: hb } = await api.post(`/student/attempts/${attemptId}/heartbeat`);
        offsetRef.current = new Date(hb.serverTime).getTime() - Date.now();
      } catch (err) {
        if (err.response?.status === 409) {
          // The attempt already ended (refresh, timeout, ...)
          endedRef.current = true;
          goToDetails();
        }
      }
    };
    beat();
    const id = setInterval(beat, 10000);
    return () => clearInterval(id);
  }, [attemptId, goToDetails]);

  // ---------- leaving the page = submit ----------
  useEffect(() => {
    // Sends the "leave" request even while the page is closing
    const leaveNow = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      fetch(`${API}/student/attempts/${attemptId}/leave`, {
        method: 'POST',
        keepalive: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    };

    const warn = (e) => {
      if (endedRef.current) return;
      e.preventDefault();
      e.returnValue = ''; // makes the browser show its "Leave site?" popup
    };

    window.addEventListener('beforeunload', warn);
    window.addEventListener('pagehide', leaveNow); // tab closed or refreshed
    window.addEventListener('popstate', leaveNow); // browser back button

    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('pagehide', leaveNow);
      window.removeEventListener('popstate', leaveNow);
    };
  }, [attemptId]);

  // ---------- choosing answers (saved to the server on every click) ----------
  const saveAnswer = (qi, selected) => {
    answersRef.current = { ...answersRef.current, [qi]: selected };
    setAnswers(answersRef.current);

    api
      .patch(`/student/attempts/${attemptId}/answers`, { questionIndex: qi, selected })
      .catch((err) => {
        if (err.response?.status === 409) {
          endedRef.current = true;
          goToDetails();
        } else {
          setMessage(getErrorMessage(err));
        }
      });
  };

   const choose = (qi, oi) => {
    const previous = answersRef.current[qi] || [];
    const next = previous.includes(oi)
      ? previous.filter((x) => x !== oi)
      : [...previous, oi].sort((a, b) => a - b);
    saveAnswer(qi, next);
  };

  const handleSubmitClick = () => {
    const answered = Object.values(answers).filter((a) => a.length > 0).length;
    const unanswered = questions.length - answered;
    const ok = window.confirm(
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}.\n\nSubmit anyway? This uses one attempt.`
        : 'Submit your quiz? This uses one attempt.'
    );
    if (ok) finish();
  };

  const q = questions[current];
  const selected = answers[current] || [];
  const answeredCount = Object.values(answers).filter((a) => a.length > 0).length;

  return (
    <div className="attempt-page">
      <div className="attempt-top">
        <h2>
          {quiz.title}
          {quiz.hasMSQ && (
            <span
              className="chip chip-msq has-tooltip"
              tabIndex={0}
              data-tip="Some questions may contain multiple correct answers"
            >
              MSQ
            </span>
          )}
        </h2>
        <div className={`timer ${remaining <= 60 ? 'low' : ''}`}>
          <Clock size={20} /> {formatDuration(remaining)}
        </div>
      </div>

      {message && <div className="alert alert-error">{message}</div>}

      <div className="attempt-layout">
        <div className="card">
          <div className="q-counter">
            Question {current + 1} of {questions.length}
          </div>

          <p className="q-text">{q.text}</p>

          {q.image && (
            <img
              className="question-image"
              src={imageUrl(q.image)}
              alt={`Question ${current + 1}`}
            />
          )}

          <p className="q-hint">Read carefully. Choose all the options you think are correct.</p>

          {q.options.map((option, oi) => {
            const isSelected = selected.includes(oi);
            return (
              <label className={`answer-option ${isSelected ? 'selected' : ''}`} key={oi}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => choose(current, oi)}
                />
                {option}
              </label>
            );
          })}

          {selected.length > 0 && (
            <button type="button" className="link-btn" onClick={() => saveAnswer(current, [])}>
              Clear my response
            </button>
          )}

          <div className="attempt-nav">
            <button
              className="btn btn-ghost"
              onClick={() => setCurrent((c) => c - 1)}
              disabled={current === 0}
            >
              <ChevronLeft size={18} /> Previous
            </button>

            {current < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrent((c) => c + 1)}>
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSubmitClick}
                disabled={submitting}
              >
                <Send size={17} /> {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <b>Questions</b>
          <p className="hint" style={{ marginTop: 4 }}>
            {answeredCount} of {questions.length} answered
          </p>

          <div className="palette-grid">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`palette-btn ${(answers[i] || []).length > 0 ? 'answered' : ''} ${
                  i === current ? 'current' : ''
                }`}
                onClick={() => setCurrent(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={handleSubmitClick}
            disabled={submitting}
          >
            <Send size={16} /> Submit Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

// If someone opens this address directly (no quiz data), send them to the details page
const AttemptQuiz = () => {
  const { id } = useParams();
  const { state } = useLocation();

  if (!state?.attempt) return <Navigate to={`/student/quizzes/${id}`} replace />;

  return <AttemptScreen quizId={id} data={state} />;
};

export default AttemptQuiz;