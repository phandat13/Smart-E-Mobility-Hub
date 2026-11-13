import { icons } from '../assets/icons';
import { useState } from 'react';

import { mockCurrentUser } from '../mocks/currentUser';

export default function Topbar() {
  const [query, setQuery] = useState('');
  const today = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return (
    <header className="topbar">
      <label className="topbar__search">
        <span aria-hidden>{icons.search}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm mã xe, Hub, lệnh, phiếu sự cố..."
        />
      </label>
      <div className="topbar__spacer" />
      <div className="topbar__date">
        {icons.calendar} Hôm nay, {today}
      </div>
      <div className="topbar__user">
        <div className="topbar__avatar">{mockCurrentUser.initials}</div>
        <div>
          <div className="topbar__name">{mockCurrentUser.name}</div>
          <div className="topbar__role">{mockCurrentUser.role}</div>
        </div>
      </div>
    </header>
  );
}
