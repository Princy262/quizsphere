import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Layers, Percent } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api, { getErrorMessage } from '../../api/axios.js';
import CategoryFilter from '../../components/CategoryFilter.jsx';
import StudentQuizCard from '../../components/StudentQuizCard.jsx';

const StudentDashboard = () => {
  const { user } = useAuth();

  const [allQuizzes, setAllQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(''); // '' = All Categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load once: every quiz and every category
  useEffect(() => {
    const load = async () => {
      try {
        const [quizRes, catRes] = await Promise.all([
          api.get('/student/quizzes'),
          api.get('/student/categories'),
        ]);
        setAllQuizzes(quizRes.data.quizzes);
        setCategories(catRes.data.categories);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = category
    ? allQuizzes.filter((q) => q.category.toLowerCase() === category.toLowerCase())
    : allQuizzes;

  // ----- numbers for the stat cards -----
  const attempted = allQuizzes.filter((q) => q.bestScore !== null);
  const avgBest = attempted.length
    ? Math.round(
        (attempted.reduce((sum, q) => sum + (q.bestScore / q.questionCount) * 100, 0) /
          attempted.length)
      )
    : null;

  const stats = [
    { label: 'Available Quizzes', value: allQuizzes.length, icon: BookOpen },
    { label: 'Quizzes Attempted', value: attempted.length, icon: CheckCircle2 },
    { label: 'Categories', value: categories.length, icon: Layers },
    { label: 'Avg. Best Score', value: avgBest === null ? '-' : `${avgBest}%`, icon: Percent },
  ];

  return (
    <div>
      <div className="hero">
        <h1>Hello, {user.name}!</h1>
        <p className="muted">Keep learning, keep growing.</p>
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
        <h2>Available Quizzes</h2>
      </div>

      <div className="toolbar">
        <CategoryFilter categories={categories} value={category} onChange={setCategory} />
      </div>

      {loading ? (
        <p className="center-text">Loading quizzes...</p>
      ) : visible.length === 0 ? (
        <div className="card empty-state">
          <h3>{allQuizzes.length === 0 ? 'No quizzes yet' : 'No quizzes in this category'}</h3>
          <p>
            {allQuizzes.length === 0
              ? 'Examiners have not published any quizzes yet. Check back soon.'
              : 'Pick another category or choose All Categories.'}
          </p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((quiz) => (
            <StudentQuizCard key={quiz._id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;