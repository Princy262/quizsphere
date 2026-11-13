import { Link } from 'react-router-dom';
import { Clock, HelpCircle, Trophy, ArrowRight, BarChart3 } from 'lucide-react';

const StudentQuizCard = ({ quiz }) => {
  const done = quiz.attemptsRemaining === 0;

  return (
    <div className="quiz-card">
      <div>
        <h3>{quiz.title}</h3>
        <p className="quiz-desc">{quiz.description || 'No description'}</p>
      </div>

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

      <div className="attempt-row">
        <div className="attempt-dots" title={`${quiz.attemptsUsed} of ${quiz.maxAttempts} attempts used`}>
          {Array.from({ length: quiz.maxAttempts }, (_, i) => (
            <span key={i} className={`dot ${i < quiz.attemptsUsed ? 'used' : ''}`} />
          ))}
          <span className="muted">
            &nbsp;Attempts {quiz.attemptsUsed}/{quiz.maxAttempts}
          </span>
        </div>

        {quiz.bestScore !== null && (
          <span className="best-score">
            <Trophy size={15} /> {quiz.bestScore}/{quiz.questionCount}
          </span>
        )}
      </div>

      <div className="card-actions">
        <Link
          to={`/student/quizzes/${quiz._id}`}
          className={`btn btn-sm btn-full ${done ? 'btn-ghost' : 'btn-primary'}`}
        >
          {done ? (
            <>
              <BarChart3 size={16} /> View Results
            </>
          ) : (
            <>
              {quiz.attemptsUsed === 0 ? 'Start Quiz' : 'Attempt Again'} <ArrowRight size={16} />
            </>
          )}
        </Link>
      </div>
    </div>
  );
};

export default StudentQuizCard;