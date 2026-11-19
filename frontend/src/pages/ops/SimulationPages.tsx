import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, HttpError } from '../../api/client';
import type { ApplyResult, HubSummary, Preview, RunListItem, RunView, ScenarioSummary, ScenarioType, ScenarioView, SimResult } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { ConfirmModal, Empty, Field, KV, Loading, Modal, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { dateTime, shortDateTime, time, timeSec } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

const TYPES: { k: ScenarioType; t: string; d: string }[] = [
  { k: 'DEMAND_SURGE', t: 'Đột biến tải', d: 'Nhu cầu tăng đột ngột tại một số Hub (sự kiện, giờ cao điểm)' },
  { k: 'INFRA_FAILURE', t: 'Đứt gãy hạ tầng', d: 'Một phần cổng sạc / xe ngừng hoạt động' },
  { k: 'REBALANCE', t: 'Điều chuyển giả định', d: 'Thử trước phương án chuyển xe giữa các Hub' },
  { k: 'CHARGING_CAPACITY', t: 'Năng lực sạc', d: 'Bổ sung cổng sạc và xem tác động' },
];
type Transfer = { fromHubId: number; toHubId: number; count: number };
interface Form { name: string; description: string; type: ScenarioType; hubIds: number[]; demandIncreasePct: number; startHour: number; failedPortPct: number; failedVehicleCount: number; extraPorts: number; transfers: Transfer[]; horizonMinutes: number }

function toRequest(f: Form, overwrite = false) {
  const params: Record<string, unknown> = { startHour: f.startHour };
  if (f.type !== 'REBALANCE') params.hubIds = f.hubIds;
  if (f.type === 'DEMAND_SURGE') params.demandIncreasePct = f.demandIncreasePct;
  if (f.type === 'INFRA_FAILURE') { params.failedPortPct = f.failedPortPct; params.failedVehicleCount = f.failedVehicleCount; }
  if (f.type === 'CHARGING_CAPACITY') params.extraPorts = f.extraPorts;
  if (f.type === 'REBALANCE') params.transfers = f.transfers;
  return { name: f.name, description: f.description || null, type: f.type, params, horizonMinutes: f.horizonMinutes, overwrite };
}

/** SI01 – Cấu hình kịch bản; SI02 – Lưu kịch bản; SI03 – Chạy mô phỏng; lịch sử chạy. */
export function SimulationPage() {
  const nav = useNavigate();
  const toast = useToast();
  const hubs = useLoad(() => api<HubSummary[]>('/api/v1/ops/hubs'));
  const scenarios = useLoad(() => api<ScenarioView[]>('/api/v1/ops/simulation/scenarios'));
  const runs = useLoad(() => api<RunListItem[]>('/api/v1/ops/simulation/runs'), [], 20000);
  const active = useMemo(() => hubs.data?.filter((h) => h.status === 'ACTIVE') ?? [], [hubs.data]);
  const [f, setF] = useState<Form>({ name: 'Sự kiện khai giảng – sáng thứ Hai', description: '', type: 'DEMAND_SURGE', hubIds: [], demandIncreasePct: 60, startHour: 7, failedPortPct: 50, failedVehicleCount: 5, extraPorts: 4, transfers: [], horizonMinutes: 180 });
  const [summary, setSummary] = useState<ScenarioSummary | null>(null);
  const [busy, setBusy] = useState<'' | 'save' | 'run'>('');
  const [overwrite, setOverwrite] = useState(false);
  useEffect(() => { if (active.length && !f.hubIds.length) setF((x) => ({ ...x, hubIds: [active[0].id], transfers: active.length > 1 ? [{ fromHubId: active[1].id, toHubId: active[0].id, count: 5 }] : [] })); }, [active, f.hubIds.length]);
  useEffect(() => {
    const t = setTimeout(() => { api<ScenarioSummary>('/api/v1/ops/simulation/scenarios/validate', { body: toRequest(f) }).then(setSummary).catch(() => setSummary(null)); }, 350);
    return () => clearTimeout(t);
  }, [f]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });
  const load = (s: ScenarioView) => {
    const p = s.params as Record<string, unknown>;
    setF({ name: s.name, description: s.description ?? '', type: s.type, hubIds: (p.hubIds as number[]) ?? [], demandIncreasePct: Number(p.demandIncreasePct ?? 50), startHour: Number(p.startHour ?? 7),
      failedPortPct: Number(p.failedPortPct ?? 0), failedVehicleCount: Number(p.failedVehicleCount ?? 0), extraPorts: Number(p.extraPorts ?? 2), transfers: (p.transfers as Transfer[]) ?? [], horizonMinutes: s.horizonMinutes });
  };
  const save = async (ow = false) => {
    setBusy('save');
    try { await api('/api/v1/ops/simulation/scenarios', { body: toRequest(f, ow) }); toast('Đã lưu kịch bản', 'success'); scenarios.reload(); setOverwrite(false); }
    catch (e) { if (e instanceof HttpError && e.detail<boolean>('requiresOverwrite')) setOverwrite(true); else toast(errorText(e), 'error'); } finally { setBusy(''); }
  };
  const run = async (scenarioId?: number) => {
    setBusy('run');
    try {
      const r = await api<RunView>('/api/v1/ops/simulation/runs', { body: scenarioId ? { scenarioId } : { inline: toRequest(f) } });
      toast(r.status === 'COMPLETED' ? `Mô phỏng ${r.code} hoàn tất` : `Mô phỏng ${r.code}: ${r.error ?? r.status}`, r.status === 'COMPLETED' ? 'success' : 'error');
      nav(`/ops/simulation/runs/${r.id}`);
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(''); }
  };
  const toggleHub = (id: number) => set('hubIds', f.hubIds.includes(id) ? f.hubIds.filter((x) => x !== id) : [...f.hubIds, id]);
  return (
    <div className="page">
      <PageHead title="Mô phỏng What-if" sub="Mô phỏng chạy trên bản sao (snapshot) trạng thái mạng lưới – không ảnh hưởng dữ liệu vận hành thật" />
      <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
        <div className="card pad-lg">
          <h3>Cấu hình kịch bản</h3>
          <div className="grid cols-4 mt-12" style={{ gap: 10 }}>{TYPES.map((t) => <button key={t.k} className={`choice ${f.type === t.k ? 'on' : ''}`} onClick={() => set('type', t.k)}><div className="t">{t.t}</div><div className="d">{t.d}</div></button>)}</div>
          <div className="grid cols-2 mt-16" style={{ gap: '0 16px' }}>
            <Field label="Tên kịch bản"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Mô tả"><input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          </div>
          {f.type !== 'REBALANCE' && (
            <Field label="Hub áp dụng"><div className="row wrap">{active.map((h) => <button key={h.id} className={`choice ${f.hubIds.includes(h.id) ? 'on' : ''}`} style={{ padding: '8px 12px' }} onClick={() => toggleHub(h.id)}><div className="t small">{h.name}</div><div className="d">{h.availableVehicles} xe · {h.totalPorts} cổng</div></button>)}</div></Field>
          )}
          <div className="grid cols-3" style={{ gap: '0 12px' }}>
            {f.type === 'DEMAND_SURGE' && <Field label={`Mức tăng nhu cầu: +${f.demandIncreasePct}%`}><input type="range" min={1} max={300} value={f.demandIncreasePct} onChange={(e) => set('demandIncreasePct', Number(e.target.value))} style={{ width: '100%' }} /></Field>}
            {f.type === 'INFRA_FAILURE' && <><Field label={`Cổng sạc hỏng: ${f.failedPortPct}%`}><input type="range" min={0} max={100} step={5} value={f.failedPortPct} onChange={(e) => set('failedPortPct', Number(e.target.value))} style={{ width: '100%' }} /></Field>
              <Field label="Số xe hỏng"><input className="input" type="number" min={0} max={200} value={f.failedVehicleCount} onChange={(e) => set('failedVehicleCount', Number(e.target.value))} /></Field></>}
            {f.type === 'CHARGING_CAPACITY' && <Field label="Số cổng sạc bổ sung"><input className="input" type="number" min={1} max={20} value={f.extraPorts} onChange={(e) => set('extraPorts', Number(e.target.value))} /></Field>}
            <Field label="Giờ bắt đầu"><select className="select" value={f.startHour} onChange={(e) => set('startHour', Number(e.target.value))}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}</select></Field>
            <Field label="Khung thời gian"><select className="select" value={f.horizonMinutes} onChange={(e) => set('horizonMinutes', Number(e.target.value))}>{[60, 120, 180, 240, 360, 720, 1440].map((m) => <option key={m} value={m}>{m / 60} giờ</option>)}</select></Field>
          </div>
          {f.type === 'REBALANCE' && (
            <Field label="Phương án điều chuyển">
              {f.transfers.map((t, i) => (
                <div key={i} className="row mb-8">
                  <select className="select" value={t.fromHubId} onChange={(e) => set('transfers', f.transfers.map((x, k) => k === i ? { ...x, fromHubId: Number(e.target.value) } : x))}>{active.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
                  <span>→</span>
                  <select className="select" value={t.toHubId} onChange={(e) => set('transfers', f.transfers.map((x, k) => k === i ? { ...x, toHubId: Number(e.target.value) } : x))}>{active.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
                  <input className="input" type="number" min={1} max={30} style={{ width: 80 }} value={t.count} onChange={(e) => set('transfers', f.transfers.map((x, k) => k === i ? { ...x, count: Number(e.target.value) } : x))} />
                  <button className="btn sm ghost" onClick={() => set('transfers', f.transfers.filter((_, k) => k !== i))}>✕</button>
                </div>))}
              <button className="btn sm ghost" onClick={() => set('transfers', [...f.transfers, { fromHubId: active[0]?.id ?? 0, toHubId: active[1]?.id ?? 0, count: 5 }])}>+ Thêm phương án</button>
            </Field>
          )}
          {summary && (summary.valid ? <div className="banner info small">📋 {summary.summary}</div> : <div className="banner error small"><div>{summary.errors.map((e) => <div key={e}>• {e}</div>)}</div></div>)}
          <div className="row mt-16"><span className="spacer" />
            <button className="btn ghost" disabled={!!busy || !summary?.valid} onClick={() => save()}>{busy === 'save' ? <Spinner /> : '💾 Lưu kịch bản'}</button>
            <button className="btn" disabled={!!busy || !summary?.valid} onClick={() => run()}>{busy === 'run' ? <Spinner /> : '▶ Chạy mô phỏng'}</button>
          </div>
        </div>
        <div className="col">
          <div className="card">
            <h3 className="mb-8">Kịch bản đã lưu</h3>
            {!scenarios.data?.length ? <div className="small muted">Chưa có kịch bản</div> : scenarios.data.slice(0, 8).map((s) => (
              <div key={s.id} className="list-item" onClick={() => load(s)}>
                <div style={{ flex: 1 }}><b className="small">{s.name}</b><div className="tiny muted">{s.summary}</div></div>
                <button className="btn sm" disabled={!!busy} onClick={(e) => { e.stopPropagation(); run(s.id); }}>▶</button>
              </div>))}
          </div>
          <div className="card">
            <h3 className="mb-8">Lịch sử mô phỏng</h3>
            {!runs.data?.length ? <div className="small muted">Chưa có lượt chạy</div> : runs.data.slice(0, 10).map((r) => (
              <Link key={r.id} to={`/ops/simulation/runs/${r.id}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ flex: 1 }}><b className="mono small">{r.code}</b> <span className="small">{r.scenarioName}</span>
                  <div className="tiny muted">Snapshot {shortDateTime(r.snapshotTakenAt)} · đáp ứng {r.serviceRatePct ?? '—'}% · {r.applied}/{r.recommendations} khuyến nghị đã áp dụng</div></div>
                <Pill status={r.status} />
              </Link>))}
          </div>
        </div>
      </div>
      <ConfirmModal open={overwrite} icon="⚠️" tone="orange" title="Kịch bản trùng tên" body={`Đã có kịch bản "${f.name}". Ghi đè cấu hình cũ?`} confirmText="Ghi đè" busy={busy === 'save'}
        onClose={() => setOverwrite(false)} onConfirm={() => save(true)} />
    </div>
  );
}

function OccupancyChart({ r }: { r: SimResult }) {
  const W = 640, H = 200, P = 28;
  const names = r.hubs.slice(0, 6).map((h) => h.name);
  const max = Math.max(1, ...r.series.map((s) => s.minute));
  const colors = ['#2f6bff', '#e0474c', '#16a34a', '#f59e0b', '#8b5cf6', '#0ea5a4'];
  const x = (m: number) => P + (m / max) * (W - 2 * P);
  const y = (v: number) => H - P - (Math.min(120, v) / 120) * (H - 2 * P);
  return (
    <div>
      <div className="chart-box"><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[0, 50, 90, 100].map((v) => <g key={v}><line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke={v === 90 ? '#e0474c' : '#e6e9f0'} strokeDasharray={v === 90 ? '4 4' : ''} /><text x={2} y={y(v) + 4} fontSize="10" fill="#8a93a6">{v}%</text></g>)}
        {names.map((n, i) => <polyline key={n} fill="none" stroke={colors[i]} strokeWidth="2" points={r.series.map((s) => `${x(s.minute)},${y(s.occupancyPct[n] ?? 0)}`).join(' ')} />)}
        {[0, max / 2, max].map((m) => <text key={m} x={x(m)} y={H - 8} fontSize="10" fill="#8a93a6" textAnchor="middle">+{Math.round(m)}′</text>)}
      </svg></div>
      <div className="legend">{names.map((n, i) => <span key={n} style={{ ['--c' as string]: colors[i] }}>{n}</span>)}<span style={{ ['--c' as string]: '#e0474c' }}>Ngưỡng quá tải 90%</span></div>
    </div>
  );
}

/** SI04 – Xem kết quả mô phỏng; SI05 – Áp dụng khuyến nghị (xem trước chênh lệch snapshot ↔ hiện tại, kiểm tra khả thi, token xem trước). */
export function SimulationRunPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: run, reload } = useLoad(() => api<RunView>(`/api/v1/ops/simulation/runs/${id}`), [id]);
  const [picked, setPicked] = useState<number[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (run) setPicked(run.recommendations.filter((r) => r.status === 'PROPOSED').map((r) => r.id)); }, [run]);
  if (!run) return <Loading />;
  const r = run.result;
  const doPreview = async () => {
    setBusy(true);
    try { setPreview(await api<Preview>(`/api/v1/ops/simulation/runs/${run.id}/apply/preview`, { body: { recommendationIds: picked } })); }
    catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const feasibleIds = preview.items.filter((i) => i.feasible).map((i) => i.recommendationId);
      const res = await api<ApplyResult>(`/api/v1/ops/simulation/runs/${run.id}/apply`, { body: { recommendationIds: feasibleIds, previewToken: preview.previewToken } });
      setResult(res); setPreview(null); reload();
    } catch (e) { toast(errorText(e) + ' – vui lòng xem trước lại.', 'error'); setPreview(null); } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <PageHead eyebrow={<Link to="/ops/simulation">← Mô phỏng What-if</Link>} title={`Kết quả mô phỏng ${run.code}`}
        sub={`${run.scenarioName} · snapshot lúc ${dateTime(run.snapshotTakenAt)}${run.finishedAt ? ' · hoàn tất ' + time(run.finishedAt) : ''}`} right={<Pill status={run.status} />} />
      {run.error && <div className="banner error mb-16">{run.error}</div>}
      {!r ? <div className="card"><Empty title="Không có kết quả" /></div> : (<>
        <div className="banner info mb-16">📊 {r.summary}</div>
        <div className="grid cols-4 mb-16">
          <div className="card kpi"><div className="label">Tỉ lệ đáp ứng</div><div className="value" style={{ color: r.serviceRatePct < 85 ? 'var(--red)' : 'var(--green)' }}>{r.serviceRatePct}%</div><div className="note muted">{Math.round(r.served)}/{Math.round(r.requested)} lượt thuê</div></div>
          <div className="card kpi"><div className="label">Nhu cầu không đáp ứng</div><div className="value">{Math.round(r.unmet)}</div><div className="note muted">lượt trong khung mô phỏng</div></div>
          <div className="card kpi"><div className="label">Hub có rủi ro quá tải</div><div className="value" style={{ color: r.hubsAtRisk ? 'var(--orange)' : undefined }}>{r.hubsAtRisk}</div><div className="note muted">lấp đầy &gt; 90%</div></div>
          <div className="card kpi"><div className="label">Tổng thiếu hụt xe</div><div className="value">{r.totalShortage}</div><div className="note muted">xe cần bổ sung</div></div>
        </div>
        <div className="grid side-wide">
          <div className="col">
            <div className="card"><h3 className="mb-8">Tỉ lệ lấp đầy chỗ đỗ theo thời gian</h3><OccupancyChart r={r} /></div>
            <div className="card">
              <h3 className="mb-8">Chỉ số theo Hub</h3>
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Hub</th><th>Đáp ứng</th><th>Thiếu xe</th><th>Lấp đầy đỉnh</th><th>Xe cuối kỳ</th><th>Pin thấp cuối kỳ</th></tr></thead>
                <tbody>{r.hubs.map((h) => (
                  <tr key={h.hubId}><td><b>{h.name}</b>{h.overloadRisk && <> <Pill tone="red" label="Quá tải" /></>}</td><td>{h.serviceRatePct}%</td><td>{h.shortageVehicles}</td>
                    <td style={{ color: h.peakOccupancyPct > 90 ? 'var(--red)' : undefined }}>{h.peakOccupancyPct}%</td><td>{h.endAvailable} <span className="tiny muted">(min {h.minAvailable})</span></td><td>{h.endLowBattery}</td></tr>))}</tbody>
              </table></div>
            </div>
          </div>
          <div className="card" style={{ alignSelf: 'start' }}>
            <h3>Khuyến nghị ({run.recommendations.length})</h3>
            <p className="small muted mt-4 mb-12">Khuyến nghị dựa trên snapshot cũ – trước khi áp dụng hệ thống so sánh với trạng thái hiện tại và kiểm tra khả thi từng mục.</p>
            {run.recommendations.length === 0 ? <Empty icon="👍" title="Không cần can thiệp" /> : run.recommendations.map((rec) => (
              <label key={rec.id} className="list-item" style={{ alignItems: 'flex-start', cursor: rec.status === 'PROPOSED' ? 'pointer' : 'default' }}>
                <input type="checkbox" disabled={rec.status !== 'PROPOSED'} checked={picked.includes(rec.id)} onChange={() => setPicked(picked.includes(rec.id) ? picked.filter((x) => x !== rec.id) : [...picked, rec.id])} />
                <div style={{ flex: 1 }}>
                  <div className="row between"><b className="small">{rec.type === 'TRANSFER' ? '⇄ Điều chuyển xe' : '⚡ Ưu tiên lịch sạc'}</b><Pill status={rec.status} /></div>
                  <div className="small">{rec.rationale}</div>
                  {rec.appliedRef && <div className="tiny muted mt-4">→ {rec.appliedRef}{rec.applyResult ? ` · ${rec.applyResult}` : ''}</div>}
                  {rec.status === 'FAILED' && rec.applyResult && <div className="tiny" style={{ color: 'var(--red)' }}>{rec.applyResult}</div>}
                </div>
              </label>))}
            {run.recommendations.some((x) => x.status === 'PROPOSED') && <button className="btn block mt-12" disabled={busy || !picked.length} onClick={doPreview}>{busy ? <Spinner /> : `Xem trước khi áp dụng (${picked.length})`}</button>}
          </div>
        </div>
      </>)}
      <Modal open={!!preview} onClose={() => setPreview(null)} wide>
        {preview && (<>
          <h2>Xem trước áp dụng khuyến nghị</h2>
          <p className="muted mt-4">Snapshot {timeSec(preview.snapshotTakenAt)} ↔ hiện tại {timeSec(preview.liveAt)} · token hết hạn lúc {timeSec(preview.tokenExpiresAt)}</p>
          {preview.stale && <div className="banner warn mt-12">⚠ {preview.staleWarning}</div>}
          <div className="table-wrap mt-12"><table className="table">
            <thead><tr><th>Hub</th><th>Xe sẵn sàng</th><th>Chỗ trống</th><th>Cổng hoạt động</th></tr></thead>
            <tbody>{preview.diffs.map((d) => (
              <tr key={d.hubId} style={{ background: d.significant ? 'var(--orange-50)' : undefined }}><td><b>{d.hubName}</b>{d.significant && <span className="tiny" style={{ color: 'var(--orange)' }}> · thay đổi đáng kể</span>}</td>
                <td><Delta a={d.snapshotAvailable} b={d.liveAvailable} /></td><td><Delta a={d.snapshotFreeSlots} b={d.liveFreeSlots} /></td><td><Delta a={d.snapshotWorkingPorts} b={d.liveWorkingPorts} /></td></tr>))}</tbody>
          </table></div>
          <h3 className="mt-16 mb-8">Kiểm tra khả thi trên dữ liệu hiện tại</h3>
          {preview.items.map((i) => (
            <div key={i.recommendationId} className={`banner ${i.feasible ? 'success' : 'error'} small mb-8`}><div><b>{i.feasible ? '✓' : '✕'} {i.summary}</b><div>{i.reason}</div></div></div>))}
          <div className="banner info small">Chỉ các mục khả thi được áp dụng. Khi áp dụng, hệ thống kiểm tra lại lần nữa và tạo lệnh điều chuyển (giữ chỗ Hub đích) / bản nháp lịch sạc; mục đã áp dụng không thể áp dụng lại.</div>
          <div className="row mt-16"><span className="spacer" /><button className="btn ghost" onClick={() => setPreview(null)}>Hủy</button>
            <button className="btn" disabled={busy || !preview.items.some((i) => i.feasible)} onClick={apply}>{busy ? <Spinner /> : `Áp dụng ${preview.items.filter((i) => i.feasible).length} khuyến nghị`}</button></div>
        </>)}
      </Modal>
      <Modal open={!!result} onClose={() => setResult(null)}>
        {result && (<>
          <h2>Kết quả áp dụng</h2>
          <div className="grid cols-2 mt-12"><div className="stat-tile"><div className="label">Thành công</div><div className="value">{result.applied}</div></div><div className="stat-tile"><div className="label">Thất bại</div><div className="value" style={{ color: result.failed ? 'var(--red)' : undefined }}>{result.failed}</div></div></div>
          <div className="mt-12">{result.results.map((x) => <KV key={x.recommendationId} k={<Pill status={x.status} />} v={<span className="small">{x.appliedRef ? `${x.appliedRef} · ` : ''}{x.message}</span>} />)}</div>
          <div className="row mt-16"><Link className="btn ghost block" to="/ops/transfers">Xem lệnh điều chuyển</Link><Link className="btn ghost block" to="/ops/charging">Xem lịch sạc</Link></div>
        </>)}
      </Modal>
    </div>
  );
}

function Delta({ a, b }: { a: number; b: number }) {
  const d = b - a;
  return <span>{a} → <b>{b}</b> {d !== 0 && <span className={d > 0 ? 'diff-up' : 'diff-down'}>({d > 0 ? '+' : ''}{d})</span>}</span>;
}
