import { type ImbalanceAlert } from '../types';
import '../rb.css';

interface Props {
  alert: ImbalanceAlert;
  active?: boolean;
  /** Chỉ thẻ có đề xuất mới bấm được: chọn thẻ để hiện đề xuất ở banner. */
  onSelect?: (alert: ImbalanceAlert) => void;
}

const PILL: Record<ImbalanceAlert['type'], string> = {
  SHORTAGE: 'rebalance__pill--red',
  SURPLUS: 'rebalance__pill--amber',
  STABLE: 'rebalance__pill--green',
};

export default function ImbalanceAlertCard({ alert, active, onSelect }: Props) {
  const clickable = !!alert.recommendation && !!onSelect;
  const body = (
    <>
      <span className="rebalance__alert-name">{alert.hubName}</span>
      <span className={`rebalance__pill ${PILL[alert.type]}`}>{alert.message}</span>
      {alert.detail && <span className="rebalance__alert-detail">{alert.detail}</span>}
    </>
  );
  if (!clickable) return <div className="rebalance__alert">{body}</div>;
  return (
    <button type="button" className={`rebalance__alert rebalance__alert--click${active ? ' is-active' : ''}`} onClick={() => onSelect!(alert)} aria-pressed={active}>
      {body}
    </button>
  );
}
