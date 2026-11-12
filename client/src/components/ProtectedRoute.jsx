import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// eslint-disable-next-line react-refresh/only-export-components
export const dashboardPath = (role) =>
  role === 'examiner' ? '/examiner' : '/student';

// <ProtectedRoute role="examiner"> ... </ProtectedRoute>
const ProtectedRoute = ({ role, children }) => {
  const { user, loading } = useAuth();

  if (loading) return <p className="center-text">Loading...</p>;

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Logged in, but this page belongs to the other role
  if (role && user.role !== role) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;