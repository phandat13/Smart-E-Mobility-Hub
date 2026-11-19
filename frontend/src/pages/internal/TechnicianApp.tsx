import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { MaintenanceOrderView, ProgressResult, TicketView } from '../../api/types';
import { SimButton, SimPanel } from '../../components/SimPanel';
import { Empty, Field, KV, Loading, Modal, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { ago, shortDateTime } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

const PROG: Record<string, string> = { PENDING: 'Chờ xử lý', REPAIRING: 'Đang sửa', WAITING_PARTS: 'Chờ linh kiện', DONE: 'Hoàn tất', UNREPAIRABLE: 'Không thể sửa' };

/** MT04 – Ghi nhận kết quả kiểm tra; MT05 – Cập nhật tiến độ (Hoàn tất chỉ khi cảm biến xác nhận). */
export function TechnicianOrdersPage() {
  const { data, reload } = useLoad(() => api<MaintenanceOrderView[]>('/api/v1/tech/orders'), [], 20000);
  const [ticket, setTicket] = useState<{ t: TicketView; o: MaintenanceOrderView } | null>(null);
  if (!data) return <Loading />;
  return (
    <div className="page medium">
      <h1>Lệnh bảo trì được giao</h1>
      <p className="sub mb-16">Chọn từng phiếu để ghi nhận chẩn đoán và cập nhật tiến độ.</p>
      {data.length === 0 ? <div className="card"><Empty icon="🛠" title="Không có lệnh bảo trì" /></div> : data.map((o) => (
        <div key={o.id} className="card mb-16">
          <div className="row between"><div><b className="mono">{o.code}</b> <Pill status={o.status} /> <Pill tone={o.priority === 'CRITICAL' ? 'red' : o.priority === 'HIGH' ? 'orange' : 'blue'} label={`Ưu tiên ${o.priority}`} /></div>
            <span className="small muted">{o.dueAt ? `Hạn ${shortDateTime(o.dueAt)}` : ''}</span></div>
          {o.incidentCode && <div className="small muted mt-4">Từ phiếu sự cố {o.incidentCode}</div>}
          {o.note && <div className="small mt-4">{o.note}</div>}
          <div className="mt-12">{o.tickets.map((t) => (
            <div key={t.id} className="list-item" onClick={() => setTicket({ t, o })}>
              <div className="vehicle-ico">{t.targetType === 'VEHICLE' ? '🛵' : t.targetType === 'CHARGING_PORT' ? '⚡' : '🅿️'}</div>
              <div style={{ flex: 1 }}><b>{t.targetLabel}</b><div className="tiny muted">{t.diagnosis ?? 'Chưa có chẩn đoán'}</div></div>
              <Pill status={t.progress} />
            </div>))}</div>
        </div>
      ))}
      {ticket && <TicketModal t={ticket.t} order={ticket.o} onClose={() => setTicket(null)} onChanged={() => { reload(); }} />}
    </div>
  );
}

function TicketModal({ t, order, onClose, onChanged }: { t: TicketView; order: MaintenanceOrderView; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ diagnosis: t.diagnosis ?? '', repairItems: t.repairItems ?? '', replacedParts: t.replacedParts ?? '' });
  const [cur, setCur] = useState(t);
  const [progress, setProgress] = useState(t.progress === 'PENDING' ? 'REPAIRING' : t.progress);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProgressResult | null>(null);
  const pre = useLoad(() => api<Record<string, unknown>>(`/api/v1/tech/tickets/${t.id}/precheck`), [t.id], 10000);
  useEffect(() => setCur(t), [t]);
  const closed = ['DONE', 'UNREPAIRABLE'].includes(cur.progress);
  const fill = async () => {
    setBusy(true);
    try { setCur(await api<TicketView>(`/api/v1/tech/tickets/${t.id}`, { method: 'PUT', body: f })); toast('Đã lưu kết quả kiểm tra', 'success'); onChanged(); }
    catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const update = async () => {
    setBusy(true);
    try { const r = await api<ProgressResult>(`/api/v1/tech/tickets/${t.id}/progress`, { body: { progress, note: note || null } }); setResult(r); setCur(r.ticket); onChanged(); pre.reload(); }
    catch (e) { toast(errorText(e), 'error'); pre.reload(); } finally { setBusy(false); }
  };
  const p = pre.data ?? {};
  return (
    <Modal open onClose={onClose} wide>
      <div className="row between"><div><div className="eyebrow">{order.code} · phiếu #{t.id}</div><h2>{t.targetLabel}</h2></div><Pill status={cur.progress} /></div>
      <div className="grid side mt-16">
        <div>
          <h3 className="mb-8">MT04 · Kết quả kiểm tra</h3>
          <Field label="Chẩn đoán"><textarea className="textarea" disabled={closed} value={f.diagnosis} onChange={(e) => setF({ ...f, diagnosis: e.target.value })} placeholder="Má phanh mòn, dây phanh chùng" /></Field>
          <Field label="Hạng mục sửa chữa"><input className="input" disabled={closed} value={f.repairItems} onChange={(e) => setF({ ...f, repairItems: e.target.value })} /></Field>
          <Field label="Linh kiện thay thế"><input className="input" disabled={closed} value={f.replacedParts} onChange={(e) => setF({ ...f, replacedParts: e.target.value })} /></Field>
          {!closed && <button className="btn ghost" disabled={busy || !f.diagnosis.trim()} onClick={fill}>Lưu kết quả kiểm tra</button>}
          <h3 className="mt-16 mb-8">MT05 · Cập nhật tiến độ</h3>
          {closed ? <div className="banner info small">Phiếu đã kết thúc ({PROG[cur.progress]}).{cur.verificationNote ? ' ' + cur.verificationNote : ''}</div> : (<>
            <div className="row wrap">{['REPAIRING', 'WAITING_PARTS', 'DONE', 'UNREPAIRABLE'].map((k) => <button key={k} className={`choice ${progress === k ? 'on' : ''}`} onClick={() => setProgress(k)}><div className="t small">{PROG[k]}</div></button>)}</div>
            <Field label="Ghi chú"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            {progress === 'DONE' && <div className="banner warn small mb-8">"Hoàn tất" chỉ được chấp nhận khi cảm biến gửi dữ liệu mới, không còn mã lỗi{t.targetType === 'VEHICLE' ? ' và pin ≥ ngưỡng (nếu chưa đủ, xe chuyển "Cần sạc")' : ''}.</div>}
            <button className="btn" disabled={busy || (progress === 'DONE' && !cur.diagnosis)} onClick={update}>{busy ? <Spinner /> : 'Cập nhật tiến độ'}</button>
            {progress === 'DONE' && !cur.diagnosis && <div className="hint mt-4">Cần lưu kết quả kiểm tra trước.</div>}
          </>)}
          {result && <div className={`banner ${result.ticket.progress === 'DONE' ? 'success' : 'info'} small mt-12`}><div>{result.verification ?? 'Đã cập nhật'}{result.resourceStatus ? ` · trạng thái thiết bị: ${result.resourceStatus}` : ''}{result.orderClosed ? ' · lệnh bảo trì đã hoàn tất' : ''}</div></div>}
        </div>
        <div className="col">
          <div className="card">
            <h3 className="mb-8">Dữ liệu cảm biến hiện tại</h3>
            {!pre.data ? <Loading /> : (<>
              <KV k="Dữ liệu mới" v={p.sensorFresh ? <Pill tone="green" label="Có" /> : <Pill tone="red" label="Chưa có" />} />
              <KV k="Lần cuối" v={p.lastSeenAt ? ago(String(p.lastSeenAt)) : '—'} />
              <KV k="Mã lỗi" v={p.errorCode ? <span style={{ color: 'var(--red)' }}>{String(p.errorCode)}</span> : 'Không'} />
              {'batteryPercent' in p && <KV k="Pin" v={`${p.batteryPercent}% ${p.batteryOk ? '' : '(dưới ngưỡng)'}`} />}
              {'otherOpenIncidents' in p && Number(p.otherOpenIncidents) > 0 && <div className="banner warn small mt-8">Còn {String(p.otherOpenIncidents)} phiếu sự cố khác đang mở cho xe này.</div>}
            </>)}
          </div>
          <SimPanel title="Giả lập thiết bị sau sửa chữa">
            <SimButton label="📡 Gửi telemetry hợp lệ (xóa lỗi)" path={`/api/v1/sim/${t.targetType === 'VEHICLE' ? 'VEHICLE' : t.targetType === 'CHARGING_PORT' ? 'PORT' : 'SLOT'}/${t.targetId}/error`} body={{ code: null }} onDone={() => setTimeout(pre.reload, 600)} />
            {t.targetType === 'VEHICLE' && <SimButton label="🔋 Pin 85%" path={`/api/v1/sim/vehicles/${t.targetId}/battery`} body={{ percent: 85 }} onDone={() => setTimeout(pre.reload, 600)} />}
          </SimPanel>
        </div>
      </div>
    </Modal>
  );
}
