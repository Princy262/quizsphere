import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, HelpCircle, AlertTriangle, Play, Eye } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import { formatDuration } from '../../utils/formatTime.js';
import AttemptChart from '../../components/AttemptChart.jsx';
import PaletteLegend from '../../components/PaletteLegend.jsx';

const STATUS_LABEL = {
  submitted: { text: 'Submitted', warn: false },
  'auto-submitted': { text: 'Time was up', warn: true },
  'left-window': { text: 'Left the quiz window', warn: true },
};

const QuizDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // The history call also closes any attempt whose time already ran out
        const [historyRes, quizRes] = await Promise.all([
          api.get(`/student/quizzes/${id}/attempts`),
          api.get(`/student/quizzes/${id}`),
        ]);
        setHistory(historyRes.data);
        setQuiz(quizRes.data.quiz);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    };
    load();
  }, [id]);

  const handleStart = async () => {
    const ok = window.confirm(
      `Start "${quiz.title}"?\n\nThe timer starts immediately. If you close or refresh this tab, the quiz is submitted and the attempt counts.`
    );
    if (!ok) return;

    setError('');
    setStarting(true);
    try {
      const { data } = await api.post(`/student/quizzes/${id}/start`);
      // Pass the questions to the next page (they are not stored anywhere else)
      navigate(`/student/quizzes/${id}/attempt`, { state: data, replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setStarting(false);
    }
  };

  if (error && !quiz) {
    return (
      <div>
        <Link to="/student" className="link-more back-link">
          <ArrowLeft size={16} /> Back to quizzes
        </Link>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!quiz || !history) return <p className="center-text">Loading quiz...</p>;

  const noAttemptsLeft = history.attemptsRemaining === 0;

  return (
    <div>
      <Link to="/student" className="link-more back-link">
        <ArrowLeft size={16} /> Back to quizzes
      </Link>

      <div className="hero">
        <h1>{quiz.title}</h1>
        <p className="muted">{quiz.description || 'No description'}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="chip-row">
          <span className="chip chip-category">{quiz.category}</span>
          <span className="chip">
            <Clock size={14} /> {quiz.timeLimit} min
          </span>
          <span className="chip">
            <HelpCircle size={14} /> {quiz.questionCount} Qs
          </span>
          {quiz.hasMSQ && (
            <span
              className="chip chip-msq has-tooltip"
              tabIndex={0}
              data-tip="Some questions may contain multiple correct answers"
            >
              MSQ
            </span>
          )}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          By {quiz.examiner} · Attempts used {history.attemptsUsed}/{history.maxAttempts}
          {history.best && ` · Best score ${history.best.score}/${quiz.questionCount}`}
        </p>
      </div>

      <div className="card rules-card">
        <h3>
          <AlertTriangle size={20} color="#d97706" /> Before you start
        </h3>
        <ul className="rules-list">
          <li>
            You have <b>{quiz.timeLimit} minutes</b>. The timer starts the moment you click Start.
          </li>
          <li>The quiz must be finished in one sitting. There is no pause or resume.</li>
          <li>
            If you close, refresh or leave the quiz tab, it is submitted with the answers so far
            and <b>counts as an attempt</b>.
          </li>
          <li>When the timer reaches 00:00, the quiz is submitted automatically and counts too.</li>
          <li>You can attempt each quiz up to {history.maxAttempts} times. Your best score is kept.</li>
          <li>Correct answers unlock only after you have used all {history.maxAttempts} attempts.</li>
          <li>
            Use <b>Mark for review</b> on any question you want to come back to. The question
            numbers on the quiz screen are colored like this:
          </li>
        </ul>
        <PaletteLegend />
      </div>

      {history.hasAttemptInProgress && (
        <div className="alert alert-error" style={{ marginTop: 18 }}>
          You have an attempt in progress. It will be closed automatically within about 90
          seconds. Refresh this page after that.
        </div>
      )}

      <div className="details-actions">
        {noAttemptsLeft ? (
          <button className="btn btn-primary" disabled>
            All {history.maxAttempts} attempts used
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={starting || history.hasAttemptInProgress}
          >
            <Play size={17} />
            {starting
              ? 'Starting...'
              : history.attemptsUsed === 0
                ? 'Start Quiz'
                : `Start Attempt ${history.attemptsUsed + 1}`}
          </button>
        )}

        {history.canReviewAnswers && (
          <Link to={`/student/quizzes/${id}/answers`} className="btn btn-secondary">
            <Eye size={17} /> View Correct Answers
          </Link>
        )}
      </div>

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Your attempts</h2>
      </div>

      {history.attempts.length === 0 ? (
        <div className="card empty-state">
          <p>You have not attempted this quiz yet.</p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Attempt</th>
                  <th>Score</th>
                  <th>Time taken</th>
                  <th>How it ended</th>
                  {history.canReviewAnswers && <th>See response</th>}
                </tr>
              </thead>
              <tbody>
                {history.attempts.map((a) => {
                  const label = STATUS_LABEL[a.status] || { text: a.status, warn: false };
                  return (
                    <tr key={a.attemptId}>
                      <td>Attempt {a.attemptNumber}</td>
                      <td>
                        <b>{a.score}</b> / {a.totalQuestions}
                      </td>
                      <td>{formatDuration(a.timeTaken)}</td>
                      <td>
                        <span className={`status-pill ${label.warn ? 'warn' : ''}`}>
                          {label.text}
                        </span>
                      </td>
                      {history.canReviewAnswers && (
                        <td>
                          <Link
                            to={`/student/quizzes/${id}/review?attempt=${a.attemptNumber}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <Eye size={14} /> See response
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* private attempt graph */}
      {history.attempts.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 28 }}>
            <h2>Your progress</h2>
          </div>
          <div className="card">
            <AttemptChart data={history.chartData} maxScore={quiz.questionCount} />
            <p className="hint" style={{ marginBottom: 0 }}>
              Only you can see this graph.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizDetails;