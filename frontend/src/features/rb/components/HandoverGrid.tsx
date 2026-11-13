import { useRef, useState, type FormEvent } from 'react';
import { vehicleLabel, type TransferOrderResponse } from '../types';
import './driver.css';

interface Props {
  order: TransferOrderResponse;
  /** Gọi API quét xe; ném lỗi (có code/message) nếu thất bại. */
  onScan: (vehicleId: number) => Promise<void>;
  onComplete: () => Promise<void>;
  busy: boolean;
}

const digits = (s: string) => s.replace(/\D/g, '').replace(/^0+/, '');

export default function HandoverGrid({ order, onScan, onComplete, busy }: Props) {
  const [scanOpen, setScanOpen] = useState(false);
  const [code, setCode] = useState('');
  const [scanError, setScanError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const items = order.items.filter((i) => i.status !== 'REMOVED');
  const total = items.length;
  const scanned = items.filter((i) => i.status === 'LOADED' || i.status === 'DELIVERED').length;
  const canComplete = total > 0 && scanned === total;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;
    const d = digits(raw);
    const item = items.find((i) => vehicleLabel(i).toLowerCase() === raw.toLowerCase() || (d !== '' && (digits(vehicleLabel(i)) === d || String(i.vehicleId) === d)));
    if (!item) return setScanError('Mã xe không thuộc lệnh này');
    if (item.status !== 'LOCKED') return setScanError('Xe này đã được quét');
    setScanError('');
    try {
      await onScan(item.vehicleId);
      setCode('');
      inputRef.current?.focus();
    } catch (err: unknown) {
      const { code: c, message } = err as { code?: string; message?: string };
      setScanError(c === 'VEHICLE_NOT_IN_ORDER' ? 'Xe không thuộc lệnh này' : c === 'CONFLICT' ? 'Xe đã được quét hoặc không thể quét' : message || 'Quét thất bại, thử lại');
    }
  };

  return (
    <section aria-label={`Bàn giao tại ${order.targetHubName}`}>
      <div className="rebalance__hand-head">
        <h3 className="rebalance__hand-title">Bàn giao tại {order.targetHubName}</h3>
        <span className="rebalance__hand-count">Đã quét {scanned} / {total} xe</span>
      </div>
      <div className="rebalance__hand-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={scanned}>
        <span style={{ width: `${total ? (scanned / total) * 100 : 0}%` }} />
      </div>

      <ul className="rebalance__hand-grid">
        {items.map((i) => {
          const ok = i.status !== 'LOCKED';
          return (
            <li key={i.vehicleId} className={`rebalance__cell${ok ? ' is-ok' : ''}`}>
              <span><span aria-hidden="true">{ok ? '✓' : '○'}</span> {vehicleLabel(i)}</span>
              {ok && i.slot && <span className="rebalance__cell-slot">{i.slot}</span>}
              <span className="sr-only">{ok ? 'đã quét' : 'chưa quét'}</span>
            </li>
          );
        })}
      </ul>

      {scanOpen && (
        <form className="rebalance__scan" onSubmit={submit}>
          <label className="sr-only" htmlFor="rebalance__scan-input">Mã xe (nhập thay cho quét QR)</label>
          <input id="rebalance__scan-input" ref={inputRef} className="rebalance__input" value={code} autoFocus placeholder="Nhập mã xe, ví dụ UG-132 hoặc 132, rồi Enter" disabled={busy}
            onChange={(e) => { setCode(e.target.value); setScanError(''); }} />
          <button type="submit" className="rebalance__btn" disabled={busy || !code.trim()}>Quét</button>
        </form>
      )}
      {scanError && <p className="rebalance__scan-err" role="alert">{scanError}</p>}

      <div className="rebalance__hand-actions">
        <button type="button" className="rebalance__btn rebalance__hand-big" onClick={() => setScanOpen((o) => !o)} disabled={busy || canComplete}>
          ▣ Quét mã xe bàn giao
        </button>
        <button type="button" className="rebalance__btn rebalance__hand-big rebalance__hand-done" onClick={() => void onComplete()} disabled={busy || !canComplete}>
          Xác nhận hoàn tất bàn giao
        </button>
        <button type="button" className="rebalance__btn rebalance__btn--ghost rebalance__hand-big" disabled title="Chưa có API backend (đổi Hub đích)">
          ⇄ Đổi Hub đích (Hub đích hết chỗ)
        </button>
        <button type="button" className="rebalance__btn rebalance__btn--danger rebalance__hand-big" disabled title="Chưa có API backend, thuộc luồng MT01">
          ⚠ Báo xe hỏng – loại khỏi lệnh (MT01)
        </button>
      </div>
      <p className="rebalance__hint">Sau khi hoàn tất, các xe chuyển "Chờ kiểm tra" và chỉ về "Sẵn sàng" khi hệ thống xác minh vị trí, mức pin và dữ liệu cảm biến tại Hub đích.</p>
    </section>
  );
}
