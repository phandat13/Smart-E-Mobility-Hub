import { useNavigate } from 'react-router-dom';
import { loadTone } from '../constants';
import type { HubRow } from '../types';

const BAR_COLOR = { danger: 'var(--red-text)', warning: 'var(--amber)', success: 'var(--green)' } as const;

function Occupancy({ hub }: { hub: HubRow }) {
  if (!hub.online || hub.occupancyPct === null) return <span className="muted-text">Mất kết nối</span>;
  const color = BAR_COLOR[loadTone(hub.occupancyPct) as keyof typeof BAR_COLOR];
  return (
    <span className="progress">
      <span className="progress__track">
        <span className="progress__value" style={{ width: `${Math.min(hub.occupancyPct, 100)}%`, background: color }} />
      </span>
      <span className="progress__pct" style={{ color }}>{hub.occupancyPct}%</span>
    </span>
  );
}

export default function HubTable({ hubs }: { hubs: HubRow[] }) {
  const navigate = useNavigate();
  return (
    <section className="card hub-card">
      <h2 className="card__title">Danh sách Hub</h2>
      <p className="card__sub">Mã màu theo mức tải · chọn một Hub để xem chi tiết (MO02)</p>

      <div className="hub-grid hub-grid--head">
        <span>HUB</span><span>LẤP ĐẦY CHỖ ĐỖ</span><span>CỔNG SẠC</span><span>XE SẴN SÀNG</span><span>CẢNH BÁO</span>
      </div>

      {hubs.length === 0 && <div className="empty">Không có Hub phù hợp với bộ lọc.</div>}

      {hubs.map((h) => (
        <button key={h.id} type="button" className="hub-grid hub-row" onClick={() => navigate(`/hubs/${h.id}`)}>
          <span>
            <span className="hub-row__name">{h.name}</span>
            <span className="hub-row__sub">{h.online ? h.typeLabel : `Cập nhật cuối ${h.lastUpdate ?? '—'}`}</span>
          </span>
          <Occupancy hub={h} />
          <span className="cell">{h.online && h.chargersTotal !== null ? `${h.chargersUsed}/${h.chargersTotal}` : '—'}</span>
          <span className="cell">{h.online && h.vehiclesReady !== null ? h.vehiclesReady : '—'}</span>
          <span className="cell">
            {h.badges.length === 0 ? '—' : h.badges.map((b) => <span key={b.label} className={`badge badge--${b.tone}`}>{b.label}</span>)}
          </span>
        </button>
      ))}
    </section>
  );
}
