import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute, { dashboardPath } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ExaminerDashboard from './pages/examiner/ExaminerDashboard.jsx';
import MyQuizzes from './pages/examiner/MyQuizzes.jsx';
import CreateQuiz from './pages/examiner/CreateQuiz.jsx';
import EditQuiz from './pages/examiner/EditQuiz.jsx';
import QuizLeaderboard from './pages/examiner/QuizLeaderboard.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-text">Loading...</p>;
  return <Navigate to={user ? dashboardPath(user.role) : '/login'} replace />;
};

// Temporary page for links whose pages we haven't built yet
const Placeholder = ({ title }) => (
  <div className="hero">
    <h1>{title}</h1>
    <p className="muted">This page is coming in the next steps.</p>
  </div>
);

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Examiner pages */}
      <Route
        element={
          <ProtectedRoute role="examiner">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/examiner" element={<ExaminerDashboard />} />
        <Route path="/examiner/quizzes" element={<MyQuizzes />} />
        <Route path="/examiner/quizzes/new" element={<CreateQuiz />} />
        <Route path="/examiner/quizzes/:id/edit" element={<EditQuiz />} />
        <Route path="/examiner/quizzes/:id/leaderboard" element={<QuizLeaderboard />} />
      </Route>

      {/* Student pages */}
      <Route
        element={
          <ProtectedRoute role="student">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/results" element={<Placeholder title="My Results" />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

export default App;