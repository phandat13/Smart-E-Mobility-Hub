import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { CandidateView, DriverView, HubSummary, TransferOrderView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { Battery, ConfirmModal, Empty, Field, Loading, Modal, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { shortDateTime, time } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

/** RB01 – Tạo lệnh điều chuyển (giữ trước chỗ đỗ tại Hub đích – góp ý #10); RB02 – theo dõi trạng thái từng xe (góp ý #9). */
export function TransferPage() {
  const [sp, setSp] = useSearchParams();
  const toast = useToast();
  const { data, reload } = useLoad(() => api<TransferOrderView[]>('/api/v1/ops/transfers'), [], 15000);
  const drivers = useLoad(() => api<DriverView[]>('/api/v1/ops/transfers/drivers'), [], 30000);
  const [creating, setCreating] = useState(!!sp.get('target'));
  const [openId, setOpenId] = useState<number | null>(null);
  const [cancel, setCancel] = useState<TransferOrderView | null>(null);
  const [busy, setBusy] = useState(false);
  const open = data?.find((o) => o.id === openId) ?? null;
  const active = data?.filter((o) => !['COMPLETED', 'COMPLETED_WITH_ISSUES', 'CANCELLED'].includes(o.status)) ?? [];
  const done = data?.filter((o) => ['COMPLETED', 'COMPLETED_WITH_ISSUES', 'CANCELLED'].includes(o.status)) ?? [];
  return (
    <div className="page">
      <PageHead title="Điều phối & cân bằng xe" sub="Lệnh điều chuyển xe giữa các Hub · trạng thái từng xe trong lệnh"
        right={<button className="btn" onClick={() => setCreating(true)}>+ Tạo lệnh điều chuyển</button>} />
      <div className="grid cols-3 mb-16">
        <div className="card kpi"><div className="label">Lệnh đang thực hiện</div><div className="value">{active.length}</div><div className="note muted">{active.filter((o) => o.status === 'QUEUED').length} lệnh chờ tài xế</div></div>
        <div className="card kpi"><div className="label">Tài xế sẵn sàng</div><div className="value">{drivers.data?.filter((d) => d.status === 'AVAILABLE').length ?? '—'} / {drivers.data?.length ?? '—'}</div><div className="note muted">Phân công tự động khi rảnh</div></div>
        <div className="card kpi"><div className="label">Xe đang vận chuyển</div><div className="value">{active.reduce((s, o) => s + o.counts.inTransit + o.counts.loaded, 0)}</div><div className="note muted">{active.reduce((s, o) => s + o.counts.locked, 0)} xe đang khóa chờ bốc</div></div>
      </div>
      {!data ? <Loading /> : (
        <div className="card">
          <h3 className="mb-12">Lệnh điều chuyển</h3>
          {data.length === 0 ? <Empty icon="🚚" title="Chưa có lệnh điều chuyển" /> : (
            <div className="table-wrap"><table className="table compact">
              <thead><tr><th>Mã lệnh</th><th>Tuyến</th><th>Tài xế</th><th>Tiến độ từng xe</th><th>Trạng thái</th><th>Tạo lúc</th></tr></thead>
              <tbody>{[...active, ...done].map((o) => (
                <tr key={o.id} className="clickable" onClick={() => setOpenId(o.id)}>
                  <td className="mono bold">{o.code}{o.recommendationId && <div className="tiny muted">từ khuyến nghị mô phỏng</div>}</td>
                  <td>{o.sourceHubName} → <b>{o.targetHubName}</b></td>
                  <td>{o.driverName ?? <span className="muted">Chờ phân công</span>}</td>
                  <td className="small">
                    <TransferProgress o={o} />
                  </td>
                  <td><Pill status={o.status} /></td><td className="small">{shortDateTime(o.createdAt)}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </div>
      )}
      {creating && <CreateTransferModal initialTarget={sp.get('target') ? Number(sp.get('target')) : null} alertId={sp.get('alert') ? Number(sp.get('alert')) : null}
        onClose={() => { setCreating(false); setSp({}); }} onCreated={(o) => { setCreating(false); setSp({}); reload(); setOpenId(o.id); }} />}
      <Modal open={!!open} onClose={() => setOpenId(null)} wide>
        {open && (<>
          <div className="row between"><div><div className="eyebrow">Lệnh điều chuyển</div><h2>{open.code}</h2></div><Pill status={open.status} /></div>
          <p className="muted mt-8">{open.sourceHubName} → {open.targetHubName} · tài xế {open.driverName ?? 'chờ phân công'}{open.note ? ` · ${open.note}` : ''}</p>
          <div className="mt-12"><TransferProgress o={open} /></div>
          <div className="table-wrap mt-12"><table className="table compact">
            <thead><tr><th>Xe</th><th>Pin</th><th>Chỗ giữ tại Hub đích</th><th>Trạng thái xe</th><th>Thời điểm</th></tr></thead>
            <tbody>{open.items.map((i) => (
              <tr key={i.id}><td className="mono bold">{i.vehicleCode}</td><td style={{ width: 130 }}><Battery value={i.batteryPercent} /></td>
                <td>{i.heldSlotCode ?? '—'}{i.deliveredHubName && i.deliveredHubName !== open.targetHubName && <div className="tiny muted">giao tại {i.deliveredHubName}</div>}</td>
                <td><Pill status={i.status} />{i.note && <div className="tiny muted">{i.note}</div>}</td>
                <td className="small">{i.deliveredAt ? `Giao ${time(i.deliveredAt)}` : i.loadedAt ? `Bốc ${time(i.loadedAt)}` : '—'}</td></tr>))}</tbody>
          </table></div>
          <div className="banner info small mt-12">Chỗ đỗ tại Hub đích đã được giữ trước cho từng xe khi tạo lệnh; xe hỏng/không bốc được sẽ trả chỗ giữ ngay.</div>
          <div className="row mt-16"><span className="spacer" />
            {['QUEUED', 'ASSIGNED'].includes(open.status) && <button className="btn danger-soft" onClick={() => setCancel(open)}>Hủy lệnh</button>}
            <button className="btn ghost" onClick={() => setOpenId(null)}>Đóng</button></div>
        </>)}
      </Modal>
      <ConfirmModal open={!!cancel} danger tone="red" icon="✕" title={`Hủy lệnh ${cancel?.code}?`} body="Các xe được mở khóa trở lại và chỗ giữ tại Hub đích được giải phóng." busy={busy} onClose={() => setCancel(null)}
        onConfirm={async () => { setBusy(true); try { await api(`/api/v1/ops/transfers/${cancel!.id}/cancel`, { body: {} }); toast('Đã hủy lệnh', 'success'); reload(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); setCancel(null); } }} />
    </div>
  );
}

function TransferProgress({ o }: { o: TransferOrderView }) {
  const c = o.counts;
  const seg = [['Chờ bốc', c.locked, 'var(--orange)'], ['Đã bốc', c.loaded, 'var(--teal)'], ['Đang chở', c.inTransit, 'var(--primary)'], ['Đã giao', c.delivered, 'var(--green)'], ['Lỗi', c.failed, 'var(--red)'], ['Gỡ khỏi lệnh', c.removed, '#b8bfcc']] as const;
  return (
    <div style={{ minWidth: 200 }}>
      <div className="stack-bar thin">{seg.map(([n, v, col]) => <span key={n} style={{ width: `${(v / Math.max(1, c.total)) * 100}%`, background: col }} />)}</div>
      <div className="tiny muted mt-4">{c.delivered}/{c.total - c.removed} đã giao{c.inTransit ? ` · ${c.inTransit} đang chở` : ''}{c.locked ? ` · ${c.locked} chờ bốc` : ''}{c.failed ? ` · ${c.failed} lỗi` : ''}</div>
    </div>
  );
}

function CreateTransferModal({ initialTarget, alertId, onClose, onCreated }: { initialTarget: number | null; alertId: number | null; onClose: () => void; onCreated: (o: TransferOrderView) => void }) {
  const toast = useToast();
  const hubs = useLoad(() => api<HubSummary[]>('/api/v1/ops/hubs'));
  const active = useMemo(() => hubs.data?.filter((h) => h.status === 'ACTIVE') ?? [], [hubs.data]);
  const [source, setSource] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(initialTarget);
  const [picked, setPicked] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (source || !active.length) return;
    const best = [...active].filter((h) => h.id !== target).sort((a, b) => b.availableVehicles - a.availableVehicles)[0];
    if (best) setSource(best.id);
  }, [active, source, target]);
  useEffect(() => { if (!target && active.length > 1) setTarget(active.find((h) => h.id !== source)?.id ?? null); }, [active, source, target]);
  const cands = useLoad(() => (source ? api<CandidateView[]>(`/api/v1/ops/transfers/candidates?hubId=${source}`) : Promise.resolve([])), [source]);
  useEffect(() => setPicked([]), [source]);
  const tgt = active.find((h) => h.id === target);
  const capacity = tgt ? tgt.freeSharedSlots : 0;
  const sorted = [...(cands.data ?? [])].sort((a, b) => b.batteryPercent - a.batteryPercent);
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const o = await api<TransferOrderView>('/api/v1/ops/transfers', { body: { sourceHubId: source, targetHubId: target, vehicleIds: picked, alertId, note: note || null } });
      toast(o.message ?? `Đã tạo lệnh ${o.code}`, 'success');
      onCreated(o);
    } catch (e) { setError(errorText(e)); cands.reload(); hubs.reload(); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} wide>
      <h2>Tạo lệnh điều chuyển</h2>
      {alertId && <p className="muted mt-4">Từ cảnh báo mất cân bằng #{alertId}</p>}
      <div className="grid cols-2 mt-16" style={{ gap: '0 16px' }}>
        <Field label="Hub nguồn (dư xe)"><select className="select" value={source ?? ''} onChange={(e) => setSource(Number(e.target.value))}>{active.map((h) => <option key={h.id} value={h.id} disabled={h.id === target}>{h.name} · {h.availableVehicles} xe sẵn sàng</option>)}</select></Field>
        <Field label="Hub đích (thiếu xe)"><select className="select" value={target ?? ''} onChange={(e) => setTarget(Number(e.target.value))}>{active.map((h) => <option key={h.id} value={h.id} disabled={h.id === source}>{h.name} · {h.freeSharedSlots} chỗ trống</option>)}</select></Field>
      </div>
      <div className="row between mb-8"><b>Chọn xe ({picked.length})</b><span className="small muted">Sức chứa còn trống tại Hub đích: <b>{capacity}</b> chỗ · tối đa 30 xe/lệnh</span></div>
      <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        {cands.loading ? <Loading /> : sorted.length === 0 ? <Empty title="Hub nguồn không có xe khả dụng" /> : sorted.map((v) => {
          const on = picked.includes(v.id);
          const disabled = !on && (picked.length >= Math.min(30, capacity));
          return (
            <label key={v.id} className="list-item" style={{ opacity: disabled ? .5 : 1 }}>
              <input type="checkbox" checked={on} disabled={disabled} onChange={() => setPicked(on ? picked.filter((x) => x !== v.id) : [...picked, v.id])} />
              <span className="mono bold" style={{ width: 70 }}>{v.code}</span><span className="small muted" style={{ width: 90 }}>{v.type === 'E_BIKE' ? 'Xe đạp điện' : 'Xe máy điện'}</span>
              <div style={{ flex: 1 }}><Battery value={v.batteryPercent} /></div>
            </label>);
        })}
      </div>
      <div className="row mt-8"><button className="btn sm ghost" onClick={() => setPicked(sorted.slice(0, Math.min(30, capacity)).map((v) => v.id))}>Chọn nhanh {Math.min(30, capacity, sorted.length)} xe pin cao nhất</button><button className="btn sm ghost" onClick={() => setPicked([])}>Bỏ chọn</button></div>
      <Field label="Ghi chú"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ưu tiên giờ cao điểm sáng" /></Field>
      <div className="banner info small">Khi xác nhận, hệ thống kiểm tra lại trong một giao dịch: khóa từng xe (chỉ xe còn "Sẵn sàng") và <b>giữ trước chỗ đỗ</b> tại Hub đích. Nếu không đủ chỗ hoặc xe đã bị đặt, lệnh bị từ chối và không giữ gì.</div>
      {error && <div className="banner error small mt-12">{error}</div>}
      <div className="row mt-16"><span className="spacer" /><button className="btn ghost" onClick={onClose}>Hủy</button><button className="btn" disabled={busy || !picked.length || !source || !target} onClick={submit}>{busy ? <Spinner /> : `Tạo lệnh (${picked.length} xe)`}</button></div>
    </Modal>
  );
}
