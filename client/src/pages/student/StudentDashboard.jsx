import { useAuth } from '../../context/AuthContext.jsx';

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="hero">
        <h1>Hello, {user.name}! 👋</h1>
        <p className="muted">Keep learning, keep growing.</p>
      </div>

      <div className="card">Available quizzes will appear here.</div>
    </div>
  );
};

export default StudentDashboard;