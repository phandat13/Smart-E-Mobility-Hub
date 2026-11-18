import { NavLink, Outlet } from 'react-router'
import './shell.css'

/**
 * Shell tạm cho FE2 chạy được độc lập. FE1 phụ trách shell dùng chung (B.6):
 * khi có bản của FE1 thì thay file này, giữ nguyên các route con.
 */
const NAV = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/reserve', label: 'Đặt chỗ', end: false },
  { to: '/trips', label: 'Chuyến đi', end: false },
  { to: '/account', label: 'Tài khoản', end: false },
]

export function AppShell() {
  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-brand">
          <span className="shell-logo">U</span>
          <div>
            <strong>UniGo</strong>
            <div className="shell-tagline">Di chuyển xanh · ĐHQG</div>
          </div>
        </div>
        <nav className="shell-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shell-user">
          <strong>Nguyễn Minh Anh</strong>
          <span className="muted">MSSV 2410717</span>
        </div>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="muted">Màn hình này thuộc module khác hoặc chưa làm.</p>
    </div>
  )
}
