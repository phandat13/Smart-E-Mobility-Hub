import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './StudentLayout.css';

const NAV_ITEMS = [
  { label: 'Trang chủ', to: '/student' },
  { label: 'Đặt chỗ', to: '/student/booking' },
  { label: 'Chuyến đi', to: '/account/trips' },
  { label: 'Tài khoản', to: '/account/profile' },
] as const;

export default function StudentLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="student-layout">
      <header className="student-navbar">
        <div className="student-navbar__brand">
          <Link to="/student" className="student-navbar__logo">
            ⚡ UniGo Sinh viên
          </Link>
        </div>

        <nav className="student-navbar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `student-navbar__link${isActive ? ' student-navbar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="student-navbar__actions">
          <button className="student-navbar__icon-btn" aria-label="Thông báo">
            <span className="student-navbar__icon">🔔</span>
            <span className="student-navbar__badge">3</span>
          </button>

          <div className="student-navbar__user">
            <Link to="/account/profile" className="student-navbar__avatar" aria-label="Tài khoản">
              {user?.fullName?.charAt(0).toUpperCase() || '?'}
            </Link>
            <div className="student-navbar__user-info">
              <span className="student-navbar__name">{user?.fullName || 'Sinh viên'}</span>
              <span className="student-navbar__role">Sinh viên</span>
            </div>
            <button className="student-navbar__logout" onClick={logout} aria-label="Đăng xuất">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="student-layout__main">
        <Outlet />
      </main>
    </div>
  );
}