import { NavLink, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  LayoutDashboard,
  ClipboardList,
  PlusSquare,
  History,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// To add a page to the sidebar, add one line here
const NAV = {
  examiner: [
    { to: '/examiner', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/examiner/quizzes', label: 'My Quizzes', icon: ClipboardList },
    { to: '/examiner/quizzes/new', label: 'Create Quiz', icon: PlusSquare },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/results', label: 'My Results', icon: History },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-icon">
          <CheckCircle2 size={22} />
        </span>
        QuizSphere
      </div>

      <nav className="nav-links">
        {NAV[user.role].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;