import { NavLink } from 'react-router-dom';
import type { SyncStatus } from '../features/mo/types';

const NAV = [
  { label: 'Tổng quan mạng lưới', code: 'MO01', to: '/overview' },
  { label: 'Hub & hạ tầng', code: 'MO02–04', to: '/hubs' },
  { label: 'Danh mục xe', code: 'MO05', to: '/vehicles' },
  { label: 'Điều chuyển xe', code: 'RB01', to: '/rebalance' },
  { label: 'Sự cố & bảo trì', code: 'MT02–03', to: '/maintenance' },
  { label: 'Lịch sạc thông minh', code: 'SC01–02', to: '/charging-schedules' },
  { label: 'Mô phỏng What-if', code: 'SI01–05', to: '/simulations' },
];

export default function Sidebar({ sync }: { sync: SyncStatus | null }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">⚡</div>
        <div>
          <div className="sidebar__name">UniGo Vận hành</div>
          <div className="sidebar__role">ĐƠN VỊ VẬN HÀNH · ĐHQG</div>
        </div>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}>
            <span className="nav-item__label">{n.label}</span>
            <span className="nav-item__code">{n.code}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sync">
        <span className="sync__dot" />
        <div>
          <div className="sync__title">Dữ liệu IoT đồng bộ</div>
          <div className="sync__sub">
            Chu kỳ ≤ 30 giây{sync ? ` · ${sync.hubsOnline}/${sync.hubsTotal} Hub online` : ''}
          </div>
        </div>
      </div>
    </aside>
  );
}
