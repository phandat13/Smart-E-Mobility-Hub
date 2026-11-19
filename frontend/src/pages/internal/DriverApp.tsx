import { useState } from 'react';
import { api } from '../../api/client';
import type { SearchResult, TransferOrderView } from '../../api/types';
import { Battery, Empty, Field, Loading, Modal, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { shortDateTime, time } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

/** RB02 – Ứng dụng tài xế: bốc xe, vận chuyển, giao xe theo từng xe (góp ý #9). */
export function DriverOrdersPage() {
  const { data, reload } = useLoad(() => api<TransferOrderView[]>('/api/v1/driver/orders'), [], 15000);
  const [showDone, setShowDone] = useState(false);
  if (!data) return <Loading />;
  const open = data.filter((o) => !['COMPLETED', 'COMPLETED_WITH_ISSUES', 'CANCELLED'].includes(o.status));
  const done = data.filter((o) => !open.includes(o));
  return (
    <div className="mobile-shell">
      <h1>Lệnh điều chuyển của tôi</h1>
      <p className="sub mb-16">Quét mã từng xe khi bốc lên và khi giao tại Hub đích.</p>
      {open.length === 0 ? <div className="card"><Empty icon="🚚" title="Chưa có lệnh được phân công" /></div> : open.map((o) => <DriverOrder key={o.id} o={o} onChanged={reload} />)}
      {done.length > 0 && <button className="btn link mt-16" onClick={() => setShowDone(!showDone)}>{showDone ? 'Ẩn' : 'Xem'} {done.length} lệnh đã kết thúc</button>}
      {showDone && done.map((o) => (
        <div key={o.id} className="order-card mt-8"><div className="row between"><b className="mono">{o.code}</b><Pill status={o.status} /></div>
          <div className="small muted">{o.sourceHubName} → {o.targetHubName} · {o.counts.delivered}/{o.counts.total} xe · {o.completedAt ? shortDateTime(o.completedAt) : ''}</div></div>))}
    </div>
  );
}

function DriverOrder({ o, onChanged }: { o: TransferOrderView; onChanged: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reroute, setReroute] = useState(false);
  const loading = ['ASSIGNED', 'LOADING'].includes(o.status);
  const delivering = ['IN_TRANSIT', 'PARTIALLY_DELIVERED'].includes(o.status);
  const call = async (path: string, body: unknown, ok: string) => {
    setBusy(true);
    try { const r = await api<TransferOrderView>(`/api/v1/driver/orders/${o.id}/${path}`, { body }); toast(r.message ?? ok, 'success'); setCode(''); onChanged(); }
    catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const scan = (c: string) => call(loading ? 'load' : 'deliver', { vehicleCode: c.trim().toUpperCase() }, loading ? `Đã bốc ${c}` : `Đã giao ${c}`);
  return (
    <div className="order-card">
      <div className="row between"><div><div className="eyebrow">Lệnh điều chuyển</div><b className="mono">{o.code}</b></div><Pill status={o.status} /></div>
      <div className="mt-8"><b>{o.sourceHubName}</b> → <b>{o.targetHubName}</b></div>
      {o.note && <div className="small muted">{o.note}</div>}
      <div className="grid cols-3 mt-12" style={{ gap: 8 }}>
        <div className="stat-tile"><div className="label">Chờ bốc</div><div className="value">{o.counts.locked}</div></div>
        <div className="stat-tile"><div className="label">Trên xe tải</div><div className="value">{o.counts.loaded + o.counts.inTransit}</div></div>
        <div className="stat-tile"><div className="label">Đã giao</div><div className="value">{o.counts.delivered}</div></div>
      </div>
      {(loading || delivering) && (
        <div className="scan-box mt-12">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder={loading ? 'Quét / nhập mã xe để bốc' : 'Quét / nhập mã xe khi giao'} onKeyDown={(e) => e.key === 'Enter' && code && scan(code)} />
          <button className="btn" disabled={busy || !code} onClick={() => scan(code)}>{busy ? <Spinner /> : '📷 Quét'}</button>
        </div>
      )}
      <div className="mt-12">{o.items.map((i) => (
        <div key={i.id} className="list-item" style={{ cursor: 'default' }}>
          <span className="mono bold" style={{ width: 64 }}>{i.vehicleCode}</span>
          <div style={{ width: 90 }}><Battery value={i.batteryPercent} /></div>
          <div style={{ flex: 1 }}><Pill status={i.status} />{i.heldSlotCode && <span className="tiny muted"> · ô {i.heldSlotCode}</span>}{i.deliveredAt && <span className="tiny muted"> · {time(i.deliveredAt)}</span>}</div>
          {loading && i.status === 'LOCKED' && <button className="btn sm soft" disabled={busy} onClick={() => scan(i.vehicleCode)}>Bốc</button>}
          {delivering && ['LOADED', 'IN_TRANSIT'].includes(i.status) && <button className="btn sm soft" disabled={busy} onClick={() => scan(i.vehicleCode)}>Giao</button>}
          {['LOCKED', 'LOADED', 'IN_TRANSIT'].includes(i.status) && <button className="btn sm danger-soft" onClick={() => { setBroken(i.vehicleCode); setNote(''); }}>Hỏng</button>}
        </div>))}</div>
      <div className="row mt-12">
        {loading && <button className="btn block" disabled={busy || o.counts.loaded === 0} onClick={() => call('start', {}, 'Bắt đầu vận chuyển')}>🚚 Bắt đầu vận chuyển ({o.counts.loaded} xe)</button>}
        {delivering && <button className="btn ghost block" onClick={() => setReroute(true)}>↪ Đổi Hub đích</button>}
      </div>
      {loading && o.counts.locked > 0 && o.counts.loaded > 0 && <div className="hint mt-8">Xe chưa bốc khi bắt đầu vận chuyển sẽ được gỡ khỏi lệnh và trả chỗ giữ tại Hub đích.</div>}
      <Modal open={!!broken} onClose={() => setBroken(null)}>
        <h2>Báo xe {broken} hư hỏng</h2>
        <p className="muted mt-4">Xe sẽ được gỡ khỏi lệnh, chuyển "Báo lỗi" và tạo phiếu sự cố.</p>
        <Field label="Mô tả hư hỏng"><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lốp xẹp, không thể dắt lên xe tải" /></Field>
        <div className="row"><button className="btn ghost block" onClick={() => setBroken(null)}>Hủy</button><button className="btn danger block" disabled={busy || !note.trim()} onClick={async () => { await call('broken', { vehicleCode: broken, note }, 'Đã báo hỏng'); setBroken(null); }}>Gửi</button></div>
      </Modal>
      {reroute && <RerouteModal o={o} onClose={() => setReroute(false)} onDone={() => { setReroute(false); onChanged(); }} />}
    </div>
  );
}

function RerouteModal({ o, onClose, onDone }: { o: TransferOrderView; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const hubs = useLoad(() => api<SearchResult>('/api/v1/hubs'));
  const [hubId, setHubId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const remaining = o.counts.loaded + o.counts.inTransit;
  const submit = async () => {
    setBusy(true);
    try { const r = await api<TransferOrderView>(`/api/v1/driver/orders/${o.id}/reroute`, { body: { newTargetHubId: hubId, reason } }); toast(r.message ?? 'Đã đổi Hub đích', 'success'); onDone(); }
    catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose}>
      <h2>Đổi Hub đích</h2>
      <p className="muted mt-4">Hệ thống giữ chỗ cho {remaining} xe còn trên xe tải tại Hub mới và trả chỗ đã giữ ở {o.targetHubName}.</p>
      <Field label="Hub đích mới"><select className="select" value={hubId} onChange={(e) => setHubId(Number(e.target.value))}><option value="">— chọn —</option>{hubs.data?.items.filter((h) => h.id !== o.targetHubId && h.id !== o.sourceHubId).map((h) => <option key={h.id} value={h.id} disabled={h.freeSharedSlots < remaining}>{h.name} · {h.freeSharedSlots} chỗ trống</option>)}</select></Field>
      <Field label="Lý do"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Đường vào Hub đích bị phong tỏa" /></Field>
      <div className="row"><button className="btn ghost block" onClick={onClose}>Hủy</button><button className="btn block" disabled={busy || !hubId || !reason.trim()} onClick={submit}>{busy ? <Spinner /> : 'Xác nhận'}</button></div>
    </Modal>
  );
}
