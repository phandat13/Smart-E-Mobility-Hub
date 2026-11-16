import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoState } from '../mocks/store';
import { date } from '../shared/format';

// Demo operator persona from the Figma design; replace with the shared auth module during integration.
const CURRENT_USER = { name: 'Lê Thu Trang', role: 'Đơn vị vận hành', initials: 'VH' };

export default function Topbar() {
  const state = useDemoState(); const navigate = useNavigate(); const [query, setQuery] = useState('');
  // Global search currently covers the MT02 incident queue (ticket, vehicle or content).
  function submit(event: FormEvent) { event.preventDefault(); navigate(`/maintenance?q=${encodeURIComponent(query.trim())}`); }
  return (
    <header className="topbar">
      <form className="topbar__search" role="search" onSubmit={submit}>
        <span aria-hidden>🔍</span>
        <input aria-label="Tìm kiếm mã xe, Hub, lệnh, phiếu sự cố" placeholder="Tìm kiếm mã xe, Hub, lệnh, phiếu sự cố..." value={query} onChange={e => setQuery(e.target.value)} />
      </form>
      <div className="topbar__spacer" />
      <div className="topbar__date">📅 Hôm nay, {date(state.now)}</div>
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
