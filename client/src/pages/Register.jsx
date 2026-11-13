import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/axios.js';
import { dashboardPath } from '../components/ProtectedRoute.jsx';
import { useTheme } from '../utils/useTheme.js';
import PasswordInput from '../components/PasswordInput.jsx';
import logo from '../assets/logo/logo.png';

const Register = () => {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // The colors preview the role the person is choosing
  useTheme(form.role);

  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const created = await register(form.name, form.email, form.password, form.role);
      navigate(dashboardPath(created.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
          <div className="logo">
            <img src={logo} alt="QuizSphere" className="auth-logo" />
          </div>
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Choose how you will use QuizSphere</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="role-picker">
            {[
              { value: 'student', label: 'Student', icon: GraduationCap },
              { value: 'examiner', label: 'Examiner', icon: ClipboardList },
            ].map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`role-option ${form.role === value ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={form.role === value}
                  onChange={handleChange}
                />
                <Icon size={18} />
                {label}
              </label>
            ))}
          </div>

          <label className="field-label">Full name</label>
          <input
            className="input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Riya Sharma"
            required
          />

          <label className="field-label">Email</label>
          <input
            className="input"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />

          <label className="field-label">Password</label>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
          />

          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;