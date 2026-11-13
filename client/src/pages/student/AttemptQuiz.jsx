import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Send, Flag } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import { imageUrl } from '../../utils/imageUrl.js';
import { useTheme } from '../../utils/useTheme.js';
import { formatDuration } from '../../utils/formatTime.js';
import PaletteLegend from '../../components/PaletteLegend.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

//  SERVER_TIMEOUT_SECONDS must match HEARTBEAT_TIMEOUT_SECONDS in server/.env
const SERVER_TIMEOUT_SECONDS = 90;
const IDLE_NOTICE_SECONDS = 60; // "Still there?" after this much inactivity
const CONNECTION_WARN_SECONDS = 10; // connection warning after this much silence
const URGENT_SECONDS = 10; // big red timer in the last 10 seconds
const TIMEUP_SHOW_MS = 2000; // how long "Time's up!" shows before submitting

const AttemptScreen = ({ quizId, data }) => {
  useTheme('student');
  const navigate = useNavigate();

  const { attempt, quiz } = data;
  const attemptId = attempt._id;
  const questions = quiz.questions;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionIndex: [selected option numbers] }
  const [marked, setMarked] = useState({}); // { questionIndex: true } (only for the student)
  const [remaining, setRemaining] = useState(attempt.remainingSeconds);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0); // 
  const [offlineSeconds, setOfflineSeconds] = useState(0); // 
  const [timeUp, setTimeUp] = useState(false); // 

  // Refs hold values that timers and page-close handlers must always see fresh
  const answersRef = useRef({});
  const endedRef = useRef(false); // true once the attempt is over from our side
  const offsetRef = useRef(0);
  const expiresRef = useRef(new Date(attempt.expiresAt).getTime());
  const lastActivityRef = useRef(0); //  last click, key press or mouse move
  const lastBeatRef = useRef(0); //  last time the server answered a heartbeat
  const timeUpStartedRef = useRef(false); // 
  const timeUpTimeoutRef = useRef(null); // 

  const goToDetails = useCallback(
    () => navigate(`/student/quizzes/${quizId}`, { replace: true }),
    [navigate, quizId]
  );

  // Server-vs-computer clock difference, and the start of the idle/connection checks
  useEffect(() => {
    offsetRef.current = new Date(attempt.serverTime).getTime() - Date.now();
    lastActivityRef.current = Date.now();
    lastBeatRef.current = Date.now();
  }, [attempt.serverTime]);

  //  remember when the student last did anything
  useEffect(() => {
    const touch = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, touch));
  }, []);

  //  cancel the pending auto-submit if the page is left
  useEffect(() => {
    return () => clearTimeout(timeUpTimeoutRef.current);
  }, []);

  // ---------- submit (manual or when time is up) ----------
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
        goToDetails(); // the server already ended it
      } else {
        setMessage('Cannot reach the server. Retrying...');
        setSubmitting(false);
        setTimeout(() => {
          endedRef.current = false;
        }, 3000);
      }
    }
  }, [attemptId, navigate, quizId, goToDetails]);

  // ---------- countdown (also drives the banners and the Time's up screen) ----------
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();

      const left = Math.max(0, Math.ceil((expiresRef.current - (now + offsetRef.current)) / 1000));
      setRemaining(left);

      // 
      setIdleSeconds(Math.floor((now - lastActivityRef.current) / 1000));
      setOfflineSeconds(Math.floor((now - lastBeatRef.current) / 1000));

      //  show "Time's up!" first, then submit 2 seconds later
      if (left <= 0 && !timeUpStartedRef.current && !endedRef.current) {
        timeUpStartedRef.current = true;
        setTimeUp(true);
        timeUpTimeoutRef.current = setTimeout(finish, TIMEUP_SHOW_MS);
      }
    }, 250);
    return () => clearInterval(id);
  }, [finish]);

  // ---------- heartbeat: tells the server "I am still here" (every 5 seconds) ----------
  useEffect(() => {
    const beat = async () => {
      if (endedRef.current) return;
      try {
        const { data: hb } = await api.post(`/student/attempts/${attemptId}/heartbeat`);
        offsetRef.current = new Date(hb.serverTime).getTime() - Date.now();
        lastBeatRef.current = Date.now(); //  the server answered, so we are connected
      } catch (err) {
        if (err.response?.status === 409) {
          endedRef.current = true;
          goToDetails();
        }
        // No response at all = connection problem. lastBeatRef is not updated,
        // so the warning banner appears after a few seconds.
      }
    };
    beat();
    const id = setInterval(beat, 5000);
    return () => clearInterval(id);
  }, [attemptId, goToDetails]);

  // ---------- leaving the page = submit ----------
  useEffect(() => {
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
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    window.addEventListener('pagehide', leaveNow);
    window.addEventListener('popstate', leaveNow);

    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('pagehide', leaveNow);
      window.removeEventListener('popstate', leaveNow);
    };
  }, [attemptId]);

  // ---------- answers (saved to the server on every click) ----------
  const saveAnswer = (qi, selected) => {
    if (timeUpStartedRef.current) return; // no changes once time is up

    answersRef.current = { ...answersRef.current, [qi]: selected };
    setAnswers(answersRef.current);

    //  answering a question removes its "marked for review"
    if (selected.length > 0) {
      setMarked((m) => ({ ...m, [qi]: false }));
    }

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

  // only unanswered questions can be marked for review
  const toggleMark = (qi) => {
    if ((answersRef.current[qi] || []).length > 0) return;
    setMarked((m) => ({ ...m, [qi]: !m[qi] }));
  };

  const handleSubmitClick = () => {
    const answered = Object.values(answers).filter((a) => a.length > 0).length;
    const unanswered = questions.length - answered;
    const markedCount = Object.values(marked).filter(Boolean).length;

    let text = 'Submit your quiz? This uses one attempt.';
    if (unanswered > 0 || markedCount > 0) {
      const parts = [];
      if (unanswered > 0) parts.push(`${unanswered} unanswered`);
      if (markedCount > 0) parts.push(`${markedCount} marked for review`);
      text = `You still have ${parts.join(' and ')}.\n\nSubmit anyway? This uses one attempt.`;
    }

    if (window.confirm(text)) finish();
  };

  const q = questions[current];
  const selected = answers[current] || [];
  const answeredCount = Object.values(answers).filter((a) => a.length > 0).length;
  const markedCount = Object.values(marked).filter(Boolean).length;

  //  which banners and timer style to show
  const connectionLost = offlineSeconds >= CONNECTION_WARN_SECONDS;
  const secondsUntilAutoSubmit = Math.max(0, SERVER_TIMEOUT_SECONDS - offlineSeconds);
  const showIdle = !connectionLost && idleSeconds >= IDLE_NOTICE_SECONDS;
  const urgent = remaining <= URGENT_SECONDS;

  return (
    <div className="attempt-page">
      {/*  Time's up screen */}
      {timeUp && (
        <div className="timeup-overlay">
          <div>
            <h1>⏰ Time's up!</h1>
            <p>Submitting your quiz...</p>
          </div>
        </div>
      )}

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
        <div className={`timer ${remaining <= 60 ? 'low' : ''} ${urgent ? 'urgent' : ''}`}>
          <Clock size={urgent ? 26 : 20} /> {formatDuration(remaining)}
        </div>
      </div>

      {message && <div className="alert alert-error">{message}</div>}

      {/*  connection warning */}
      {connectionLost && (
        <div className="alert alert-error">
          <b>Connection problem.</b> We cannot reach the server. Check your internet. If it is not
          back within {secondsUntilAutoSubmit} seconds, your quiz will be submitted automatically.
        </div>
      )}

      {/*  idle notice (informational only) */}
      {showIdle && (
        <div className="alert alert-warn">
          <b>Still there?</b> You have not done anything for {idleSeconds} seconds. Your timer is
          still running ({formatDuration(remaining)} left).
        </div>
      )}

      <div className="attempt-layout">
        <div className="card">
          <div className="question-head">
            <div className="q-counter" style={{ marginBottom: 0 }}>
              Question {current + 1} of {questions.length}
            </div>
            <button
                type="button"
                className={`btn btn-sm mark-btn ${marked[current] ? 'on' : ''}`}
                onClick={() => toggleMark(current)}
                disabled={selected.length > 0}
                title={selected.length > 0 ? 'Clear your response to mark this for review' : ''}
                >
                <Flag size={15} /> {marked[current] ? 'Marked for review' : 'Mark for review'}
            </button>
          </div>

          <p className="q-text" style={{ marginTop: 12 }}>
            {q.text}
          </p>

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
            {answeredCount} answered · {markedCount} marked for review
          </p>

          <div className="palette-grid">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`palette-btn ${(answers[i] || []).length > 0 ? 'answered' : ''} ${
                  marked[i] ? 'marked' : ''
                } ${i === current ? 'current' : ''}`}
                onClick={() => setCurrent(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <PaletteLegend />

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