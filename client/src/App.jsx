import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute, { dashboardPath } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ExaminerDashboard from './pages/examiner/ExaminerDashboard.jsx';
import MyQuizzes from './pages/examiner/MyQuizzes.jsx';
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

      {/* Examiner pages: must be logged in as examiner, shown inside the sidebar layout */}
      <Route
        element={
          <ProtectedRoute role="examiner">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/examiner" element={<ExaminerDashboard />} />
        <Route path="/examiner/quizzes" element={<MyQuizzes />} />
        <Route path="/examiner/quizzes/new" element={<Placeholder title="Create Quiz" />} />
        <Route path="/examiner/quizzes/:id/edit" element={<Placeholder title="Edit Quiz" />} />
        <Route
          path="/examiner/quizzes/:id/leaderboard"
          element={<Placeholder title="Leaderboard" />}
        />
      </Route>

      {/* Student pages: must be logged in as student */}
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