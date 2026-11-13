import { useState } from 'react';
import { cancelTransferOrderApi, removeVehicleFromOrderApi } from '../api/transferApi';
import { TRANSFER_STATUS_LABELS, ITEM_STATUS_LABELS, vehicleLabel, type TransferOrderResponse } from '../types';
import '../rb.css';
import { CloseIcon } from '../../../components/icons';

interface Props {
  order: TransferOrderResponse;
  onClose: () => void;
  /** Gọi sau khi gỡ xe / hủy lệnh để bảng điều phối tải lại. */
  onChanged: (message: string) => void;
}

const dt = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

export default function OrderDetailModal({ order, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = order.status === 'PENDING' || order.status === 'ASSIGNED';
  const items = order.items.filter((i) => i.status !== 'REMOVED');
  const scanned = items.filter((i) => i.status === 'LOADED' || i.status === 'DELIVERED').length;

  const run = async (fn: () => Promise<void>, message: string) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged(message);
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Thao tác thất bại');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (!window.confirm(`Hủy lệnh ${order.code}? Các xe sẽ được mở khóa.`)) return;
    void run(() => cancelTransferOrderApi(order.id), `Đã hủy lệnh ${order.code}`);
  };

  const remove = (vehicleId: number, label: string) => {
    if (!window.confirm(`Gỡ xe ${label} khỏi lệnh ${order.code}?`)) return;
    void run(() => removeVehicleFromOrderApi(order.id, vehicleId), `Đã gỡ xe ${label} khỏi lệnh ${order.code}`);
  };

  return (
    <div className="rebalance__overlay" role="dialog" aria-modal="true" aria-labelledby="rebalance__detail-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rebalance__modal rebalance__modal--md">
        <div className="rebalance__modal-head">
          <div>
            <h2 id="rebalance__detail-title" className="rebalance__modal-title">Lệnh #{order.code}</h2>
            <p className="rebalance__modal-sub">{TRANSFER_STATUS_LABELS[order.status]}</p>
          </div>
          <button type="button" className="rebalance__x" onClick={onClose} aria-label="Đóng"><CloseIcon size={14} /></button>
        </div>

        <div className="rebalance__route">
          <span>{order.sourceHubName}</span>
          <span className="rebalance__route-arrow" aria-hidden="true">→</span>
          <span>{order.targetHubName}</span>
        </div>

        <dl className="rebalance__dl">
          <div><dt>Tài xế</dt><dd>{order.driverName ?? 'Chưa phân công'}</dd></div>
          <div><dt>Đội</dt><dd>{order.teamName ?? '—'}</dd></div>
          <div><dt>SĐT</dt><dd>{order.driverPhone ?? '—'}</dd></div>
          <div><dt>Tạo lúc</dt><dd>{dt(order.createdAt)}</dd></div>
          <div><dt>Tiến độ quét</dt><dd>{scanned} / {items.length} xe</dd></div>
        </dl>
        {order.note && <p className="rebalance__hint">Ghi chú: {order.note}</p>}

        {error && <div className="rebalance__error" role="alert">{error}</div>}

        <div className="rebalance__table-wrap">
          <table className="rebalance__table">
            <thead>
              <tr><th>Mã xe</th><th>Trạng thái</th>{editable && <th />}</tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.vehicleId}>
                  <td><strong>{vehicleLabel(i)}</strong></td>
                  <td>{ITEM_STATUS_LABELS[i.status]}</td>
                  {editable && (
                    <td>
                      <button type="button" className="rebalance__link" disabled={busy || items.length <= 1} onClick={() => remove(i.vehicleId, vehicleLabel(i))}>Gỡ xe</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rebalance__modal-foot">
          {editable && (
            <button type="button" className="rebalance__btn rebalance__btn--danger" onClick={cancel} disabled={busy}>Hủy lệnh</button>
          )}
          <button type="button" className="rebalance__btn rebalance__btn--ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
