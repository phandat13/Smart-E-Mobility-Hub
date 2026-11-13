import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './InternalDriverLayout.css';

const DRIVER_TABS = [
  { label: 'Lệnh được giao', to: '/driver' },
  { label: 'Lịch sử lệnh', to: '/driver/history' },
  { label: 'Báo cáo sự cố', to: '/driver/incidents' },
] as const;

export default function InternalDriverLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="driver-layout">
      <header className="driver-topbar">
        <div className="driver-topbar__brand">
          <span className="driver-topbar__logo">⚡</span>
          <span className="driver-topbar__name">UniGo Nội bộ</span>
        </div>

        <nav className="driver-topbar__tabs" role="tablist" aria-label="Tabs tài xế">
          {DRIVER_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `driver-topbar__tab${isActive ? ' driver-topbar__tab--active' : ''}`
              }
              role="tab"
              aria-selected={location.pathname === tab.to || (tab.to !== '/driver' && location.pathname.startsWith(tab.to))}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="driver-topbar__user">
          <div className="driver-topbar__avatar">
            {user?.fullName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="driver-topbar__user-info">
            <span className="driver-topbar__name">{user?.fullName || 'Tài xế'}</span>
            <span className="driver-topbar__role">Tài xế điều chuyển</span>
          </div>
          <button className="driver-topbar__logout" onClick={logout} aria-label="Đăng xuất">
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="driver-layout__main">
        <Outlet />
      </main>
    </div>
  );
}