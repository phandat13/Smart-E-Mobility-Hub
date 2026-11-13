import { icons } from '../../../assets/icons';
import { Link } from 'react-router-dom';
import type { AlertItem, AlertKind } from '../types';

const ALERT_ICONS: Record<AlertKind, string> = {
  overload: icons.alert,
  imbalance: icons.transfer,
  vehicleFault: '!',
  disconnected: icons.disconnected,
};

export default function AlertPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <aside className="hub-panel hub-alert-panel">
      <h2 className="hub-panel__title">Cảnh báo đang mở ({alerts.length})</h2>
      <p className="hub-panel__subtitle">Do hệ thống tự động sinh ra</p>
      {alerts.length === 0 && <div className="hub-empty-state">Không có cảnh báo.</div>}
      <ul className="hub-alert-list">
        {alerts.map((alert) => {
          const icon = ALERT_ICONS[alert.kind];
          return (
            <li key={alert.id} className="hub-alert">
              <span className={`hub-alert__icon hub-alert__icon--${alert.kind}`}>{icon}</span>
              <div className="hub-alert__body">
                <div className="hub-alert__title">{alert.title}</div>
                <div className="hub-alert__detail">{alert.detail}</div>
                <Link
                  to={alert.action.to}
                  className={`hub-action hub-action--${alert.action.variant}`}
                >
                  {alert.action.label}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
