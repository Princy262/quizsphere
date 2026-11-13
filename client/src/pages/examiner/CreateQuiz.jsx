import { useNavigate } from 'react-router-dom';
import api from '../../api/axios.js';
import QuizForm from '../../components/QuizForm.jsx';

const CreateQuiz = () => {
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    await api.post('/examiner/quizzes', payload);
    navigate('/examiner/quizzes');
  };

  return (
    <div>
      <div className="hero">
        <h1>Create a New Quiz</h1>
        <p className="muted">Set the details, time limit and questions.</p>
      </div>

      <QuizForm onSubmit={handleSubmit} submitLabel="Create Quiz" />
    </div>
  );
};

export default CreateQuiz;