import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import { formatDuration } from '../../utils/formatTime.js';

const QuizLeaderboard = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/examiner/quizzes/${id}/leaderboard`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  return (
    <div>
      <Link to="/examiner/quizzes" className="link-more back-link">
        <ArrowLeft size={16} /> Back to My Quizzes
      </Link>

      <div className="hero">
        <h1>{data ? data.quiz.title : 'Leaderboard'}</h1>
        <p className="muted">
          {data
            ? `${data.quiz.category} · ${data.quiz.timeLimit} min · ${data.quiz.totalQuestions} questions`
            : 'Top performers in this quiz'}
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data && !error && <p className="center-text">Loading leaderboard...</p>}

      {data && data.leaderboard.length === 0 && (
        <div className="card empty-state">
          <h3>No attempts yet</h3>
          <p>Students who finish this quiz will appear here.</p>
        </div>
      )}

      {data && data.leaderboard.length > 0 && (
        <div className="card table-card">
          <p className="hint" style={{ marginTop: 0 }}>
            Ranked by best score, then by the time taken to get that score. Equal score and time
            share a rank.
          </p>

          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Best Score</th>
                  <th>Time</th>
                  <th>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((row) => (
                  <tr key={row.studentId}>
                    <td>
                      <span className={`rank-badge rank-${row.rank <= 3 ? row.rank : 'n'}`}>
                        {row.rank <= 3 ? <Trophy size={14} /> : null}
                        {row.rank}
                      </span>
                    </td>
                    <td>
                      <div className="student-name">{row.name}</div>
                      <div className="muted small">{row.email}</div>
                    </td>
                    <td>
                      <b>{row.bestScore}</b> / {row.totalQuestions}
                    </td>
                    <td>{formatDuration(row.timeTaken)}</td>
                    <td>{row.attemptsUsed} / 3</td>
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

export default QuizLeaderboard;