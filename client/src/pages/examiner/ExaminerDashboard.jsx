import { useAuth } from '../../context/AuthContext.jsx';

const ExaminerDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="hero">
        <h1>Welcome back, {user.name}!</h1>
        <p className="muted">Create, manage and analyze your quizzes.</p>
      </div>

      <div className="card">Your quizzes will appear here.</div>
    </div>
  );
};

export default ExaminerDashboard;