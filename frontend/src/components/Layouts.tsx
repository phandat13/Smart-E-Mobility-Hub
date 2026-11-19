import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { NotificationView, Role } from '../api/types';
import { roleLabel, useAuth, homeFor } from '../lib/auth';
import { shortDateTime } from '../lib/format';
import { resetRealtime, subscribe } from '../lib/realtime';
import { errorText, Modal, useToast } from './ui';

function initials(name?: string) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[p.length - 2]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase();
}

export function Brand({ sub = 'DI CHUYỂN XANH · ĐHQG', name = 'UniGo' }: { sub?: string; name?: string }) {
  return (
    <div className="brand">
      <div className="brand-logo">⚡</div>
      <div><div className="brand-name">{name}</div><div className="brand-sub">{sub}</div></div>
    </div>
  );
}

function NotificationBell() {
  const [data, setData] = useState<{ items: NotificationView[]; unread: number }>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const load = () => api<{ items: NotificationView[]; unread: number }>('/api/v1/notifications').then(setData).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const off = subscribe('/user/queue/notifications', (b) => {
      const n = b as { title?: string };
      if (n?.title) toast(n.title);
      load();
    });
    return () => { clearInterval(t); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Thông báo">🔔{data.unread > 0 && <span className="badge-dot">{data.unread}</span>}</button>
      {open && (
        <div className="menu" style={{ width: 340, maxHeight: 420, overflowY: 'auto' }}>
          <div className="row between" style={{ padding: '6px 10px' }}>
            <b>Thông báo</b>
            <button className="btn link sm" onClick={async () => { await api('/api/v1/notifications/read-all', { body: {} }); load(); }}>Đánh dấu đã đọc</button>
          </div>
          {data.items.length === 0 && <div className="muted small" style={{ padding: 12 }}>Chưa có thông báo</div>}
          {data.items.map((n) => (
            <div key={n.id} style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', opacity: n.read ? .65 : 1 }}>
              <div className="bold small">{n.title}</div>
              <div className="small muted">{n.body}</div>
              <div className="tiny muted mt-8">{shortDateTime(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ dark }: { dark?: boolean }) {
  const { user, logout, switchContext } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState(false);
  if (!user) return null;
  const others = user.roles.filter((r) => r !== user.activeRole && r !== 'STUDENT');
  return (
    <div className="user-chip" onClick={() => setOpen(!open)}>
      <div className="avatar" style={dark ? { background: '#4f7cf7' } : undefined}>{initials(user.fullName)}</div>
      <div>
        <div className="name">{user.fullName}</div>
        <div className="role">{roleLabel[user.activeRole]}</div>
      </div>
      {open && (
        <div className="menu" onClick={(e) => e.stopPropagation()}>
          {user.activeRole === 'STUDENT' && <button onClick={() => { setOpen(false); nav('/account'); }}>👤 Hồ sơ cá nhân</button>}
          {others.length > 0 && <button onClick={() => { setOpen(false); setCtx(true); }}>🔁 Đổi ngữ cảnh làm việc</button>}
          <button onClick={() => { resetRealtime(); logout(); nav(user.activeRole === 'STUDENT' ? '/login' : '/internal/login'); }}>↩️ Đăng xuất</button>
        </div>
      )}
      <Modal open={ctx} onClose={() => setCtx(false)}>
        <h2>Đổi ngữ cảnh làm việc</h2>
        <p className="muted mt-8">Chỉ các vai trò đã được cấp cho tài khoản mới hiển thị. Hệ thống kiểm tra lại quyền khi chuyển.</p>
        <div className="col mt-16">
          {others.map((r: Role) => (
            <button key={r} className="choice" onClick={async (e) => {
              e.stopPropagation();
              try { const u = await switchContext(r); resetRealtime(); setCtx(false); nav(homeFor(u.activeRole)); } catch (err) { toast(errorText(err), 'error'); }
            }}><div className="t">{roleLabel[r]}</div></button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export function StudentLayout() {
  const tabs = [
    { to: '/', label: 'Trang chủ', end: true },
    { to: '/bookings', label: 'Đặt chỗ' },
    { to: '/trips', label: 'Chuyến đi' },
    { to: '/account', label: 'Tài khoản' },
  ];
  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="nav-tabs">{tabs.map((t) => <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>{t.label}</NavLink>)}</nav>
        <div className="topbar-right"><NotificationBell /><UserMenu /></div>
      </header>
      <Outlet />
    </div>
  );
}

const OPS_LINKS = [
  { to: '/ops', label: 'Tổng quan mạng lưới', code: 'MO01', end: true },
  { to: '/ops/hubs', label: 'Hub & hạ tầng', code: 'MO02–04' },
  { to: '/ops/vehicles', label: 'Danh mục xe', code: 'MO05' },
  { to: '/ops/transfers', label: 'Điều chuyển xe', code: 'RB01' },
  { to: '/ops/incidents', label: 'Sự cố & bảo trì', code: 'MT02–03' },
  { to: '/ops/charging', label: 'Lịch sạc thông minh', code: 'SC01–02' },
  { to: '/ops/simulation', label: 'Mô phỏng What-if', code: 'SI01–05' },
  { to: '/ops/reconciliation', label: 'Đối soát thiết bị', code: '2.3' },
];

export function OpsLayout() {
  const [online, setOnline] = useState<{ on: number; total: number } | null>(null);
  useEffect(() => {
    const load = () => api<{ totals: { activeHubs: number; disconnectedHubs: number } }>('/api/v1/ops/dashboard')
      .then((d) => setOnline({ on: d.totals.activeHubs - d.totals.disconnectedHubs, total: d.totals.activeHubs })).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ops-shell">
      <aside className="sidebar">
        <Brand name="UniGo Vận hành" sub="ĐƠN VỊ VẬN HÀNH · ĐHQG" />
        {OPS_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <span className="lbl">{l.label}</span><span className="code">{l.code}</span>
          </NavLink>
        ))}
        <div className="side-foot">
          <b>● Dữ liệu IoT đồng bộ</b>
          Chu kỳ ≤ 30 giây · {online ? `${online.on}/${online.total} Hub online` : '…'}
        </div>
      </aside>
      <div className="ops-main">
        <header className="ops-top">
          <div className="search"><input placeholder="Tìm kiếm mã xe, Hub, lệnh, phiếu sự cố…" /></div>
          <div className="spacer" />
          <span className="date-chip">📅 Hôm nay, {new Date().toLocaleDateString('vi-VN')}</span>
          <NotificationBell />
          <UserMenu />
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export function InternalLayout({ title, tabs }: { title: string; tabs: { to: string; label: string; end?: boolean }[] }) {
  return (
    <div className="app-shell">
      <header className="topbar dark">
        <Brand name="UniGo Nội bộ" sub={title} />
        <nav className="nav-tabs">{tabs.map((t) => <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>{t.label}</NavLink>)}</nav>
        <div className="topbar-right"><NotificationBell /><UserMenu dark /></div>
      </header>
      <Outlet />
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, right }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-head">
      <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
      {right && <div className="row wrap">{right}</div>}
    </div>
  );
}
