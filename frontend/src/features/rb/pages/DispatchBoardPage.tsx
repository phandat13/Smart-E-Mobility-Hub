import { useCallback, useEffect, useState } from 'react';
import { getImbalanceAlertsApi, getTransferOrdersApi } from '../api/transferApi';
import { type ImbalanceAlert, type TransferOrderResponse } from '../types';
import ImbalanceAlertCard from '../components/ImbalanceAlertCard';
import SuggestionBanner from '../components/SuggestionBanner';
import DispatchColumn from '../components/DispatchColumn';
import CreateOrderModal, { type CreateOrderPrefill } from '../components/CreateOrderModal';
import OrderDetailModal from '../components/OrderDetailModal';
import '../rb.css';

type Toast = { tone: 'ok' | 'warn' | 'err'; text: string } | null;

/** RB01 · Cảnh báo mất cân đối & theo dõi lệnh điều chuyển (OPERATOR). */
export default function DispatchBoardPage() {
  const [alerts, setAlerts] = useState<ImbalanceAlert[]>([]);
  const [orders, setOrders] = useState<TransferOrderResponse[]>([]);
  const [activeAlertId, setActiveAlertId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<CreateOrderPrefill | null>(null);
  const [detail, setDetail] = useState<TransferOrderResponse | null>(null);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const [a, o] = await Promise.all([getImbalanceAlertsApi(), getTransferOrdersApi({ page: 0, size: 100 })]);
      setAlerts(a);
      setOrders(o.items);
      setActiveAlertId((cur) => cur ?? a.find((x) => x.recommendation && x.type === 'SHORTAGE')?.id ?? a.find((x) => x.recommendation)?.id ?? null);
      setToast((t) => (t?.tone === 'err' ? null : t));
    } catch (err: unknown) {
      setToast({ tone: 'err', text: (err as { message?: string }).message || 'Không thể tải dữ liệu điều phối' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const activeAlert = alerts.find((a) => a.id === activeAlertId) ?? null;

  const openCreate = (alert: ImbalanceAlert) => {
    const r = alert.recommendation;
    if (!r) return;
    setPrefill({ sourceHubId: r.fromHubId, targetHubId: r.toHubId, vehicleCount: r.suggestedVehicleCount, alertId: alert.id, detectedAt: alert.detectedAt });
    setCreateOpen(true);
  };

  const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const pending = orders.filter((o) => o.status === 'PENDING' || o.status === 'ASSIGNED');
  const running = orders.filter((o) => o.status === 'IN_PROGRESS');
  const done = orders.filter((o) => o.status === 'COMPLETED');

  if (loading) return <div className="rebalance rebalance__loading">Đang tải bảng điều phối…</div>;

  return (
    <div className="rebalance">
      <h1 className="rebalance__title">Điều chuyển xe liên Hub</h1>
      <p className="rebalance__sub">Xử lý cảnh báo mất cân đối và theo dõi các lệnh điều chuyển · Hôm nay, {today}</p>

      {toast && (
        <div className={`rebalance__toast rebalance__toast--${toast.tone}`} role={toast.tone === 'err' ? 'alert' : 'status'}>
          <span>{toast.text}</span>
          <button type="button" onClick={() => (toast.tone === 'err' ? void load(true) : setToast(null))}>{toast.tone === 'err' ? 'Thử lại' : 'Đóng'}</button>
        </div>
      )}

      <section className="rebalance__panel" aria-labelledby="rebalance__alerts-title">
        <h2 id="rebalance__alerts-title" className="rebalance__panel-title">Cảnh báo mất cân đối</h2>
        <p className="rebalance__panel-sub">Hệ thống tự động phát hiện khi chênh lệch tỉ lệ xe/chỗ trống vượt ngưỡng cấu hình</p>
        {alerts.length === 0 ? (
          <p className="rebalance__col-empty">Không có cảnh báo mất cân đối</p>
        ) : (
          <div className="rebalance__alerts">
            {alerts.map((a) => (
              <ImbalanceAlertCard key={a.id} alert={a} active={a.id === activeAlertId} onSelect={(x) => setActiveAlertId(x.id)} />
            ))}
          </div>
        )}
        <SuggestionBanner alert={activeAlert} onCreateOrder={openCreate} />
      </section>

      <div className="rebalance__kanban">
        <DispatchColumn title="Chờ thực hiện" tone="amber" orders={pending} onOpen={setDetail} />
        <DispatchColumn title="Đang vận chuyển" tone="blue" orders={running} onOpen={setDetail} />
        <DispatchColumn title="Hoàn tất – chờ kiểm tra" tone="green" orders={done} onOpen={setDetail} />
      </div>

      <CreateOrderModal
        isOpen={createOpen}
        prefill={prefill}
        onClose={() => setCreateOpen(false)}
        onSuccess={(text, tone) => {
          setToast({ tone, text });
          void load();
        }}
      />

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onChanged={(text) => {
            setToast({ tone: 'ok', text });
            void load();
          }}
        />
      )}
    </div>
  );
}
