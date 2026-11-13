import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from '../../../auth/AuthContext';
import './LoginPage.css';

export default function LoginStudentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();
  const from = (location.state as { from?: Location })?.from?.pathname || '/student';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập');
      return false;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const user = await login(username.trim(), password, remember);
      if (user.role !== 'STUDENT') {
        logout();
        setError('Đây là tài khoản nội bộ, vui lòng đăng nhập ở cổng nội bộ');
        return;
      }
      navigate(from === '/student' ? homePathFor(user.role) : from, { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      if (apiErr.code === 'INVALID_CREDENTIALS') {
        setError('Thông tin đăng nhập không chính xác');
      } else if (apiErr.code === 'FORBIDDEN') {
        setError('Tài khoản đã bị khóa');
      } else {
        setError(apiErr.message || 'Đăng nhập thất bại, vui lòng thử lại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Đăng nhập sinh viên</h1>
            <p className="login-subtitle">Cổng sinh viên UniGo</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && <div className="login-error" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                disabled={isLoading}
                aria-invalid={!!error}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Mật khẩu
              </label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="checkbox-custom"></span>
                Ghi nhớ đăng nhập
              </label>
            </div>

            <button
              type="submit"
              className="btn btn--primary login-submit"
              disabled={isLoading}
            >
              {isLoading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          <div className="login-footer">
            <p className="login-register-link">
              Chưa có tài khoản? <Link to="/register">Đăng ký hồ sơ sinh viên</Link>
            </p>
            <p className="login-internal-link">
              <Link to="/internal/login">Đăng nhập cổng nội bộ (Vận hành / Tài xế / KTV)</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}