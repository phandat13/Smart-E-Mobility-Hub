import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { AdjustCheck, ChargingItemView, HubSummary, PortView, ScheduleView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { Battery, Empty, Field, KV, Loading, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { fromLocalInput, shortDateTime, time, toLocalInput } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

/** SC01 – Lập lịch sạc thông minh; SC02 – Điều chỉnh lịch (kiểm tra lại, không đụng cam kết người dùng / phiên đang sạc). */
export function ChargingPage() {
  const toast = useToast();
  const hubs = useLoad(() => api<HubSummary[]>('/api/v1/ops/hubs'));
  const list = useLoad(() => api<ScheduleView[]>('/api/v1/ops/charging/schedules'), [], 30000);
  const [hubId, setHubId] = useState<number | null>(null);
  const [hours, setHours] = useState(4);
  const [selId, setSelId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!hubId && hubs.data?.length) setHubId(hubs.data.filter((h) => h.status === 'ACTIVE').sort((a, b) => b.totalPorts - a.totalPorts)[0]?.id ?? null); }, [hubs.data, hubId]);
  const schedule = useLoad(() => (selId ? api<ScheduleView>(`/api/v1/ops/charging/schedules/${selId}`) : Promise.resolve(null)), [selId], 20000);
  const current = schedule.data;
  const forHub = useMemo(() => (list.data ?? []).filter((s) => !hubId || s.hubId === hubId), [list.data, hubId]);

  const generate = async () => {
    setBusy(true);
    try {
      const s = await api<ScheduleView>('/api/v1/ops/charging/schedules', { body: { hubId, horizonHours: hours } });
      toast(s.message ?? `Đã tạo bản nháp ${s.code}`, 'success'); list.reload(); setSelId(s.id);
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const act = async (path: string, ok: string) => {
    if (!current) return;
    setBusy(true);
    try { const s = await api<ScheduleView>(path, { body: {} }); toast(s.message ?? ok, 'success'); schedule.setData(s); list.reload(); }
    catch (e) { toast(errorText(e), 'error'); schedule.reload(); } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <PageHead title="Lịch sạc thông minh" sub="Ưu tiên xe pin thấp & nhu cầu sắp tới · phân bổ cổng tương thích · lịch ≠ phiên sạc thực tế (phiên chỉ bắt đầu khi thiết bị xác nhận cấp điện)"
        right={<>
          <select className="select" value={hubId ?? ''} onChange={(e) => { setHubId(Number(e.target.value)); setSelId(null); }}>{hubs.data?.filter((h) => h.status === 'ACTIVE').map((h) => <option key={h.id} value={h.id}>{h.name} · {h.totalPorts} cổng</option>)}</select>
          <select className="select" value={hours} onChange={(e) => setHours(Number(e.target.value))}>{[2, 4, 6, 8, 12].map((h) => <option key={h} value={h}>Khung {h} giờ</option>)}</select>
          <button className="btn" disabled={busy || !hubId} onClick={generate}>{busy ? <Spinner /> : '⚡ Tạo lịch sạc'}</button>
        </>} />
      <div className="grid" style={{ gridTemplateColumns: '280px minmax(0,1fr)' }}>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 className="mb-8">Lịch của Hub</h3>
          {forHub.length === 0 ? <Empty icon="📅" title="Chưa có lịch" /> : forHub.map((s) => (
            <div key={s.id} className={`list-item ${selId === s.id ? 'on' : ''}`} onClick={() => setSelId(s.id)}>
              <div style={{ flex: 1 }}><b className="mono small">{s.code}</b><div className="tiny muted">{shortDateTime(s.horizonStart)} – {time(s.horizonEnd)} · {s.items.length} xe</div></div><Pill status={s.status} />
            </div>))}
        </div>
        <div>
          {!selId ? <div className="card"><Empty icon="⚡" title="Chọn hoặc tạo một lịch sạc">Hệ thống chỉ sinh <b>bản nháp</b>; lịch chỉ có hiệu lực khi được xác nhận.</Empty></div> : !current ? <Loading /> : (
            <ScheduleDetail s={current} busy={busy} onConfirm={() => act(`/api/v1/ops/charging/schedules/${current.id}/confirm`, 'Đã xác nhận lịch sạc')}
              onDiscard={() => act(`/api/v1/ops/charging/schedules/${current.id}/discard`, 'Đã hủy bản nháp')} onChanged={(s) => { schedule.setData(s); list.reload(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleDetail({ s, busy, onConfirm, onDiscard, onChanged }: { s: ScheduleView; busy: boolean; onConfirm: () => void; onDiscard: () => void; onChanged: (s: ScheduleView) => void }) {
  const toast = useToast();
  const ports = useLoad(() => api<PortView[]>(`/api/v1/ops/hubs/${s.hubId}/ports`), [s.hubId]);
  const [sel, setSel] = useState<ChargingItemView | null>(null);
  const [adj, setAdj] = useState({ portId: 0, start: '', end: '', priority: 0 });
  const [check, setCheck] = useState<AdjustCheck | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setSel(null); setCheck(null); }, [s.id]);
  useEffect(() => { if (sel) { setAdj({ portId: sel.portId, start: toLocalInput(new Date(sel.startAt)), end: toLocalInput(new Date(sel.endAt)), priority: Math.round(sel.priority * 100) / 100 }); setCheck(null); } }, [sel]);
  const t0 = new Date(s.horizonStart).getTime();
  const t1 = new Date(s.horizonEnd).getTime();
  const pct = (t: string) => Math.max(0, Math.min(100, ((new Date(t).getTime() - t0) / (t1 - t0)) * 100));
  const portIds = Array.from(new Set([...(ports.data ?? []).map((p) => p.id), ...s.items.map((i) => i.portId)]));
  const portLabel = (id: number) => ports.data?.find((p) => p.id === id)?.code ?? s.items.find((i) => i.portId === id)?.portCode ?? `#${id}`;
  const ticks = Array.from({ length: Math.round((t1 - t0) / 3600000) + 1 }, (_, k) => t0 + k * 3600000);
  const editable = sel && ['SCHEDULED', 'NEEDS_RESCHEDULE'].includes(sel.status) && ['DRAFT', 'CONFIRMED'].includes(s.status);
  const body = () => ({ portId: adj.portId, startAt: fromLocalInput(adj.start), endAt: fromLocalInput(adj.end), priority: adj.priority });
  const validate = async () => { if (!sel) return; try { setCheck(await api<AdjustCheck>(`/api/v1/ops/charging/items/${sel.id}/validate`, { body: body() })); } catch (e) { toast(errorText(e), 'error'); } };
  const save = async () => {
    if (!sel) return;
    setSaving(true);
    try { const r = await api<ScheduleView>(`/api/v1/ops/charging/items/${sel.id}`, { method: 'PUT', body: body() }); toast(r.message ?? 'Đã cập nhật lịch', 'success'); onChanged(r); setSel(null); }
    catch (e) { toast(errorText(e), 'error'); validate(); } finally { setSaving(false); }
  };
  return (
    <div className="col">
      <div className="card">
        <div className="row between">
          <div><div className="eyebrow">{s.hubName}</div><h2>{s.code} <Pill status={s.status} /></h2><div className="small muted">{shortDateTime(s.horizonStart)} – {shortDateTime(s.horizonEnd)}{s.confirmedBy ? ` · xác nhận bởi ${s.confirmedBy} lúc ${time(s.confirmedAt!)}` : ''}</div></div>
          <div className="row">{s.status === 'DRAFT' && <><button className="btn ghost" disabled={busy} onClick={onDiscard}>Hủy bản nháp</button><button className="btn" disabled={busy} onClick={onConfirm}>✓ Xác nhận lịch</button></>}</div>
        </div>
        <div className="grid cols-3 mt-12">
          <div className="stat-tile"><div className="label">Xe cần sạc</div><div className="value">{s.vehiclesNeedingCharge}</div></div>
          <div className="stat-tile"><div className="label">Đã xếp lịch</div><div className="value">{s.items.length}</div></div>
          <div className="stat-tile"><div className="label">Cổng khả dụng</div><div className="value">{s.portsAvailable}</div></div>
        </div>
        {s.status === 'DRAFT' && <div className="banner info small mt-12">Khi xác nhận, hệ thống kiểm tra lại cổng và xe; mỗi mục lịch giữ khung giờ trên cổng (không trùng với đặt chỗ của sinh viên).</div>}
      </div>
      <div className="card">
        <h3 className="mb-12">Biểu đồ phân bổ cổng sạc</h3>
        <div className="gantt-axis"><span /><div className="ticks">{ticks.map((t) => <span key={t} style={{ left: `${((t - t0) / (t1 - t0)) * 100}%` }}>{time(new Date(t).toISOString())}</span>)}</div></div>
        <div className="gantt">{portIds.map((pid) => (
          <div key={pid} className="gantt-row"><div className="gantt-label">{portLabel(pid)}</div>
            <div className="gantt-track">{s.items.filter((i) => i.portId === pid && i.status !== 'CANCELLED').map((i) => (
              <div key={i.id} title={`${i.vehicleCode} · ${time(i.startAt)}–${time(i.endAt)} · ${i.status}${i.sessionStatus ? ' · phiên ' + i.sessionStatus : ''}`}
                className={`gantt-bar ${i.status === 'ACTIVE' ? 'active' : i.status === 'NEEDS_RESCHEDULE' ? 'resched' : ''} ${sel?.id === i.id ? 'sel' : ''}`}
                style={{ left: `${pct(i.startAt)}%`, width: `${Math.max(2, pct(i.endAt) - pct(i.startAt))}%` }} onClick={() => setSel(i)}>{i.vehicleCode}</div>))}</div>
          </div>))}</div>
        <div className="legend mt-8"><span style={{ ['--c' as string]: 'var(--primary)' }}>Đã lên lịch</span><span style={{ ['--c' as string]: 'var(--green)' }}>Đang sạc (thiết bị xác nhận)</span><span style={{ ['--c' as string]: 'var(--orange)' }}>Cần lập lại lịch</span></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
        <div className="card">
          <h3 className="mb-8">Danh sách xe theo ưu tiên</h3>
          <div className="table-wrap"><table className="table compact">
            <thead><tr><th>Xe</th><th>Pin</th><th>Cổng</th><th>Khung giờ</th><th>Ưu tiên</th><th>Lịch</th><th>Phiên thực tế</th></tr></thead>
            <tbody>{[...s.items].sort((a, b) => b.priority - a.priority).map((i) => (
              <tr key={i.id} className={`clickable ${sel?.id === i.id ? 'selected' : ''}`} onClick={() => setSel(i)}>
                <td className="mono bold">{i.vehicleCode}</td><td style={{ width: 120 }}><Battery value={i.batteryPercent} /></td><td>{i.portCode} <span className="tiny muted">{i.powerKw} kW</span></td>
                <td className="small">{time(i.startAt)} – {time(i.endAt)}</td><td>{i.priority.toFixed(2)}</td><td><Pill status={i.status} /></td>
                <td className="small">{i.sessionStatus ? <><Pill status={i.sessionStatus} />{i.sessionStartedAt && <div className="tiny muted">cấp điện {time(i.sessionStartedAt)}</div>}</> : <span className="muted">Chưa bắt đầu</span>}</td>
              </tr>))}</tbody>
          </table></div>
          {s.unmet.length > 0 && <div className="banner warn small mt-12"><div><b>{s.unmet.length} xe chưa được xếp lịch:</b> {s.unmet.map((u) => `${u.code} (${u.battery}% – ${u.reason})`).join('; ')}</div></div>}
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>Điều chỉnh mục lịch</h3>
          {!sel ? <div className="small muted mt-8">Chọn một xe trên biểu đồ hoặc bảng.</div> : (<>
            <div className="mt-8"><KV k="Xe" v={sel.vehicleCode} /><KV k="Mục tiêu" v={`${sel.targetBattery}%`} /><KV k="Trạng thái" v={<Pill status={sel.status} />} /></div>
            {!editable ? <div className="banner warn small mt-12">Mục này {sel.status === 'ACTIVE' ? 'đang có phiên sạc – không thể dời hay ngắt' : 'không còn điều chỉnh được'}.</div> : (<>
              <Field label="Cổng sạc"><select className="select" value={adj.portId} onChange={(e) => { setAdj({ ...adj, portId: Number(e.target.value) }); setCheck(null); }}>{ports.data?.map((p) => <option key={p.id} value={p.id} disabled={['FAULTY', 'MAINTENANCE', 'DISABLED'].includes(p.status)}>{p.code} · {p.powerKw} kW · {p.connectorType} · {p.status}</option>)}</select></Field>
              <Field label="Bắt đầu"><input className="input" type="datetime-local" value={adj.start} onChange={(e) => { setAdj({ ...adj, start: e.target.value }); setCheck(null); }} /></Field>
              <Field label="Kết thúc"><input className="input" type="datetime-local" value={adj.end} onChange={(e) => { setAdj({ ...adj, end: e.target.value }); setCheck(null); }} /></Field>
              <Field label="Mức ưu tiên"><input className="input" type="number" step="0.05" value={adj.priority} onChange={(e) => { setAdj({ ...adj, priority: Number(e.target.value) }); setCheck(null); }} /></Field>
              {check && (check.ok ? <div className="banner success small mb-8">✓ Hợp lệ{check.warnings.length ? ' – ' + check.warnings.join('; ') : ''}</div>
                : <div className="banner error small mb-8"><div><b>Xung đột:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{check.conflicts.map((c) => <li key={c}>{c}</li>)}</ul></div></div>)}
              <div className="row"><button className="btn ghost block" onClick={validate}>Kiểm tra</button><button className="btn block" disabled={saving || !check?.ok} onClick={save}>{saving ? <Spinner /> : 'Lưu điều chỉnh'}</button></div>
              <div className="hint mt-8">Khi lưu, hệ thống kiểm tra lại một lần nữa trong giao dịch – không dời đặt chỗ của sinh viên và không ngắt phiên đang sạc.</div>
            </>)}
          </>)}
        </div>
      </div>
    </div>
  );
}
