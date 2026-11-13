import { useCallback, useEffect, useState } from 'react';
import { getDriverOrdersApi, getDriverHistoryApi, loadVehicleApi, completeTransferApi } from '../api/transferApi';
import { TRANSFER_STATUS_LABELS, type TransferOrderResponse } from '../types';
import OrderTimeline from '../components/OrderTimeline';
import HandoverGrid from '../components/HandoverGrid';
import '../rb.css';
import '../components/driver.css';

export type DriverView = 'orders' | 'history' | 'incidents';

const clock = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '';

const STATUS_PILL: Record<string, string> = {
  ASSIGNED: '',
  PENDING: '',
  IN_PROGRESS: 'rebalance__pill--blue',
  COMPLETED: 'rebalance__pill--green',
  CANCELLED: 'rebalance__pill--red',
};
const pillText = (s: TransferOrderResponse['status']) => (s === 'ASSIGNED' ? 'Chờ thực hiện' : TRANSFER_STATUS_LABELS[s]);

/** RB02 · App tài xế: Lệnh được giao / Lịch sử lệnh / Báo cáo sự cố (thanh tab nằm ở InternalDriverLayout). */
export default function DriverOrdersPage({ view = 'orders' }: { view?: DriverView }) {
  if (view === 'history') return <HistoryView />;
  if (view === 'incidents') return <IncidentsView />;
  return <OrdersView />;
}

function OrdersView() {
  const [orders, setOrders] = useState<TransferOrderResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const list = await getDriverOrdersApi();
      setOrders(list);
      setSelectedId((cur) => (cur !== null && list.some((o) => o.id === cur) ? cur : list[0]?.id ?? null));
      setError('');
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Không thể tải lệnh được giao');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const scan = async (vehicleId: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      await loadVehicleApi(selected.id, vehicleId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await completeTransferApi(selected.id);
      setNotice(`Đã hoàn tất lệnh ${selected.code}. Các xe chuyển sang "Chờ kiểm tra" tại ${selected.targetHubName}.`);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Hoàn tất thất bại');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="rebalance__loading">Đang tải lệnh được giao…</div>;

  return (
    <div>
      {error && (
        <div className="rebalance__toast rebalance__toast--err" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load(true)}>Thử lại</button>
        </div>
      )}
      {notice && (
        <div className="rebalance__toast rebalance__toast--ok" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}>Đóng</button>
        </div>
      )}

      <div className="rebalance__driver">
        <aside className="rebalance__driver-list" aria-label="Lệnh được giao">
          <h2>Lệnh được giao ({orders.length})</h2>
          {orders.length === 0 ? (
            <p className="rebalance__hint">Bạn chưa có lệnh nào. Lệnh mới sẽ xuất hiện ở đây.</p>
          ) : (
            <div className="rebalance__driver-items">
              {orders.map((o) => (
                <button key={o.id} type="button" className={`rebalance__order${o.id === selectedId ? ' is-active' : ''}`} onClick={() => setSelectedId(o.id)} aria-pressed={o.id === selectedId}>
                  <span className="rebalance__order-code">#{o.code}</span>
                  <span className="rebalance__order-route">{o.sourceHubName} → {o.targetHubName}</span>
                  <span className="rebalance__order-meta">{o.items.filter((i) => i.status !== 'REMOVED').length} xe</span>
                  <span className={`rebalance__pill ${STATUS_PILL[o.status] ?? ''}`}>{o.status === 'IN_PROGRESS' ? 'Đang vận chuyển' : pillText(o.status)}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="rebalance__driver-detail" aria-label="Chi tiết lệnh">
          {!selected ? (
            <div className="rebalance__empty">
              <h3>Chưa có lệnh nào</h3>
              <p>Khi có lệnh điều chuyển mới được giao cho bạn, chi tiết sẽ hiện ở đây.</p>
            </div>
          ) : (
            <>
              <div className="rebalance__driver-head">
                <h2 className="rebalance__driver-title">Lệnh #{selected.code} · {selected.sourceHubName} → {selected.targetHubName}</h2>
                <span className={`rebalance__pill ${STATUS_PILL[selected.status] ?? ''}`}>{selected.status === 'IN_PROGRESS' ? 'Đang vận chuyển' : pillText(selected.status)}</span>
              </div>
              <p className="rebalance__driver-meta">
                {selected.items.filter((i) => i.status !== 'REMOVED').length} xe · phát lệnh {clock(selected.createdAt)} bởi Đơn vị vận hành
              </p>
              <OrderTimeline order={selected} />
              <HandoverGrid order={selected} onScan={scan} onComplete={complete} busy={busy} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function HistoryView() {
  const [rows, setRows] = useState<TransferOrderResponse[] | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    getDriverHistoryApi().then(setRows).catch((err: unknown) => setError((err as { message?: string }).message || 'Không thể tải lịch sử lệnh'));
  }, []);

  return (
    <div className="rebalance__history">
      <h2>Lịch sử lệnh</h2>
      {error && <div className="rebalance__toast rebalance__toast--err" role="alert"><span>{error}</span></div>}
      {rows === undefined && !error && <p className="rebalance__hint">Đang tải…</p>}
      {rows === null && (
        <div className="rebalance__empty">
          <h3>Chưa có dữ liệu lịch sử</h3>
          <p>Backend chưa có endpoint lịch sử lệnh của tài xế (xem plan, mục khoảng trống API). Ở chế độ mock sẽ có dữ liệu mẫu.</p>
        </div>
      )}
      {rows && rows.length === 0 && <p className="rebalance__hint">Bạn chưa hoàn tất lệnh nào.</p>}
      {rows && rows.length > 0 && (
        <table className="rebalance__table">
          <thead><tr><th>Mã lệnh</th><th>Lộ trình</th><th>Số xe</th><th>Hoàn tất</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td><strong>#{o.code}</strong></td>
                <td>{o.sourceHubName} → {o.targetHubName}</td>
                <td>{o.items.filter((i) => i.status !== 'REMOVED').length} xe</td>
                <td>{clock(o.completedAt ?? o.createdAt)}</td>
                <td><span className={`rebalance__pill ${STATUS_PILL[o.status] ?? ''}`}>{TRANSFER_STATUS_LABELS[o.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function IncidentsView() {
  return (
    <div className="rebalance__history">
      <h2>Báo cáo sự cố</h2>
      <div className="rebalance__empty">
        <h3>Báo xe hỏng thuộc luồng MT01</h3>
        <p>Khi xe hỏng trong lúc điều chuyển, tài xế báo sự cố rồi loại xe khỏi lệnh. Màn hình này do nhóm MT (TV3) phụ trách và sẽ được tích hợp sau.</p>
      </div>
    </div>
  );
}
