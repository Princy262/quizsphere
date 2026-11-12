import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusSquare } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import ExaminerQuizCard from '../../components/ExaminerQuizCard.jsx';
import CategoryFilter from '../../components/CategoryFilter.jsx';

const MyQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(''); // '' = All Categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    const { data } = await api.get('/examiner/categories');
    setCategories(data.categories);
    return data.categories;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [quizRes] = await Promise.all([
          api.get('/examiner/quizzes'),
          loadCategories(),
        ]);
        setQuizzes(quizRes.data.quizzes);
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

      // The category may have disappeared if that was its last quiz
      const fresh = await loadCategories();
      if (category && !fresh.some((c) => c.toLowerCase() === category.toLowerCase())) {
        setCategory('');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const visible = category
    ? quizzes.filter((q) => q.category.toLowerCase() === category.toLowerCase())
    : quizzes;

  return (
    <div>
      <div className="hero">
        <h1>My Quizzes</h1>
        <p className="muted">Manage all the quizzes you have created.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <CategoryFilter categories={categories} value={category} onChange={setCategory} />
        <Link to="/examiner/quizzes/new" className="btn btn-primary">
          <PlusSquare size={18} /> Create Quiz
        </Link>
      </div>

      {loading ? (
        <p className="center-text">Loading quizzes...</p>
      ) : visible.length === 0 ? (
        <div className="card empty-state">
          <h3>
            {quizzes.length === 0
              ? 'No quizzes yet'
              : `You haven't created any ${category} quizzes yet`}
          </h3>
          <p>
            {quizzes.length === 0
              ? 'Create your first quiz to get started.'
              : 'Create one, or pick another category.'}
          </p>
          <Link to="/examiner/quizzes/new" className="btn btn-primary">
            Create Quiz
          </Link>
        </div>
      ) : (
        <div className="grid">
          {visible.map((quiz) => (
            <ExaminerQuizCard key={quiz._id} quiz={quiz} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyQuizzes;