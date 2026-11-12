import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, HelpCircle, Layers, ListChecks } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api, { getErrorMessage } from '../../api/axios.js';
import ExaminerQuizCard from '../../components/ExaminerQuizCard.jsx';

const ExaminerDashboard = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/examiner/quizzes');
        setQuizzes(data.quizzes);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (quiz) => {
    const ok = window.confirm(
      `Delete "${quiz.title}"?\n\nAll student attempts on this quiz will be deleted too. This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api.delete(`/examiner/quizzes/${quiz._id}`);
      setQuizzes((list) => list.filter((q) => q._id !== quiz._id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const totalQuestions = quizzes.reduce((sum, q) => sum + q.questionCount, 0);
  const categories = new Set(quizzes.map((q) => q.category.toLowerCase())).size;
  const msqQuizzes = quizzes.filter((q) => q.hasMSQ).length;

  const stats = [
    { label: 'Total Quizzes', value: quizzes.length, icon: ClipboardList },
    { label: 'Total Questions', value: totalQuestions, icon: HelpCircle },
    { label: 'Categories', value: categories, icon: Layers },
    { label: 'Quizzes with MSQ', value: msqQuizzes, icon: ListChecks },
  ];

  return (
    <div>
      <div className="hero">
        <h1>Welcome back, {user.name}!</h1>
        <p className="muted">Create, manage and analyze your quizzes.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <span className="stat-icon">
              <Icon size={22} />
            </span>
            <div>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{loading ? '-' : value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>Your Quizzes</h2>
        <Link to="/examiner/quizzes" className="link-more">
          View all
        </Link>
      </div>

      {loading ? (
        <p className="center-text">Loading quizzes...</p>
      ) : quizzes.length === 0 ? (
        <div className="card empty-state">
          <h3>No quizzes yet</h3>
          <p>Create your first quiz to get started.</p>
          <Link to="/examiner/quizzes/new" className="btn btn-primary">
            Create Quiz
          </Link>
        </div>
      ) : (
        <div className="grid">
          {quizzes.slice(0, 3).map((quiz) => (
            <ExaminerQuizCard key={quiz._id} quiz={quiz} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExaminerDashboard;