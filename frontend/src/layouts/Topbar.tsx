import { useState } from 'react';

// TODO: thay bằng thông tin người dùng đăng nhập (AC03) khi có auth.
const CURRENT_USER = { name: 'Lê Thu Trang', role: 'Đơn vị vận hành', initials: 'VH' };

export default function Topbar() {
  const [query, setQuery] = useState('');
  const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <header className="topbar">
      <label className="topbar__search">
        <span aria-hidden>🔍</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm mã xe, Hub, lệnh, phiếu sự cố..." />
      </label>
      <div className="topbar__spacer" />
      <div className="topbar__date">📅 Hôm nay, {today}</div>
      <div className="topbar__user">
        <div className="topbar__avatar">{CURRENT_USER.initials}</div>
        <div>
          <div className="topbar__name">{CURRENT_USER.name}</div>
          <div className="topbar__role">{CURRENT_USER.role}</div>
        </div>
      </div>
    </header>
  );
}
