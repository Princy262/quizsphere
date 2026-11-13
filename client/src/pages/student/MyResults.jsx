import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import { formatDuration } from '../../utils/formatTime.js';
import CategoryFilter from '../../components/CategoryFilter.jsx';

const MyResults = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(''); // '' = All Categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [quizRes, catRes] = await Promise.all([
          api.get('/student/quizzes'),
          api.get('/student/categories'),
        ]);
        // Only quizzes this student has started
        setQuizzes(quizRes.data.quizzes.filter((q) => q.attemptsUsed > 0));
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
    ? quizzes.filter((q) => q.category.toLowerCase() === category.toLowerCase())
    : quizzes;

  return (
    <div>
      <div className="hero">
        <h1>My Results</h1>
        <p className="muted">Every quiz you have attempted, with your best performance.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <CategoryFilter categories={categories} value={category} onChange={setCategory} />
      </div>

      {loading ? (
        <p className="center-text">Loading results...</p>
      ) : visible.length === 0 ? (
        <div className="card empty-state">
          <h3>{quizzes.length === 0 ? 'No attempts yet' : 'No attempts in this category'}</h3>
          <p>
            {quizzes.length === 0
              ? 'Attempt a quiz and your results will appear here.'
              : 'Pick another category or choose All Categories.'}
          </p>
          {quizzes.length === 0 && (
            <Link to="/student" className="btn btn-primary">
              Browse quizzes
            </Link>
          )}
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Category</th>
                  <th>Attempts</th>
                  <th>Best score</th>
                  <th>Best time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((q) => (
                  <tr key={q._id}>
                    <td className="student-name">{q.title}</td>
                    <td>
                      <span className="chip chip-category">{q.category}</span>
                    </td>
                    <td>
                      {q.attemptsUsed} / {q.maxAttempts}
                    </td>
                    <td>
                      {q.bestScore === null ? (
                        '-'
                      ) : (
                        <>
                          <b>{q.bestScore}</b> / {q.questionCount}
                        </>
                      )}
                    </td>
                    <td>{formatDuration(q.bestTime)}</td>
                    <td>
                      <Link to={`/student/quizzes/${q._id}`} className="btn btn-ghost btn-sm">
                        Open <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyResults;