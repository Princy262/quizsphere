import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useTheme } from './utils/useTheme.js';
import ProtectedRoute, { dashboardPath } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-text">Loading...</p>;
  return <Navigate to={user ? dashboardPath(user.role) : '/login'} replace />;
};

// TEMPORARY: replaced by the real dashboards in the next parts
const TempDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useTheme(user.role);

  return (
    <div style={{ padding: 40 }}>
      <div className="card">
        <h2>Hello, {user.name}</h2>
        <p className="muted">
          You are logged in as <b>{user.role}</b>. The real dashboard comes next.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/examiner"
        element={
          <ProtectedRoute role="examiner">
            <TempDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <TempDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

export default App;