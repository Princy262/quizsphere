import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, MinusCircle, Clock, Eye, Play } from 'lucide-react';
import api from '../../api/axios.js';
import { formatDuration } from '../../utils/formatTime.js';
import AttemptChart from '../../components/AttemptChart.jsx';

const ENDED_BY = {
  submitted: 'Quiz submitted',
  'auto-submitted': "Time's up! Your quiz was submitted automatically",
  'left-window': 'You left the quiz, so it was submitted',
};

const ResultPage = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const result = state?.result;

  const [history, setHistory] = useState(null);

  // Load the attempt history so the graph includes this attempt
  useEffect(() => {
    if (!result) return;
    api
      .get(`/student/quizzes/${id}/attempts`)
      .then(({ data }) => setHistory(data))
      .catch(() => {});
  }, [id, result]);

  // Opened directly (for example after a refresh): go back to the details page
  if (!result) return <Navigate to={`/student/quizzes/${id}`} replace />;

  const outOf = result.attemptsUsed + result.attemptsRemaining;

  return (
    <div>
      <div className="hero">
        <h1>{ENDED_BY[result.status] || 'Quiz submitted'}</h1>
        <p className="muted">
          Attempt {result.attemptNumber} of {outOf}
          {history && ` · ${history.quiz.title}`}
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="muted">Your score</div>
        <div className="score-big">
          {result.score} / {result.totalQuestions}
        </div>

        <div className="result-grid">
          <div className="result-box">
            <CheckCircle2 color="#16a34a" />
            <b>{result.correct}</b>Correct
          </div>
          <div className="result-box">
            <XCircle color="#dc2626" />
            <b>{result.incorrect}</b>Incorrect
          </div>
          <div className="result-box">
            <MinusCircle color="#78909c" />
            <b>{result.unanswered}</b>Unanswered
          </div>
          <div className="result-box">
            <Clock color="#7b1fa2" />
            <b>{formatDuration(result.timeTaken)}</b>Time taken
          </div>
        </div>

        {history?.best && (
          <p className="muted">
            Your best score so far: <b>{history.best.score}</b> / {result.totalQuestions}
          </p>
        )}

        <p className="muted">
          {result.attemptsRemaining > 0
            ? `You have ${result.attemptsRemaining} attempt${result.attemptsRemaining > 1 ? 's' : ''} left on this quiz. Correct answers unlock after your last attempt.`
            : 'You have used all your attempts on this quiz.'}
        </p>

        <div className="details-actions" style={{ justifyContent: 'center' }}>
          {result.attemptsRemaining > 0 ? (
            <Link to={`/student/quizzes/${id}`} className="btn btn-primary">
              <Play size={16} /> Back to quiz
            </Link>
          ) : (
            <Link to={`/student/quizzes/${id}/answers`} className="btn btn-primary">
              <Eye size={16} /> View Correct Answers
            </Link>
          )}
          <Link to="/student/results" className="btn btn-secondary">
            My Results
          </Link>
          <Link to="/student" className="btn btn-ghost">
            All quizzes
          </Link>
        </div>
      </div>

      {history && (
        <>
          <div className="section-head" style={{ marginTop: 28 }}>
            <h2>Your progress</h2>
          </div>
          <div className="card">
            <AttemptChart data={history.chartData} maxScore={history.quiz.maxScore} />
            <p className="hint" style={{ marginBottom: 0 }}>
              Only you can see this graph.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultPage;