import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import DashboardLayout from './components/layout/DashboardLayout';
import AgendaPage from './pages/AgendaPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ClassConnectPage from './pages/ClassConnectPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CoursesPage from './pages/CoursesPage';
import LessonPage from './pages/LessonPage';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import PlaceholderPage from './pages/PlaceholderPage';
import TeachersPage from './pages/TeachersPage';

function HomeRedirect() {
  const { authenticated, loading } = useAuth();
  const { defaultHomePage } = useSettings();

  if (loading) return null;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <Navigate to={`/${defaultHomePage}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="course/:courseId" element={<CourseDetailPage />} />
        <Route path="lesson/:itemId" element={<LessonPage />} />
        <Route path="class-connect/:sessionId" element={<ClassConnectPage />} />
        <Route path="account" element={<PlaceholderPage title="Account" />} />
        <Route path="groups" element={<PlaceholderPage title="Groups" />} />
        <Route path="calendar" element={<PlaceholderPage title="Calendar" />} />
        <Route path="inbox" element={<PlaceholderPage title="Inbox" />} />
        <Route path="history" element={<PlaceholderPage title="History" />} />
        <Route path="resources" element={<PlaceholderPage title="Resources" />} />
        <Route path="studio" element={<PlaceholderPage title="Studio" />} />
        <Route path="help" element={<PlaceholderPage title="Help" />} />
      </Route>
    </Routes>
  );
}
