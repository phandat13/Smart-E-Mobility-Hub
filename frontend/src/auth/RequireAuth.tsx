import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface RequireAuthProps {
  roles?: ('STUDENT' | 'OPERATOR' | 'DRIVER' | 'TECHNICIAN')[];
  fallbackPathname?: string;
}

export function RequireAuth({ roles, fallbackPathname = '/login' }: RequireAuthProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="card" style={{ padding: '40px', textAlign: 'center' }}>Đang kiểm tra phiên đăng nhập…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={fallbackPathname} state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={fallbackPathname} state={{ from: location }} replace />;
  }

  return <Outlet />;
}