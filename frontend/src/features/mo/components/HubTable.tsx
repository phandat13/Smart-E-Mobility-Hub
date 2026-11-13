import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadTone } from '../constants';
import type { HubRow } from '../types';

function Occupancy({ hub }: { hub: HubRow }) {
  if (!hub.online || hub.occupancyPct === null)
    return <span className="hub-overview-table__offline">Mất kết nối</span>;
  return (
    <span className={`hub-occupancy hub-occupancy--${loadTone(hub.occupancyPct)}`}>
      <span className="hub-occupancy__track">
        <span
          className="hub-occupancy__fill"
          style={
            { '--hub-occupancy-width': `${Math.min(hub.occupancyPct, 100)}%` } as CSSProperties
          }
        />
      </span>
      <span className="hub-occupancy__percentage">{hub.occupancyPct}%</span>
    </span>
  );
}

export default function HubTable({ hubs }: { hubs: HubRow[] }) {
  const navigate = useNavigate();
  return (
    <section className="hub-panel hub-overview-table">
      <h2 className="hub-panel__title">Danh sách Hub</h2>
      <p className="hub-panel__subtitle">
        Mã màu theo mức tải · chọn một Hub để xem chi tiết (MO02)
      </p>

      <div className="hub-overview-table__grid hub-overview-table__grid--header">
        <span>HUB</span>
        <span>LẤP ĐẦY CHỖ ĐỖ</span>
        <span>CỔNG SẠC</span>
        <span>XE SẴN SÀNG</span>
        <span>CẢNH BÁO</span>
      </div>

      {hubs.length === 0 && <div className="hub-empty-state">Không có Hub phù hợp với bộ lọc.</div>}

      {hubs.map((hub) => (
        <button
          key={hub.id}
          type="button"
          className="hub-overview-table__grid hub-overview-table__row"
          onClick={() => navigate(`/hubs/${hub.id}`)}
        >
          <span>
            <span className="hub-overview-table__name">{hub.name}</span>
            <span className="hub-overview-table__subtitle">
              {hub.online ? hub.typeLabel : `Cập nhật cuối ${hub.lastUpdate ?? '—'}`}
            </span>
          </span>
          <Occupancy hub={hub} />
          <span className="hub-overview-table__cell">
            {hub.online && hub.chargersTotal !== null
              ? `${hub.chargersUsed}/${hub.chargersTotal}`
              : '—'}
          </span>
          <span className="hub-overview-table__cell">
            {hub.online && hub.vehiclesReady !== null ? hub.vehiclesReady : '—'}
          </span>
          <span className="hub-overview-table__cell">
            {hub.badges.length === 0
              ? '—'
              : hub.badges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`hub-alert-badge hub-alert-badge--${badge.tone}`}
                  >
                    {badge.label}
                  </span>
                ))}
          </span>
        </button>
      ))}
    </section>
  );
}
