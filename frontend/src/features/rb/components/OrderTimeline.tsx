import { type TransferOrderResponse } from '../types';
import './driver.css';

const clock = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '';

type StepState = 'done' | 'current' | 'todo';

/** Dòng thời gian 4 bước của lệnh, suy ra từ trạng thái lệnh và số xe đã quét. */
export default function OrderTimeline({ order }: { order: TransferOrderResponse }) {
  const items = order.items.filter((i) => i.status !== 'REMOVED');
  const total = items.length;
  const scanned = items.filter((i) => i.status === 'LOADED' || i.status === 'DELIVERED').length;
  const allScanned = total > 0 && scanned === total;
  const completed = order.status === 'COMPLETED';

  const steps: Array<{ title: string; desc: string; state: StepState }> = [
    { title: 'Nhận lệnh', desc: clock(order.createdAt), state: 'done' },
    {
      title: 'Gom xe tại Hub nguồn',
      desc: `Đã quét ${scanned}/${total} xe${allScanned && order.startedAt ? ` · ${clock(order.startedAt)}` : ''}`,
      state: allScanned || completed ? 'done' : 'current',
    },
    {
      title: 'Bắt đầu vận chuyển',
      desc: allScanned || completed ? `${order.startedAt ? `${clock(order.startedAt)} · ` : ''}số xe Hub nguồn đã cập nhật` : 'Sau khi quét đủ xe tại Hub nguồn',
      state: allScanned || completed ? 'done' : 'todo',
    },
    {
      title: 'Bàn giao tại Hub đích',
      desc: completed ? `Hoàn tất${order.completedAt ? ` · ${clock(order.completedAt)}` : ''}` : 'Đỗ xe vào vị trí trống & quét mã từng xe',
      state: completed ? 'done' : allScanned ? 'current' : 'todo',
    },
  ];

  return (
    <ol className="rebalance__steps" aria-label="Các bước thực hiện lệnh">
      {steps.map((s, i) => (
        <li key={s.title} className={`rebalance__step rebalance__step--${s.state}`}>
          <span className="rebalance__step-dot" aria-hidden="true">{s.state === 'done' ? '✓' : i + 1}</span>
          <div>
            <div className="rebalance__step-title">{s.title}</div>
            <div className="rebalance__step-desc">{s.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
