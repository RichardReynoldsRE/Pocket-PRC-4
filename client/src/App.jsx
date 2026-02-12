import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import AppShell from './components/Layout/AppShell';
import DashboardPage from './components/Dashboard/DashboardPage';
import ChecklistPage from './components/Checklist/ChecklistPage';
import TeamPage from './components/Team/TeamPage';
import AdminPage from './components/Admin/AdminPage';
import ReportsPage from './components/Admin/ReportsPage';
import ProfilePage from './components/Profile/ProfilePage';
import AppBanner from './components/Shared/AppBanner';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppBanner />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/checklist/new" element={<ChecklistPage />} />
              <Route path="/checklist/:id" element={<ChecklistPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}
