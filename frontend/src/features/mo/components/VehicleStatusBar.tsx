import type { VehicleStatusCounts } from '../types';

const SEGMENTS: { key: keyof VehicleStatusCounts; label: string; color: string }[] = [
  { key: 'ready', label: 'Sẵn sàng', color: 'var(--green)' },
  { key: 'inUse', label: 'Đang dùng', color: 'var(--primary)' },
  { key: 'charging', label: 'Đang sạc', color: 'var(--purple)' },
  { key: 'pendingCheck', label: 'Chờ kiểm tra', color: 'var(--amber)' },
  { key: 'faulty', label: 'Hỏng / báo lỗi', color: 'var(--red)' },
];

export default function VehicleStatusBar({ counts }: { counts: VehicleStatusCounts }) {
  return (
    <section className="status-card">
      <div className="status-card__head">
        <h2 className="status-card__title">Phương tiện theo trạng thái</h2>
        <ul className="status-card__legend">
          {SEGMENTS.map((s) => (
            <li key={s.key}>
              <span className="dot" style={{ background: s.color }} />
              {s.label} {counts[s.key]}
            </li>
          ))}
        </ul>
      </div>
      <div className="status-card__track" role="img" aria-label="Phân bố phương tiện theo trạng thái">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="status-card__seg" style={{ flexGrow: counts[s.key], background: s.color }} />
        ))}
      </div>
    </section>
  );
}
