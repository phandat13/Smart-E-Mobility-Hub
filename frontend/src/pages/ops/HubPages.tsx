import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, HttpError } from '../../api/client';
import type { HubSummary, OpsHubDetail, PortChangeResult, PortView, VehicleAdminView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { SimButton, SimPanel } from '../../components/SimPanel';
import { Battery, ConfirmModal, Empty, Field, Loading, Modal, Pill, Spinner, Updated, errorText, useToast } from '../../components/ui';
import { ago, hubTypeLabel, vehicleTypeLabel } from '../../lib/format';
import { useLoad } from '../../lib/hooks';
import { subscribe } from '../../lib/realtime';

/** MO02 – Chi tiết trạng thái một Hub (xe / chỗ đỗ / cổng sạc + cảnh báo). */
export function HubDetailPage() {
  const { id } = useParams();
  const { data, reload } = useLoad(() => api<OpsHubDetail>(`/api/v1/ops/hubs/${id}/detail`), [id], 30000);
  const [tab, setTab] = useState<'vehicles' | 'slots' | 'ports'>('slots');
  const [filter, setFilter] = useState('');
  useEffect(() => subscribe(`/topic/hubs/${id}`, () => reload()), [id, reload]);
  if (!data) return <Loading />;
  const h = data.hub;
  const vehicles = data.vehicles.filter((v) => !filter || (filter === 'LOW' ? v.batteryPercent < 20 : v.status === filter));
  const ports = data.ports.filter((p) => !filter || (filter === 'FAULTY' ? ['FAULTY', 'MAINTENANCE'].includes(p.status) : true));
  return (
    <div className="page">
      <PageHead eyebrow={`Hub & hạ tầng · ${h.code}`} title={`Chi tiết Hub – ${h.name}`} sub={<Updated at={data.lastSyncAt} stale={data.stale} refreshSeconds={30} />}
        right={<><Link className="btn ghost" to={`/ops/hubs/${h.id}/ports`}>⚡ Quản lý cổng sạc</Link><Link className="btn ghost" to="/ops/hubs">✎ Quản lý dữ liệu Hub</Link></>} />
      {data.stale && <div className="banner warn mb-16">⚠ Hub không có dữ liệu cập nhật gần đây – dữ liệu có thể không chính xác (cập nhật gần nhất {ago(data.lastSyncAt)}).</div>}
      <div className="grid" style={{ gridTemplateColumns: '280px minmax(0,1fr)' }}>
        <div className="col">
          <div className="card">
            <h3>Hub {h.name}</h3>
            <div className="small muted">{hubTypeLabel[h.type]} · {h.address}</div>
            <div className="grid cols-2 mt-12" style={{ gap: 8 }}>
              <div className="stat-tile"><div className="label">Xe sẵn sàng</div><div className="value">{h.availableVehicles}/{h.totalVehicles}</div></div>
              <div className="stat-tile"><div className="label">Chỗ đỗ trống</div><div className="value">{h.freeSharedSlots}/{h.sharedCapacity}</div></div>
              <div className="stat-tile"><div className="label">Cổng sạc trống</div><div className="value">{h.freePorts}/{h.totalPorts}</div></div>
              <div className="stat-tile"><div className="label">Chỗ xe cá nhân</div><div className="value">{h.freePersonalSlots}/{h.personalCapacity}</div></div>
            </div>
          </div>
          <div className="card">
            <h3 className="mb-8">Cảnh báo đang mở</h3>
            {data.alerts.length === 0 ? <div className="small muted">Không có cảnh báo</div> : data.alerts.map((a) => <div key={a.id} className="banner warn small mb-8">{a.message}</div>)}
          </div>
          <SimPanel title="Giả lập kết nối Hub">
            <SimButton label="⦸ Hub mất kết nối" path={`/api/v1/sim/hubs/${h.id}/offline`} body={{ value: true }} />
            <SimButton label="⟳ Khôi phục" path={`/api/v1/sim/hubs/${h.id}/offline`} body={{ value: false }} />
          </SimPanel>
        </div>
        <div className="card">
          <div className="row between mb-12">
            <div className="seg">
              <button className={tab === 'vehicles' ? 'on' : ''} onClick={() => { setTab('vehicles'); setFilter(''); }}>Xe ({data.vehicles.length})</button>
              <button className={tab === 'slots' ? 'on' : ''} onClick={() => { setTab('slots'); setFilter(''); }}>Chỗ đỗ ({data.slots.length})</button>
              <button className={tab === 'ports' ? 'on' : ''} onClick={() => { setTab('ports'); setFilter(''); }}>Cổng sạc ({data.ports.length})</button>
            </div>
            {tab === 'vehicles' && <select className="select" style={{ width: 200 }} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Tất cả xe</option><option value="LOW">Chỉ xe pin thấp</option><option value="AVAILABLE">Sẵn sàng</option><option value="FAULTY">Báo lỗi</option><option value="RESERVED">Đã đặt trước</option></select>}
            {tab === 'ports' && <select className="select" style={{ width: 200 }} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Tất cả cổng</option><option value="FAULTY">Chỉ cổng lỗi/bảo trì</option></select>}
          </div>
          {tab === 'vehicles' && (vehicles.length === 0 ? <Empty title="Không có dữ liệu phù hợp" /> : (
            <div className="table-wrap"><table className="table compact"><thead><tr><th>Mã xe</th><th>Loại</th><th>Pin</th><th>Ô đỗ</th><th>Khóa</th><th>Trạng thái</th></tr></thead>
              <tbody>{vehicles.map((v) => <tr key={v.id}><td className="mono bold">{v.code}</td><td>{vehicleTypeLabel(v.type)}</td><td style={{ width: 150 }}><Battery value={v.batteryPercent} /></td><td>{v.slotCode ?? '—'}</td><td className="small">{v.lockState}</td><td><Pill status={v.status} />{v.errorCode && <div className="tiny" style={{ color: 'var(--red)' }}>{v.errorCode}</div>}</td></tr>)}</tbody></table></div>
          ))}
          {tab === 'slots' && (<>
            <div className="slot-grid">{data.slots.map((s) => (
              <div key={s.id} title={`${s.code} · ${s.status}${s.vehicleCode ? ' · ' + s.vehicleCode : ''}${s.bookingCode ? ' · ' + s.bookingCode : ''}`}
                className={`slot ${s.status === 'AVAILABLE' ? 'free' : s.status === 'HELD' ? 'held' : s.status === 'OCCUPIED' ? 'busy' : s.status === 'FAULTY' ? 'fault' : s.status === 'DISABLED' ? 'disabled' : 'pending'}`}>
                {s.code}<div className="tiny" style={{ fontWeight: 500 }}>{s.vehicleCode ?? s.bookingCode ?? (s.kind === 'PERSONAL' ? 'cá nhân' : '')}</div></div>))}</div>
            <div className="legend mt-12"><span style={{ ['--c' as string]: '#eef3ff' }}>Trống</span><span style={{ ['--c' as string]: '#c96f3a' }}>Có xe</span><span style={{ ['--c' as string]: '#9b8cf5' }}>Giữ cho xe điều chuyển tới</span><span style={{ ['--c' as string]: '#ffe6a8' }}>Chờ kiểm tra</span><span style={{ ['--c' as string]: '#e0474c' }}>Lỗi</span></div>
          </>)}
          {tab === 'ports' && (
            <div className="table-wrap"><table className="table compact"><thead><tr><th>Cổng</th><th>Công suất · đầu</th><th>Đang sạc</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>{ports.map((p) => <tr key={p.id}><td className="mono bold">{p.code}</td><td>{p.powerKw} kW · {p.connectorType}</td><td className="small">{p.chargingWhat ?? '—'}</td><td><Pill status={p.status} />{p.disableAfterSession && <div className="tiny muted">ngưng sau phiên</div>}</td>
                <td><SimButton label="Báo lỗi" path={`/api/v1/sim/PORT/${p.id}/error`} body={{ code: 'E-PORT-OVERHEAT' }} onDone={reload} /></td></tr>)}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_HUB = { code: '', name: '', address: '', area: '', latitude: 10.8755, longitude: 106.8015, type: 'CAMPUS', sharedCapacity: 20, personalCapacity: 4, initialPorts: 2 };

/** MO03 – Quản lý thông tin Hub (thêm / sửa / ngưng hoạt động). */
export function HubManagementPage() {
  const nav = useNavigate();
  const toast = useToast();
  const { data, reload } = useLoad(() => api<HubSummary[]>('/api/v1/ops/hubs'));
  const [sel, setSel] = useState<HubSummary | null>(null);
  const [f, setF] = useState<typeof EMPTY_HUB>(EMPTY_HUB);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [confirmDeact, setConfirmDeact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const pick = (h: HubSummary | null) => {
    setSel(h);
    setErrors({});
    setBlockers(null);
    setF(h ? { code: h.code, name: h.name, address: h.address ?? '', area: h.area ?? '', latitude: h.latitude, longitude: h.longitude, type: h.type, sharedCapacity: h.sharedCapacity, personalCapacity: h.personalCapacity, initialPorts: 0 } : EMPTY_HUB);
  };
  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const r = await api<HubSummary>(sel ? `/api/v1/ops/hubs/${sel.id}` : '/api/v1/ops/hubs', { method: sel ? 'PUT' : 'POST', body: f });
      toast(sel ? 'Đã lưu thay đổi – phản ánh ngay trên Dashboard' : 'Đã tạo Hub mới', 'success');
      reload(); pick(r);
    } catch (e) { if (e instanceof HttpError) setErrors(e.fields); toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const deactivate = async () => {
    if (!sel) return;
    setBusy(true);
    try { await api(`/api/v1/ops/hubs/${sel.id}/deactivate`, { body: { reason } }); toast('Đã ngưng hoạt động Hub', 'success'); reload(); setConfirmDeact(false); }
    catch (e) { setConfirmDeact(false); if (e instanceof HttpError) setBlockers(e.detail<string[]>('blockers') ?? [e.message]); else toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const num = (k: keyof typeof EMPTY_HUB) => (e: { target: { value: string } }) => setF({ ...f, [k]: Number(e.target.value) });
  const str = (k: keyof typeof EMPTY_HUB) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="page">
      <PageHead title="Quản lý thông tin Hub" sub="Thêm mới, chỉnh sửa hoặc ngưng hoạt động Hub – thay đổi phản ánh ngay trên Dashboard" right={<button className="btn" onClick={() => pick(null)}>+ Thêm Hub mới</button>} />
      <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
        <div className="table-wrap"><table className="table compact">
          <thead><tr><th>Tên Hub</th><th>Loại</th><th>Sức chứa</th><th>Cổng sạc</th><th>Trạng thái</th></tr></thead>
          <tbody>{data?.map((h) => (
            <tr key={h.id} className={`clickable ${sel?.id === h.id ? 'selected' : ''}`} onClick={() => pick(h)}>
              <td><b>{h.name}</b><div className="tiny muted">{h.code} · {h.address}</div></td><td>{hubTypeLabel[h.type]}</td>
              <td>{h.sharedCapacity + h.personalCapacity}<div className="tiny muted">{h.sharedCapacity} chung · {h.personalCapacity} cá nhân</div></td><td>{h.totalPorts}</td>
              <td><Pill status={h.status} /> <button className="btn link sm" onClick={(e) => { e.stopPropagation(); nav(`/ops/hubs/${h.id}`); }}>Chi tiết</button></td>
            </tr>))}</tbody>
        </table></div>
        <div className="col">
          <div className="card">
            <h3>{sel ? 'Chỉnh sửa Hub' : 'Thêm Hub mới'}</h3>
            {sel && <div className="small muted">{sel.name} · {sel.code}</div>}
            <div className="mt-12">
              <div className="grid cols-2" style={{ gap: '0 10px' }}>
                <Field label="Mã Hub" error={errors.code}><input className="input" value={f.code} disabled={!!sel} onChange={str('code')} placeholder="HUB-XYZ" /></Field>
                <Field label="Loại Hub"><select className="select" value={f.type} onChange={str('type')}>{Object.entries(hubTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              </div>
              <Field label="Tên Hub" error={errors.name}><input className={`input ${errors.name ? 'error' : ''}`} value={f.name} onChange={str('name')} /></Field>
              <Field label="Địa chỉ"><input className="input" value={f.address} onChange={str('address')} /></Field>
              <div className="grid cols-3" style={{ gap: '0 10px' }}>
                <Field label="Khu vực"><input className="input" value={f.area} onChange={str('area')} /></Field>
                <Field label="Vĩ độ"><input className="input" type="number" step="0.0001" value={f.latitude} onChange={num('latitude')} /></Field>
                <Field label="Kinh độ"><input className="input" type="number" step="0.0001" value={f.longitude} onChange={num('longitude')} /></Field>
              </div>
              <div className="grid cols-3" style={{ gap: '0 10px' }}>
                <Field label="Chỗ xe chung" error={errors.sharedCapacity}><input className={`input ${errors.sharedCapacity ? 'error' : ''}`} type="number" value={f.sharedCapacity} onChange={num('sharedCapacity')} /></Field>
                <Field label="Chỗ xe cá nhân" error={errors.personalCapacity}><input className={`input ${errors.personalCapacity ? 'error' : ''}`} type="number" value={f.personalCapacity} onChange={num('personalCapacity')} /></Field>
                {!sel && <Field label="Cổng sạc ban đầu"><input className="input" type="number" value={f.initialPorts} onChange={num('initialPorts')} /></Field>}
              </div>
              <button className="btn block" disabled={busy} onClick={save}>{busy ? <Spinner /> : sel ? 'Lưu thay đổi' : 'Tạo Hub'}</button>
            </div>
          </div>
          {sel && (
            <div className="card">
              <h3>{sel.status === 'ACTIVE' ? 'Ngưng hoạt động Hub' : 'Hub đang ngưng hoạt động'}</h3>
              {sel.status === 'ACTIVE' ? (<>
                <Field label="Lý do"><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do: bảo trì mặt bằng bãi đỗ" /></Field>
                <div className="banner warn small mb-12">Hub còn xe hoạt động hoặc đơn đặt chỗ/sạc hiệu lực sẽ bị từ chối ngưng.</div>
                {blockers && <div className="banner error small mb-12"><div><b>Từ chối ngưng hoạt động:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul></div></div>}
                <button className="btn danger-soft block" disabled={!reason.trim()} onClick={() => setConfirmDeact(true)}>Ngưng hoạt động Hub</button>
              </>) : <button className="btn success block mt-12" onClick={async () => { await api(`/api/v1/ops/hubs/${sel.id}/activate`, { body: {} }); toast('Đã kích hoạt lại', 'success'); reload(); }}>Kích hoạt lại</button>}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal open={confirmDeact} danger tone="red" icon="⏻" title={`Ngưng hoạt động ${sel?.name}?`} body={`Lý do: ${reason}`} busy={busy} onClose={() => setConfirmDeact(false)} onConfirm={deactivate} />
    </div>
  );
}

/** MO04 – Quản lý cổng sạc trong Hub. */
export function PortManagementPage() {
  const { id } = useParams();
  const toast = useToast();
  const hub = useLoad(() => api<OpsHubDetail>(`/api/v1/ops/hubs/${id}/detail`), [id]);
  const { data, reload } = useLoad(() => api<PortView[]>(`/api/v1/ops/hubs/${id}/ports`), [id], 20000);
  const [sel, setSel] = useState<PortView | null>(null);
  const [f, setF] = useState({ code: '', powerKw: 3.3, connectorType: 'TYPE_2' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [force, setForce] = useState<PortView | null>(null);
  const [impact, setImpact] = useState<PortChangeResult | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (sel) setF({ code: sel.code, powerKw: sel.powerKw, connectorType: sel.connectorType }); else setF({ code: `C-${String((data?.length ?? 0) + 1).padStart(2, '0')}`, powerKw: 3.3, connectorType: 'TYPE_2' }); }, [sel, data]);
  const save = async () => {
    setBusy(true); setErrors({});
    try { await api(sel ? `/api/v1/ops/ports/${sel.id}` : `/api/v1/ops/hubs/${id}/ports`, { method: sel ? 'PUT' : 'POST', body: f }); toast('Đã lưu cấu hình cổng', 'success'); reload(); setSel(null); }
    catch (e) { if (e instanceof HttpError) setErrors(e.fields); toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const setStatus = async (p: PortView, status: string, forceIt = false) => {
    setBusy(true);
    try { const r = await api<PortChangeResult>(`/api/v1/ops/ports/${p.id}/status`, { body: { status, force: forceIt } }); setImpact(r); reload(); setForce(null); }
    catch (e) { if (e instanceof HttpError && e.detail<boolean>('requiresForce')) setForce(p); else toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const remove = async (p: PortView) => {
    setBusy(true);
    try { const r = await api<PortChangeResult>(`/api/v1/ops/ports/${p.id}`, { method: 'DELETE' }); setImpact(r); reload(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <PageHead eyebrow={`Hub & hạ tầng · ${hub.data?.hub.name ?? ''} · Cổng sạc`} title={`Quản lý cổng sạc – ${hub.data?.hub.name ?? ''}`} right={<button className="btn" onClick={() => setSel(null)}>+ Thêm cổng sạc</button>} />
      <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px' }}>
        <div>
          <div className="table-wrap"><table className="table compact">
            <thead><tr><th>Cổng</th><th>Đầu sạc</th><th>Công suất</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{data?.map((p) => (
              <tr key={p.id} className={`clickable ${sel?.id === p.id ? 'selected' : ''}`} onClick={() => setSel(p)}>
                <td className="mono bold">{p.code}</td><td>{p.connectorType}</td><td>{p.powerKw} kW</td>
                <td><Pill status={p.status} />{p.disableAfterSession && <div className="tiny muted">ngưng sau phiên hiện tại</div>}</td>
                <td onClick={(e) => e.stopPropagation()} className="row" style={{ gap: 6 }}>
                  {['MAINTENANCE', 'DISABLED', 'FAULTY'].includes(p.status) ? <button className="btn sm soft" onClick={() => setStatus(p, 'AVAILABLE')}>Hoạt động lại</button> : <button className="btn sm warning-soft" onClick={() => setStatus(p, 'MAINTENANCE')}>Bảo trì</button>}
                  <button className="btn sm danger-soft" onClick={() => remove(p)}>Gỡ bỏ</button>
                </td>
              </tr>))}</tbody>
          </table></div>
          <div className="banner info small mt-12">Cổng đang có xe cắm sạc không gỡ trực tiếp – chỉ đánh dấu "ngưng sau khi phiên hiện tại kết thúc". Khi ngưng cổng, các đặt chỗ/lịch sạc phụ thuộc được chuyển sang cổng khác hoặc người dùng được thông báo.</div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>{sel ? `Cấu hình cổng ${sel.code}` : 'Thêm cổng mới'}</h3>
          <div className="mt-12">
            <Field label="Mã cổng" error={errors.code}><input className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
            <Field label="Công suất (kW)" error={errors.powerKw}><input className={`input ${errors.powerKw ? 'error' : ''}`} type="number" step="0.1" value={f.powerKw} onChange={(e) => setF({ ...f, powerKw: Number(e.target.value) })} /></Field>
            <Field label="Loại đầu kết nối" error={errors.connectorType}><select className="select" value={f.connectorType} onChange={(e) => setF({ ...f, connectorType: e.target.value })}>{['TYPE_2', 'CCS2', 'J1772', 'STD_220V'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <button className="btn block" disabled={busy} onClick={save}>Lưu cấu hình</button>
          </div>
        </div>
      </div>
      <ConfirmModal open={!!force} danger tone="red" icon="⚠️" title="Cảnh báo xung đột" body={`Cổng ${force?.code} đang có phiên sạc. Bảo trì ngay sẽ dừng phiên và thông báo người dùng. Xác nhận cưỡng chế?`}
        confirmText="Xác nhận cưỡng chế" busy={busy} onClose={() => setForce(null)} onConfirm={() => force && setStatus(force, 'MAINTENANCE', true)} />
      <Modal open={!!impact} onClose={() => setImpact(null)}>
        <h2>{impact?.message}</h2>
        <p className="muted mt-8">Xử lý các cam kết phụ thuộc vào cổng (góp ý #15):</p>
        <div className="grid cols-3 mt-12"><div className="stat-tile"><div className="label">Chuyển cổng</div><div className="value">{impact?.impact.moved}</div></div><div className="stat-tile"><div className="label">Hủy phần sạc</div><div className="value">{impact?.impact.cancelled}</div></div><div className="stat-tile"><div className="label">Cần lập lại lịch</div><div className="value">{impact?.impact.needsReschedule}</div></div></div>
        {impact?.impact.details.map((d) => <div key={d} className="small mt-8">• {d}</div>)}
        <button className="btn block mt-16" onClick={() => setImpact(null)}>Đóng</button>
      </Modal>
    </div>
  );
}

/** MO05 – Quản lý danh mục phương tiện. */
export function VehicleCatalogPage() {
  const toast = useToast();
  const hubs = useLoad(() => api<HubSummary[]>('/api/v1/ops/hubs'));
  const [hubId, setHubId] = useState('');
  const [status, setStatus] = useState('');
  const { data, reload } = useLoad(() => api<VehicleAdminView[]>(`/api/v1/ops/vehicles?${hubId ? 'hubId=' + hubId + '&' : ''}${status ? 'status=' + status : ''}`), [hubId, status]);
  const [f, setF] = useState({ type: 'E_BIKE', model: 'DatBike Weaver', batteryCapacityKwh: 0.5, hubId: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retire, setRetire] = useState<VehicleAdminView | null>(null);
  useEffect(() => { if (!f.hubId && hubs.data?.length) setF((x) => ({ ...x, hubId: hubs.data![0].id })); }, [hubs.data, f.hubId]);
  const add = async () => {
    setBusy(true); setError('');
    try { const v = await api<VehicleAdminView>('/api/v1/ops/vehicles', { body: f }); toast(`Đã thêm ${v.code} – chờ kiểm tra cảm biến trước khi sẵn sàng`, 'success'); reload(); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <PageHead title="Danh mục phương tiện dùng chung" sub={`${data?.length ?? 0} xe · lọc theo Hub / trạng thái`}
        right={<><select className="select" value={hubId} onChange={(e) => setHubId(e.target.value)}><option value="">Hub: Tất cả</option>{hubs.data?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Trạng thái: Tất cả</option>{['AVAILABLE', 'RESERVED', 'IN_USE', 'CHARGING', 'NEEDS_CHARGE', 'PENDING_CHECK', 'FAULTY', 'MAINTENANCE_LOCKED', 'TRANSFER_LOCKED', 'OUT_OF_SERVICE'].map((s) => <option key={s} value={s}>{s}</option>)}</select></>} />
      <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
        <div className="table-wrap"><table className="table compact">
          <thead><tr><th>Mã xe</th><th>Loại</th><th>Pin</th><th>Hub · Ô</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>{data?.map((v) => (
            <tr key={v.id}><td className="mono bold">{v.code}</td><td>{vehicleTypeLabel(v.type)}<div className="tiny muted">{v.model} · {v.batteryCapacityKwh} kWh</div></td>
              <td style={{ width: 140 }}><Battery value={v.batteryPercent} /></td><td>{v.hubName ?? '—'}<div className="tiny muted">{v.slotCode ?? ''}</div></td>
              <td><Pill status={v.status} />{v.errorCode && <div className="tiny" style={{ color: 'var(--red)' }}>{v.errorCode}</div>}</td>
              <td>{v.status !== 'OUT_OF_SERVICE' && <button className="btn sm ghost" onClick={() => setRetire(v)}>Ngưng vận hành</button>}</td></tr>))}</tbody>
        </table></div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>Thêm mới</h3>
          <div className="mt-12">
            <Field label="Loại xe"><select className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="E_BIKE">Xe đạp điện</option><option value="E_SCOOTER">Xe máy điện</option></select></Field>
            <Field label="Mẫu xe"><input className="input" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></Field>
            <Field label="Dung lượng pin (kWh)"><input className="input" type="number" step="0.1" value={f.batteryCapacityKwh} onChange={(e) => setF({ ...f, batteryCapacityKwh: Number(e.target.value) })} /></Field>
            <Field label="Hub gán ban đầu"><select className="select" value={f.hubId} onChange={(e) => setF({ ...f, hubId: Number(e.target.value) })}>{hubs.data?.filter((h) => h.status === 'ACTIVE').map((h) => <option key={h.id} value={h.id}>{h.name} · {h.freeSharedSlots} chỗ trống</option>)}</select></Field>
            <div className="banner info small mb-12">Mã định danh sinh tự động. Xe mới ở trạng thái "Chờ kiểm tra" và chỉ chuyển "Sẵn sàng" khi nhận dữ liệu cảm biến hợp lệ tại Hub.</div>
            {error && <div className="banner error small mb-12">{error}</div>}
            <button className="btn block" disabled={busy} onClick={add}>{busy ? <Spinner /> : 'Lưu xe'}</button>
          </div>
        </div>
      </div>
      <ConfirmModal open={!!retire} danger tone="red" icon="⏻" title={`Ngưng vận hành ${retire?.code}?`} body="Xe đang được đặt trước hoặc trong chuyến đi sẽ bị từ chối." busy={busy} onClose={() => setRetire(null)}
        onConfirm={async () => { setBusy(true); try { await api(`/api/v1/ops/vehicles/${retire!.id}/retire`, { body: {} }); toast('Đã ngưng vận hành', 'success'); reload(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); setRetire(null); } }} />
    </div>
  );
}
