import { Link } from 'react-router-dom';
import type { AlertItem, AlertKind } from '../types';

const ICON: Record<AlertKind, { glyph: string; bg: string; color: string }> = {
  overload: { glyph: '▲', bg: 'var(--red-soft)', color: 'var(--red-text)' },
  imbalance: { glyph: '⇄', bg: 'var(--amber-soft)', color: 'var(--amber-text)' },
  vehicleFault: { glyph: '!', bg: 'var(--red-soft)', color: 'var(--red-text)' },
  disconnected: { glyph: '⦸', bg: 'var(--slate-soft)', color: 'var(--muted)' },
};

export default function AlertPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <aside className="card alert-card">
      <h2 className="card__title">Cảnh báo đang mở ({alerts.length})</h2>
      <p className="card__sub">Do hệ thống tự động sinh ra</p>
      {alerts.length === 0 && <div className="empty">Không có cảnh báo.</div>}
      <ul className="alert-list">
        {alerts.map((a) => {
          const icon = ICON[a.kind];
          return (
            <li key={a.id} className="alert">
              <span className="alert__icon" style={{ background: icon.bg, color: icon.color }}>{icon.glyph}</span>
              <div className="alert__body">
                <div className="alert__title">{a.title}</div>
                <div className="alert__detail">{a.detail}</div>
                <Link to={a.action.to} className={`btn btn--${a.action.variant}`}>{a.action.label}</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
