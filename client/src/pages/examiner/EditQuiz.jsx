import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios.js';
import QuizForm from '../../components/QuizForm.jsx';

const EditQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/examiner/quizzes/${id}`)
      .then(({ data }) => setQuiz(data.quiz))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  const handleSubmit = async (payload) => {
    await api.put(`/examiner/quizzes/${id}`, payload);
    navigate('/examiner/quizzes');
  };

  return (
    <div>
      <div className="hero">
        <h1>Edit Quiz</h1>
        <p className="muted">
          You can change the title, category, description and time limit at any time. Questions
          can only be changed until a student attempts the quiz.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* The form is shown only after the quiz has loaded, so it starts filled in */}
      {quiz ? (
        <QuizForm initial={quiz} onSubmit={handleSubmit} submitLabel="Save Changes" />
      ) : (
        !error && <p className="center-text">Loading quiz...</p>
      )}
    </div>
  );
};

export default EditQuiz;