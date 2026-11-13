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
import QuizDetails from './pages/student/QuizDetails.jsx';
import AttemptQuiz from './pages/student/AttemptQuiz.jsx';
import ResultPage from './pages/student/ResultPage.jsx';
import ReviewAnswers from './pages/student/ReviewAnswers.jsx';
import AnswerKey from './pages/student/AnswerKey.jsx';
import MyResults from './pages/student/MyResults.jsx';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-text">Loading...</p>;
  return <Navigate to={user ? dashboardPath(user.role) : '/login'} replace />;
};

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

      {/* Quiz-taking screen: student only, NO sidebar */}
      <Route
        path="/student/quizzes/:id/attempt"
        element={
          <ProtectedRoute role="student">
            <AttemptQuiz />
          </ProtectedRoute>
        }
      />

      {/* Other student pages (with sidebar) */}
      <Route
        element={
          <ProtectedRoute role="student">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/results" element={<MyResults />} />
        <Route path="/student/quizzes/:id" element={<QuizDetails />} />
        <Route path="/student/quizzes/:id/result" element={<ResultPage />} />
        <Route path="/student/quizzes/:id/review" element={<ReviewAnswers />} />
        <Route path="/student/quizzes/:id/answers" element={<AnswerKey />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

export default App;