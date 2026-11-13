import { type TransferOrderResponse } from '../types';
import '../rb.css';

interface Props {
  title: string;
  tone: 'amber' | 'blue' | 'green';
  orders: TransferOrderResponse[];
  onOpen: (order: TransferOrderResponse) => void;
}

const clock = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '';

const COUNT_CLASS = { amber: ' rebalance__count--amber', blue: '', green: ' rebalance__count--green' } as const;

export default function DispatchColumn({ title, tone, orders, onOpen }: Props) {
  return (
    <section className="rebalance__col" aria-label={title}>
      <div className="rebalance__col-head">
        <h3 className="rebalance__col-title">{title}</h3>
        <span className={`rebalance__count${COUNT_CLASS[tone]}`}>{String(orders.length).padStart(2, '0')}</span>
      </div>
      {orders.length === 0 ? (
        <div className="rebalance__col-empty">Không có lệnh</div>
      ) : (
        <div className="rebalance__col-list" role="list">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

function OrderCard({ order, onOpen }: { order: TransferOrderResponse; onOpen: (o: TransferOrderResponse) => void }) {
  const total = order.items.filter((i) => i.status !== 'REMOVED').length;
  const driverText = order.driverName ? ` · ${order.teamName ?? 'Đội'} · ${order.driverName}` : '';

  let meta = `${total} xe · tạo ${clock(order.createdAt)}`;
  let pill: { cls: string; text: string };
  switch (order.status) {
    case 'PENDING':
      pill = { cls: 'rebalance__pill--amber', text: 'Hàng đợi – chờ tài xế rảnh' };
      break;
    case 'ASSIGNED':
      meta = `${total} xe${driverText}`;
      pill = { cls: '', text: 'Chờ thực hiện' };
      break;
    case 'IN_PROGRESS':
      meta = `${total} xe${driverText}`;
      pill = { cls: 'rebalance__pill--blue', text: `Đang vận chuyển${order.startedAt ? ` · ${clock(order.startedAt)}` : ''}` };
      break;
    case 'COMPLETED':
      meta = `${total} xe · hoàn tất ${clock(order.completedAt ?? order.createdAt)}`;
      pill = order.verified ? { cls: 'rebalance__pill--green', text: 'Đã đưa về Sẵn sàng' } : { cls: 'rebalance__pill--green', text: 'Xe chờ xác minh tại Hub đích' };
      break;
    default:
      pill = { cls: 'rebalance__pill--red', text: 'Đã hủy' };
  }

  return (
    <div className="rebalance__card" role="listitem" tabIndex={0} onClick={() => onOpen(order)} onKeyDown={(e) => e.key === 'Enter' && onOpen(order)}>
      <span className="rebalance__card-code">#{order.code}</span>
      <span className="rebalance__card-route">{order.sourceHubName} → {order.targetHubName}</span>
      <span className="rebalance__card-meta">{meta}</span>
      <div className="rebalance__card-foot">
        <span className={`rebalance__pill ${pill.cls}`}>{pill.text}</span>
        <button type="button" className="rebalance__link" onClick={(e) => { e.stopPropagation(); onOpen(order); }}>Chi tiết ›</button>
      </div>
    </div>
  );
}
