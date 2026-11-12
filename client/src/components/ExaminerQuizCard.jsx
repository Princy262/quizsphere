import { Link } from 'react-router-dom';
import { Clock, HelpCircle, Pencil, Trophy, Trash2 } from 'lucide-react';

const ExaminerQuizCard = ({ quiz, onDelete }) => {
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
        {quiz.hasMSQ && <span className="chip chip-msq">Contains MSQ</span>}
      </div>

      <div className="card-actions">
        <Link to={`/examiner/quizzes/${quiz._id}/leaderboard`} className="btn btn-primary btn-sm">
          <Trophy size={15} /> Leaderboard
        </Link>
        <Link to={`/examiner/quizzes/${quiz._id}/edit`} className="btn btn-ghost btn-sm">
          <Pencil size={15} /> Edit
        </Link>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(quiz)}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};

export default ExaminerQuizCard;