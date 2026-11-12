import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../utils/useTheme.js';
import Sidebar from './Sidebar.jsx';

// The frame around every logged-in page: sidebar + top bar + the page itself
const AppLayout = () => {
  const { user } = useAuth();

  // Examiner pages get the brown theme, student pages the purple/teal one
  useTheme(user.role);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <div className="topbar">
          <div className="user-chip">
            <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span>{user.name}</span>
            <span className="role-badge">{user.role}</span>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;