import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorNotice, Loading } from './common';

export function ProtectedRoute() {
  const { token, loading, sessionError, retrySession } = useAuth();
  if (loading) return <Loading label="Checking your session…" />;
  if (token && sessionError) {
    return <div className="mx-auto max-w-xl px-5 py-16"><ErrorNotice message={`Could not verify your session: ${sessionError}`} onRetry={retrySession} /></div>;
  }
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PublicOnlyRoute() {
  const { token, loading, sessionError, retrySession } = useAuth();
  if (loading) return <Loading label="Checking your session…" />;
  if (token && sessionError) {
    return <div className="mx-auto max-w-xl px-5 py-16"><ErrorNotice message={`Could not verify your session: ${sessionError}`} onRetry={retrySession} /></div>;
  }
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
