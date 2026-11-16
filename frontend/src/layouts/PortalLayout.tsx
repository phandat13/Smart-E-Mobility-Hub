import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useDemoState } from '../mocks/store';
import { time } from '../shared/format';
import './portal.css';

export default function PortalLayout({ technician = false }: { technician?: boolean }) {
  const state = useDemoState();
  const technicianName = state.technicians.find(t => t.id === state.activeTechnicianId)?.name ?? 'Kỹ thuật viên';
  const [notifications, setNotifications] = useState(false);
  const { pathname } = useLocation();
  const links = technician ? [
    { to: '/tech/maintenance', label: 'Lệnh bảo trì', end: true },
    { to: '/tech/maintenance/tickets', label: 'Phiếu bảo trì', end: false },
    { to: '/tech/maintenance/history', label: 'Lịch sử', end: false },
  ] : [
    { to: '/pv', label: 'Trang chủ', end: true },
    { to: '/pv/book', label: 'Đặt chỗ', end: false },
    { to: '/pv/sessions', label: 'Chuyến đi', end: false },
    { to: '/pv/vehicles', label: 'Tài khoản', end: false },
  ];
  return <div className={`portal ${technician ? 'portal--tech' : ''}`}>
    <header className="portal-header">
      <Link to={technician ? '/tech/maintenance' : '/pv'} className="portal-brand"><span className="portal-brand__logo">⚡</span><span><strong>{technician ? 'UniGo Nội bộ' : 'UniGo'}</strong><small>{technician ? 'ỨNG DỤNG KỸ THUẬT VIÊN BẢO TRÌ' : 'DI CHUYỂN XANH · ĐHQG'}</small></span></Link>
      <nav className="portal-nav" aria-label={technician ? 'Điều hướng kỹ thuật viên' : 'Điều hướng sinh viên'}>{links.map(link => {
        let active = link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`);
        if (!technician && link.to === '/pv/book') active ||= pathname.startsWith('/pv/bookings/') || pathname.startsWith('/pv/sessions/');
        if (!technician && link.to === '/pv/sessions') active = pathname === '/pv/sessions' || pathname.startsWith('/incidents/');
        return <Link key={link.to} to={link.to} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>{link.label}</Link>;
      })}</nav>
      <div className="portal-header__end">{!technician && <div className="portal-notification-wrap"><button type="button" className="portal-bell" aria-label="Thông báo" aria-expanded={notifications} onClick={() => setNotifications(previous => !previous)}>🔔</button>{notifications && <section className="portal-notifications" aria-label="Thông báo phiên đỗ và sạc"><strong>Phiên đỗ & sạc</strong><p>{state.bookings.filter(b => b.status === 'BOOKED' || b.status === 'IN_USE').length} phiên đang đặt / sử dụng.</p><Link to="/pv/sessions" onClick={() => setNotifications(false)}>Xem các phiên của tôi →</Link></section>}</div>}<div className="portal-user"><span className="portal-user__avatar">{technician ? technicianName.split(' ').slice(-2).map(word => word[0]).join('') : 'MA'}</span><strong>{technician ? technicianName : 'Minh Anh'}</strong></div></div>
    </header>
    <Outlet />
    <footer className="portal-demo"><span>Dữ liệu mô phỏng · {time(state.now)}</span>{!technician && <Link to="/incidents/new">Báo cáo sự cố</Link>}<Link to="/setup">Đổi cổng / điều khiển demo</Link></footer>
  </div>;
}
