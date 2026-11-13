import type { CSSProperties } from 'react';
import type { VehicleStatusCounts } from '../types';

const SEGMENTS: { key: keyof VehicleStatusCounts; label: string }[] = [
  { key: 'ready', label: 'Sẵn sàng' },
  { key: 'inUse', label: 'Đang dùng' },
  { key: 'charging', label: 'Đang sạc' },
  { key: 'pendingCheck', label: 'Chờ kiểm tra' },
  { key: 'faulty', label: 'Hỏng / báo lỗi' },
];

export default function VehicleStatusBar({ counts }: { counts: VehicleStatusCounts }) {
  return (
    <section className="vehicle-status">
      <div className="vehicle-status__header">
        <h2 className="vehicle-status__title">Phương tiện theo trạng thái</h2>
        <ul className="vehicle-status__legend">
          {SEGMENTS.map((segment) => (
            <li key={segment.key}>
              <span
                className={`vehicle-status__legend-marker vehicle-status__legend-marker--${segment.key}`}
              />
              {segment.label} {counts[segment.key]}
            </li>
          ))}
        </ul>
      </div>
      <div
        className="vehicle-status__track"
        role="img"
        aria-label="Phân bố phương tiện theo trạng thái"
      >
        {SEGMENTS.map((segment) => (
          <div
            key={segment.key}
            className={`vehicle-status__segment vehicle-status__segment--${segment.key}`}
            style={{ '--vehicle-status-count': counts[segment.key] } as CSSProperties}
          />
        ))}
      </div>
    </section>
  );
}
