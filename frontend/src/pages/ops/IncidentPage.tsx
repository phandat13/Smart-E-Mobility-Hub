import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { HubSummary, IncidentView, MaintenanceOrderView, TechnicianView, VehicleAdminView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { Battery, Empty, Field, KV, Loading, Modal, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { fromLocalInput, shortDateTime, toLocalInput } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

const SEV = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEV_LABEL: Record<string, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Khẩn cấp' };

/** MT02 – Tiếp nhận & phân công sự cố; MT03 – Lập lệnh bảo trì cho nhiều xe. */
export function IncidentPage() {
  const [sp, setSp] = useSearchParams();
  const toast = useToast();
  const [openOnly, setOpenOnly] = useState(true);
  const { data, reload } = useLoad(() => api<IncidentView[]>(`/api/v1/ops/incidents?openOnly=${openOnly}`), [openOnly], 20000);
  const orders = useLoad(() => api<MaintenanceOrderView[]>('/api/v1/ops/maintenance-orders'), [], 20000);
  const techs = useLoad(() => api<TechnicianView[]>('/api/v1/ops/technicians'));
  const [tab, setTab] = useState<'incidents' | 'orders'>('incidents');
  const [selId, setSelId] = useState<number | null>(null);
  const [assign, setAssign] = useState({ technicianId: 0, priority: 'MEDIUM', dueAt: toLocalInput(new Date(Date.now() + 4 * 3600000)), note: '' });
  const [creating, setCreating] = useState(!!sp.get('vehicle'));
  const [busy, setBusy] = useState(false);
  const sel = data?.find((i) => i.id === selId) ?? null;
  useEffect(() => { if (!selId && data?.length) setSelId(data[0].id); }, [data, selId]);
  useEffect(() => { if (sel) setAssign((a) => ({ ...a, priority: sel.severity })); }, [sel]);
  useEffect(() => { if (!assign.technicianId && techs.data?.length) setAssign((a) => ({ ...a, technicianId: [...techs.data!].sort((x, y) => x.openOrders - y.openOrders)[0].id })); }, [techs.data, assign.technicianId]);

  const doAssign = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const o = await api<MaintenanceOrderView>(`/api/v1/ops/incidents/${sel.id}/assign`, { body: { technicianId: assign.technicianId, priority: assign.priority, dueAt: fromLocalInput(assign.dueAt), note: assign.note || null } });
      toast(`Đã tạo lệnh bảo trì ${o.code} và thông báo kỹ thuật viên`, 'success');
      reload(); orders.reload(); techs.reload();
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const close = async () => {
    if (!sel) return;
    try { await api(`/api/v1/ops/incidents/${sel.id}/close`, { body: {} }); toast('Đã đóng phiếu sự cố', 'success'); reload(); } catch (e) { toast(errorText(e), 'error'); }
  };
  return (
    <div className="page">
      <PageHead title="Sự cố & bảo trì" sub="Hàng đợi sự cố được sắp theo mức nghiêm trọng · phân công kỹ thuật viên · lệnh bảo trì"
        right={<><div className="seg"><button className={tab === 'incidents' ? 'on' : ''} onClick={() => setTab('incidents')}>Phiếu sự cố ({data?.length ?? 0})</button><button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>Lệnh bảo trì ({orders.data?.length ?? 0})</button></div>
          <button className="btn" onClick={() => setCreating(true)}>+ Lệnh bảo trì nhiều xe</button></>} />
      {tab === 'incidents' ? (
        <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 400px' }}>
          <div className="card">
            <div className="row between mb-12"><h3>Hàng đợi sự cố</h3><label className="checkbox small"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Chỉ phiếu đang mở</label></div>
            {!data ? <Loading /> : data.length === 0 ? <Empty icon="✅" title="Không có sự cố" /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Mã</th><th>Đối tượng</th><th>Loại lỗi</th><th>Mức độ</th><th>Nguồn</th><th>Trạng thái</th></tr></thead>
                <tbody>{data.map((i) => (
                  <tr key={i.id} className={`clickable ${selId === i.id ? 'selected' : ''}`} onClick={() => setSelId(i.id)}>
                    <td className="mono bold">{i.code}<div className="tiny muted">{shortDateTime(i.createdAt)}</div></td>
                    <td>{i.targetLabel}<div className="tiny muted">{i.hubName}</div></td><td className="small">{i.category}{i.followUps > 0 && <div className="tiny muted">+{i.followUps} báo cáo bổ sung</div>}</td>
                    <td><Pill tone={i.severity === 'CRITICAL' ? 'red' : i.severity === 'HIGH' ? 'orange' : i.severity === 'MEDIUM' ? 'blue' : 'gray'} label={SEV_LABEL[i.severity]} /></td>
                    <td className="small">{i.source === 'SYSTEM' ? 'Hệ thống tự phát hiện' : i.reporterName}</td><td><Pill status={i.status} /></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </div>
          <div className="col">
            {sel ? (<>
              <div className="card">
                <div className="row between"><h3>Phiếu {sel.code}</h3><Pill status={sel.status} /></div>
                <div className="mt-12"><KV k="Đối tượng" v={sel.targetLabel} /><KV k="Hub" v={sel.hubName} /><KV k="Loại lỗi" v={sel.category} /><KV k="Người báo" v={sel.reporterName} /></div>
                <p className="small mt-8">{sel.description}</p>
                {sel.photoUrls.length > 0 && <div className="small muted">📎 {sel.photoUrls.length} ảnh hiện trường</div>}
                {sel.followUpNotes.map((n, k) => <div key={k} className="tiny muted mt-4">↳ {n}</div>)}
                {sel.maintenanceOrders.length > 0 && <div className="banner info small mt-12">Lệnh bảo trì: {sel.maintenanceOrders.join(', ')}</div>}
              </div>
              {sel.status === 'OPEN' && (
                <div className="card">
                  <h3>Phân công kỹ thuật viên</h3>
                  <div className="mt-12">
                    <Field label="Kỹ thuật viên"><select className="select" value={assign.technicianId} onChange={(e) => setAssign({ ...assign, technicianId: Number(e.target.value) })}>{techs.data?.map((t) => <option key={t.id} value={t.id}>{t.fullName} · {t.openOrders} lệnh đang mở</option>)}</select></Field>
                    <div className="grid cols-2" style={{ gap: '0 10px' }}>
                      <Field label="Ưu tiên"><select className="select" value={assign.priority} onChange={(e) => setAssign({ ...assign, priority: e.target.value })}>{SEV.map((s) => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}</select></Field>
                      <Field label="Hạn xử lý"><input className="input" type="datetime-local" value={assign.dueAt} onChange={(e) => setAssign({ ...assign, dueAt: e.target.value })} /></Field>
                    </div>
                    <Field label="Ghi chú"><input className="input" value={assign.note} onChange={(e) => setAssign({ ...assign, note: e.target.value })} /></Field>
                    <button className="btn block" disabled={busy || !assign.technicianId} onClick={doAssign}>{busy ? <Spinner /> : 'Tạo lệnh bảo trì & phân công'}</button>
                  </div>
                </div>
              )}
              {sel.status === 'RESOLVED' && <button className="btn success" onClick={close}>Đóng phiếu sự cố</button>}
            </>) : <div className="card"><Empty title="Chọn một phiếu sự cố" /></div>}
          </div>
        </div>
      ) : (
        <div className="card">
          {!orders.data ? <Loading /> : orders.data.length === 0 ? <Empty title="Chưa có lệnh bảo trì" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Lệnh</th><th>Kỹ thuật viên</th><th>Ưu tiên</th><th>Hạn</th><th>Tiến độ phiếu</th><th>Trạng thái</th></tr></thead>
              <tbody>{orders.data.map((o) => (
                <tr key={o.id}><td className="mono bold">{o.code}<div className="tiny muted">{o.incidentCode ? `Sự cố ${o.incidentCode}` : 'Lệnh chủ động'}</div></td><td>{o.technicianName}</td>
                  <td>{SEV_LABEL[o.priority]}</td><td className="small">{o.dueAt ? shortDateTime(o.dueAt) : '—'}</td>
                  <td className="small">{o.tickets.map((t) => <div key={t.id}>{t.targetLabel}: <Pill status={t.progress} /></div>)}</td><td><Pill status={o.status} /></td></tr>))}</tbody>
            </table></div>
          )}
        </div>
      )}
      {creating && <CreateOrderModal techs={techs.data ?? []} preVehicle={sp.get('vehicle') ? Number(sp.get('vehicle')) : null} alertId={sp.get('alert') ? Number(sp.get('alert')) : null}
        onClose={() => { setCreating(false); setSp({}); }} onDone={() => { setCreating(false); setSp({}); orders.reload(); techs.reload(); setTab('orders'); }} />}
    </div>
  );
}

function CreateOrderModal({ techs, preVehicle, alertId, onClose, onDone }: { techs: TechnicianView[]; preVehicle: number | null; alertId: number | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const hubs = useLoad(() => api<HubSummary[]>('/api/v1/ops/hubs'));
  const [hubId, setHubId] = useState<number | ''>('');
  const vehicles = useLoad(() => api<VehicleAdminView[]>(`/api/v1/ops/vehicles${hubId ? '?hubId=' + hubId : ''}`), [hubId]);
  const [picked, setPicked] = useState<number[]>(preVehicle ? [preVehicle] : []);
  const [f, setF] = useState({ technicianId: techs[0]?.id ?? 0, priority: 'HIGH', dueAt: toLocalInput(new Date(Date.now() + 24 * 3600000)), note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useMemo(() => (vehicles.data ?? []).filter((v) => !['OUT_OF_SERVICE', 'MAINTENANCE_LOCKED'].includes(v.status))
    .sort((a, b) => Number(['FAULTY', 'PENDING_CHECK'].includes(b.status)) - Number(['FAULTY', 'PENDING_CHECK'].includes(a.status)) || a.batteryPercent - b.batteryPercent), [vehicles.data]);
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const o = await api<MaintenanceOrderView>('/api/v1/ops/maintenance-orders', { body: { vehicleIds: picked, technicianId: f.technicianId, priority: f.priority, dueAt: fromLocalInput(f.dueAt), alertId, note: f.note || null } });
      toast(`Đã tạo lệnh ${o.code} cho ${o.tickets.length} xe`, 'success'); onDone();
    } catch (e) { setError(errorText(e)); vehicles.reload(); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} wide>
      <h2>Lập lệnh bảo trì</h2>
      <p className="muted mt-4">Xe được chọn sẽ chuyển "Khóa bảo trì"; đặt chỗ/lịch sạc phụ thuộc được xử lý tự động (góp ý #15).</p>
      <div className="grid cols-2 mt-16" style={{ gap: '0 16px' }}>
        <Field label="Lọc theo Hub"><select className="select" value={hubId} onChange={(e) => setHubId(e.target.value ? Number(e.target.value) : '')}><option value="">Tất cả Hub</option>{hubs.data?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
        <Field label="Kỹ thuật viên"><select className="select" value={f.technicianId} onChange={(e) => setF({ ...f, technicianId: Number(e.target.value) })}>{techs.map((t) => <option key={t.id} value={t.id}>{t.fullName} · {t.openOrders} lệnh mở</option>)}</select></Field>
      </div>
      <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        {vehicles.loading ? <Loading /> : list.map((v) => {
          const on = picked.includes(v.id);
          return (<label key={v.id} className="list-item"><input type="checkbox" checked={on} onChange={() => setPicked(on ? picked.filter((x) => x !== v.id) : [...picked, v.id])} />
            <span className="mono bold" style={{ width: 70 }}>{v.code}</span><span className="small muted" style={{ width: 120 }}>{v.hubName ?? '—'}</span>
            <div style={{ width: 120 }}><Battery value={v.batteryPercent} /></div><Pill status={v.status} />{v.errorCode && <span className="tiny" style={{ color: 'var(--red)' }}>{v.errorCode}</span>}</label>);
        })}
      </div>
      <div className="grid cols-3 mt-12" style={{ gap: '0 12px' }}>
        <Field label="Ưu tiên"><select className="select" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{SEV.map((s) => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}</select></Field>
        <Field label="Hạn hoàn thành"><input className="input" type="datetime-local" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} /></Field>
        <Field label="Ghi chú"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
      {error && <div className="banner error small">{error}</div>}
      <div className="row mt-16"><span className="spacer" /><button className="btn ghost" onClick={onClose}>Hủy</button><button className="btn" disabled={busy || !picked.length || !f.technicianId} onClick={submit}>{busy ? <Spinner /> : `Tạo lệnh (${picked.length} xe)`}</button></div>
    </Modal>
  );
}
