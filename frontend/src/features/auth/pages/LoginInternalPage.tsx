import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../../../auth/AuthContext';
import { ROLE_OPTIONS, INTERNAL_ROLES, type InternalRole } from '../constants';
import './LoginPage.css';

export default function LoginInternalPage() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [selectedRole, setSelectedRole] = useState<InternalRole>('OPERATOR');
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
      // Quyền truy cập do vai trò của tài khoản (backend trả về) quyết định, không phải lựa chọn trên giao diện.
      if (!(user.role in INTERNAL_ROLES)) {
        logout();
        setError('Tài khoản này không có quyền truy cập cổng nội bộ');
        return;
      }
      navigate(homePathFor(user.role), { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string; status?: number };
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
            <h1 className="login-title">Đăng nhập cổng nội bộ</h1>
            <p className="login-subtitle">UniGo Nội bộ – Hệ thống vận hành</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && <div className="login-error" role="alert">{error}</div>}

            <div className="form-group">
              <label className="form-label">Khu vực làm việc</label>
              <div className="role-selector">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role.value}
                    className={`role-option${selectedRole === role.value ? ' role-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedRole === role.value}
                      onChange={() => setSelectedRole(role.value)}
                      disabled={isLoading}
                    />
                    <div className="role-option__content">
                      <span className="role-option__label">{role.label}</span>
                      <span className="role-option__desc">{role.description}</span>
                    </div>
                  </label>
                ))}
              </div>
              <span className="form-hint">Quyền truy cập được xác định theo tài khoản, không phụ thuộc lựa chọn này.</span>
            </div>

            <div className="form-group">
              <label htmlFor="username-internal" className="form-label">
                Tên đăng nhập
              </label>
              <input
                id="username-internal"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password-internal" className="form-label">
                Mật khẩu
              </label>
              <div className="password-wrapper">
                <input
                  id="password-internal"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={isLoading}
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
            <p className="login-student-link">
              <Link to="/login">← Quay về cổng sinh viên</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}