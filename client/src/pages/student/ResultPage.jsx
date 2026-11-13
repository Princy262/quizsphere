import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';
import { formatDuration } from '../../utils/formatTime.js';

const ENDED_BY = {
  submitted: 'Quiz submitted',
  'auto-submitted': "Time's up! Your quiz was submitted automatically",
  'left-window': 'You left the quiz, so it was submitted',
};

const ResultPage = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const result = state?.result;

  // Opened directly (for example after a refresh): go back to the details page
  if (!result) return <Navigate to={`/student/quizzes/${id}`} replace />;

  return (
    <div>
      <div className="hero">
        <h1>{ENDED_BY[result.status] || 'Quiz submitted'}</h1>
        <p className="muted">
          Attempt {result.attemptNumber} of {result.attemptsUsed + result.attemptsRemaining}
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

        <p className="muted">
          {result.attemptsRemaining > 0
            ? `You have ${result.attemptsRemaining} attempt${result.attemptsRemaining > 1 ? 's' : ''} left on this quiz.`
            : 'You have used all your attempts on this quiz.'}
        </p>

        <div className="details-actions" style={{ justifyContent: 'center' }}>
          <Link to={`/student/quizzes/${id}`} className="btn btn-primary">
            {result.attemptsRemaining > 0 ? 'Back to quiz' : 'View my attempts'}
          </Link>
          <Link to="/student" className="btn btn-ghost">
            All quizzes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;