import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, newIdempotencyKey } from '../../api/client';
import type { BookingView, ExtendQuote, PersonalVehicleView, QuoteResult, SearchResult, SlotView, PortView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { NextOutcome, SimButton, SimPanel } from '../../components/SimPanel';
import { ConfirmModal, Empty, ErrorBanner, Field, KV, Loading, Modal, Pill, Qr, Spinner, errorText, useToast } from '../../components/ui';
import { dateTime, fromLocalInput, shortDateTime, time, toLocalInput, vnd } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

const SERVICE: Record<string, string> = { PARK: 'Chỉ đỗ xe', CHARGE: 'Chỉ sạc xe', BOTH: 'Đỗ + Sạc' };

export function BookingsPage() {
  const nav = useNavigate();
  const { data, loading, error } = useLoad(() => api<BookingView[]>('/api/v1/bookings'), [], 20000);
  return (
    <div className="page">
      <PageHead eyebrow="Xe cá nhân" title="Đặt chỗ đỗ & lịch sạc" sub="Đặt trước vị trí đỗ và đăng ký lịch sạc tại Hub cho phương tiện cá nhân"
        right={<><Link className="btn ghost" to="/vehicles">🚘 Phương tiện của tôi</Link><Link className="btn" to="/bookings/new">+ Đặt chỗ mới</Link></>} />
      {loading ? <Loading /> : error ? <ErrorBanner error={error} /> : !data?.length ? (
        <div className="card"><Empty icon="🅿️" title="Chưa có lượt đặt chỗ nào"><Link className="btn mt-12" to="/bookings/new">Đặt chỗ ngay</Link></Empty></div>
      ) : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Mã</th><th>Hub · Ô / Cổng</th><th>Dịch vụ</th><th>Khung giờ</th><th>Trạng thái</th><th className="right">Chi phí</th></tr></thead>
          <tbody>{data.map((b) => (
            <tr key={b.id} className="clickable" onClick={() => nav(`/bookings/${b.id}`)}>
              <td className="mono">{b.code}</td><td>{b.hubName}<div className="tiny muted">{[b.slotCode && `Ô ${b.slotCode}`, b.portCode && `Cổng ${b.portCode}`].filter(Boolean).join(' · ')}</div></td>
              <td>{SERVICE[b.serviceType]}</td><td>{shortDateTime(b.startAt)} – {time(b.endAt)}</td><td><Pill status={b.status} /></td><td className="right">{vnd(b.cost ?? b.estimatedCost)}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}

/** PV01 – Đặt chỗ đỗ & đặt lịch sạc (góp ý #7: "Cả hai" giữ đồng thời hoặc không giữ gì). */
export function NewBookingPage() {
  const nav = useNavigate();
  const toast = useToast();
  const hubs = useLoad(() => api<SearchResult>('/api/v1/hubs'));
  const vehicles = useLoad(() => api<PersonalVehicleView[]>('/api/v1/me/vehicles'));
  const start0 = useMemo(() => { const d = new Date(Date.now() + 30 * 60000); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); return d; }, []);
  const [hubId, setHubId] = useState<number | ''>('');
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  const [service, setService] = useState<'PARK' | 'CHARGE' | 'BOTH'>('BOTH');
  const [start, setStart] = useState(toLocalInput(start0));
  const [end, setEnd] = useState(toLocalInput(new Date(start0.getTime() + 2 * 3600000)));
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [ports, setPorts] = useState<PortView[]>([]);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [portId, setPortId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!hubId && hubs.data?.items.length) setHubId(hubs.data.items[0].id); }, [hubs.data, hubId]);
  useEffect(() => { if (!vehicleId && vehicles.data?.length) setVehicleId(vehicles.data[0].id); }, [vehicles.data, vehicleId]);
  useEffect(() => { setQuote(null); }, [hubId, vehicleId, service, start, end]);
  const vehicle = vehicles.data?.find((v) => v.id === vehicleId);

  const check = async () => {
    setBusy(true);
    setError('');
    try {
      const body = { hubId, personalVehicleId: vehicleId, serviceType: service, startAt: fromLocalInput(start), endAt: fromLocalInput(end) };
      const q = await api<QuoteResult>('/api/v1/bookings/quote', { body });
      setQuote(q);
      setSlotId(q.suggestedSlotId);
      setPortId(q.suggestedPortId);
      const range = `start=${encodeURIComponent(body.startAt)}&end=${encodeURIComponent(body.endAt)}`;
      setSlots(await api<SlotView[]>(`/api/v1/hubs/${hubId}/slots?kind=PERSONAL&${range}`));
      setPorts(vehicle ? await api<PortView[]>(`/api/v1/hubs/${hubId}/ports?connector=${vehicle.connectorType}&${range}`) : []);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const b = await api<BookingView>('/api/v1/bookings', { body: { hubId, personalVehicleId: vehicleId, serviceType: service, startAt: fromLocalInput(start), endAt: fromLocalInput(end), slotId: service === 'CHARGE' ? null : slotId, portId: service === 'PARK' ? null : portId } });
      toast(b.message ?? 'Đặt chỗ thành công', 'success');
      nav(`/bookings/${b.id}`);
    } catch (e) { setError(errorText(e) + ' Vui lòng kiểm tra lại khả dụng.'); setQuote(null); } finally { setBusy(false); }
  };

  if (vehicles.data && vehicles.data.length === 0) return (
    <div className="page narrow"><div className="card"><Empty icon="🚘" title="Bạn cần khai báo ít nhất một phương tiện cá nhân"><Link className="btn mt-12" to="/vehicles">Khai báo phương tiện</Link></Empty></div></div>
  );
  const step = quote ? 2 : 1;
  return (
    <div className="page">
      <PageHead eyebrow="Đặt chỗ cho xe cá nhân" title="Đặt chỗ đỗ & lịch sạc, an tâm đến Hub." />
      <div className="row mb-16 small">
        <Pill tone={step >= 1 ? 'blue' : 'gray'} label="1. Thông tin đặt chỗ" /><span className="muted">→</span>
        <Pill tone={step >= 2 ? 'blue' : 'gray'} label="2. Chọn vị trí khả dụng" /><span className="muted">→</span><Pill tone="gray" label="3. Xác nhận & mã QR" />
      </div>
      <div className="grid side">
        <div className="card pad-lg">
          <div className="grid cols-2" style={{ gap: '0 16px' }}>
            <Field label="Hub điểm đến"><select className="select" value={hubId} onChange={(e) => setHubId(Number(e.target.value))}>{hubs.data?.items.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.freePersonalSlots} chỗ · {h.freePorts} cổng</option>)}</select></Field>
            <Field label="Phương tiện cá nhân"><select className="select" value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))}>{vehicles.data?.map((v) => <option key={v.id} value={v.id}>{v.plateNumber} · {v.model ?? v.type} · {v.connectorType}</option>)}</select></Field>
          </div>
          <Field label="Loại dịch vụ">
            <div className="row">{(['PARK', 'CHARGE', 'BOTH'] as const).map((s) => <button key={s} type="button" className={`choice ${service === s ? 'on' : ''}`} style={{ flex: 1 }} onClick={() => setService(s)}><div className="t">{SERVICE[s]}</div></button>)}</div>
          </Field>
          <div className="grid cols-2" style={{ gap: '0 16px' }}>
            <Field label="Từ"><input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Đến"><input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
          <button className="btn ghost" disabled={busy || !hubId || !vehicleId} onClick={check}>{busy && !quote ? <Spinner /> : '🔎 Kiểm tra khả dụng'}</button>
          {error && <div className="banner error mt-12">{error}</div>}
          {quote && (
            <>
              <div className="divider" />
              <div className="row between"><b>Vị trí khả dụng trong khung giờ {time(quote.startAt)} – {time(quote.endAt)}</b><span className="tiny muted">Kiểm tra lúc {time(quote.checkedAt)} · nhu cầu {quote.demandLevel}</span></div>
              {service !== 'CHARGE' && (<>
                <div className="small muted mt-12 mb-8">Chỗ đỗ</div>
                <div className="slot-grid">{slots.map((s) => <div key={s.id} className={`slot ${s.freeInWindow ? 'free pick' : 'busy'} ${slotId === s.id ? 'selected' : ''}`} onClick={() => s.freeInWindow && setSlotId(s.id)}>{s.code}</div>)}</div>
              </>)}
              {service !== 'PARK' && (<>
                <div className="small muted mt-12 mb-8">Cổng sạc tương thích ({vehicle?.connectorType})</div>
                <div className="row wrap">{ports.filter((p) => p.connectorType === vehicle?.connectorType).map((p) => (
                  <button key={p.id} disabled={!p.freeInWindow} className={`choice ${portId === p.id ? 'on' : ''}`} style={{ opacity: p.freeInWindow ? 1 : .5 }} onClick={() => setPortId(p.id)}>
                    <div className="t">⚡ Cổng {p.code}</div><div className="d">{p.connectorType} · {p.powerKw} kW · {p.freeInWindow ? 'Trống' : 'Bận'}</div></button>))}</div>
              </>)}
              <div className="legend mt-12"><span style={{ ['--c' as string]: '#eef3ff' }}>Trống</span><span style={{ ['--c' as string]: '#c96f3a' }}>Đã có người đặt</span></div>
            </>
          )}
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>Tóm tắt đặt chỗ</h3>
          <div className="mt-12">
            <KV k="Hub" v={hubs.data?.items.find((h) => h.id === hubId)?.name ?? '—'} /><KV k="Phương tiện" v={vehicle?.plateNumber ?? '—'} />
            <KV k="Dịch vụ" v={SERVICE[service]} /><KV k="Ô đỗ" v={service === 'CHARGE' ? '—' : slots.find((s) => s.id === slotId)?.code ?? '—'} />
            <KV k="Cổng sạc" v={service === 'PARK' ? '—' : ports.find((p) => p.id === portId)?.code ?? '—'} />
            <KV k="Khung giờ" v={`${time(fromLocalInput(start))} – ${time(fromLocalInput(end))}`} />
            <KV k="Chi phí ước tính" v={quote ? vnd(quote.estimatedCost) : '—'} />
          </div>
          {service === 'BOTH' && <div className="banner info small mt-12">Với "Đỗ + Sạc", hệ thống giữ <b>đồng thời</b> chỗ đỗ và cổng sạc trong một giao dịch: hoặc giữ được cả hai, hoặc không giữ gì.</div>}
          <div className="banner warn small mt-12">Vui lòng check-in trong vòng 15 phút từ giờ hẹn; quá hạn đơn tự hết hạn.</div>
          <button className="btn lg block mt-16" disabled={!quote || busy || (service !== 'CHARGE' && !slotId) || (service !== 'PARK' && !portId)} onClick={confirm}>{busy && quote ? <Spinner /> : 'Xác nhận đặt chỗ'}</button>
        </div>
      </div>
    </div>
  );
}

/** PV03 check-in/out (góp ý #8: thứ tự vật lý), PV04 gia hạn. */
export function BookingDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: b, setData, reload, error } = useLoad(() => api<BookingView>(`/api/v1/bookings/${id}`), [id], 8000);
  const [busy, setBusy] = useState(false);
  const [ext, setExt] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const [eq, setEq] = useState<ExtendQuote | null>(null);
  const [cancel, setCancel] = useState(false);
  const extKey = useRef('');
  useEffect(() => { if (ext && b) api<ExtendQuote>(`/api/v1/bookings/${b.id}/extend-quote?minutes=${minutes}`).then(setEq).catch((e) => toast(errorText(e), 'error')); }, [ext, minutes, b, toast]);
  if (error) return <div className="page narrow"><ErrorBanner error={error} /></div>;
  if (!b) return <Loading />;

  const act = async (path: string, ok?: string) => {
    setBusy(true);
    try { const r = await api<BookingView>(path, { body: {} }); setData(r); toast(r.message ?? ok ?? 'Đã cập nhật', 'success'); }
    catch (e) { toast(errorText(e), 'error'); reload(); } finally { setBusy(false); }
  };
  const doExtend = async () => {
    setBusy(true);
    try { const r = await api<BookingView>(`/api/v1/bookings/${b.id}/extend`, { body: { minutes }, headers: { 'Idempotency-Key': extKey.current } }); setData(r); toast('Gia hạn thành công', 'success'); setExt(false); }
    catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const steps = [
    { k: 'Đã đặt chỗ – giữ tài nguyên', done: true },
    { k: 'Check-in: thiết bị mở cổng' + (b.serviceType !== 'PARK' ? ' & xác nhận cấp điện' : ''), done: !!b.checkedInAt },
    ...(b.serviceType !== 'PARK' ? [{ k: 'Yêu cầu dừng sạc → thiết bị xác nhận ngắt điện an toàn', done: !!b.chargingStoppedAt }] : [{ k: 'Yêu cầu check-out', done: !!b.chargingStoppedAt }]),
    { k: 'Cảm biến xác nhận xe rời vị trí', done: !!b.vehicleLeftAt },
    { k: 'Giải phóng chỗ đỗ / cổng sạc & tính phí', done: b.status === 'COMPLETED' },
  ];
  const holding = ['BOOKED', 'IN_USE', 'CHECKOUT_REQUESTED', 'AWAITING_EXIT'].includes(b.status);
  return (
    <div className="page">
      <PageHead eyebrow="Phiên đỗ & sạc" title={`${b.code} · ${b.hubName}`} sub={`${SERVICE[b.serviceType]} · ${b.slotCode ? 'Ô ' + b.slotCode : ''}${b.portCode ? ' · Cổng ' + b.portCode + ' (' + b.portPowerKw + ' kW)' : ''}`} right={<Pill status={b.status} />} />
      {b.note && <div className="banner warn mb-16">ℹ️ {b.note}</div>}
      <div className="grid side">
        <div className="col">
          <div className="card pad-lg">
            <div className="grid cols-3">
              <div className="stat-tile"><div className="label">Điện năng đã nạp</div><div className="value">{(b.charging?.energyKwh ?? b.energyKwh ?? 0).toFixed(2)} kWh</div></div>
              <div className="stat-tile"><div className="label">Khung giờ</div><div className="value" style={{ fontSize: 16 }}>{time(b.startAt)} – {time(b.endAt)}</div></div>
              <div className="stat-tile"><div className="label">{b.cost != null ? 'Chi phí' : 'Chi phí ước tính'}</div><div className="value">{vnd(b.cost ?? b.estimatedCost)}</div></div>
            </div>
            {b.charging && <div className="mt-12 small">Phiên sạc: <Pill status={b.charging.status} /> {b.charging.startedAt && <span className="muted">· thiết bị xác nhận cấp điện lúc {time(b.charging.startedAt)}</span>}</div>}
            <h3 className="mt-16 mb-8">Tiến trình phiên (thứ tự vật lý)</h3>
            <div className="timeline">{steps.map((s, i) => <div key={i} className={`step ${s.done ? 'done' : steps.findIndex((x) => !x.done) === i ? 'current' : ''}`}>{s.k}</div>)}</div>
            <div className="row wrap mt-16">
              {b.status === 'BOOKED' && <button className="btn" disabled={busy} onClick={() => act(`/api/v1/bookings/${b.id}/check-in`)}>📷 Quét mã tại điểm check-in</button>}
              {b.status === 'BOOKED' && <button className="btn danger-soft" onClick={() => setCancel(true)}>Hủy đặt chỗ</button>}
              {b.status === 'IN_USE' && <button className="btn soft" onClick={() => { extKey.current = newIdempotencyKey(); setExt(true); }}>⏱ Gia hạn thời gian</button>}
              {b.status === 'IN_USE' && b.charging?.status === 'FAILED' && <button className="btn ghost" disabled={busy} onClick={() => act(`/api/v1/bookings/${b.id}/charging/retry`)}>⚡ Thử khởi động sạc lại</button>}
              {(b.status === 'IN_USE' || b.status === 'CHECKOUT_REQUESTED') && <button className="btn" disabled={busy} onClick={() => act(`/api/v1/bookings/${b.id}/check-out`)}>{b.status === 'CHECKOUT_REQUESTED' ? 'Thử lại dừng sạc' : 'Check-out – quét mã kết thúc'}</button>}
            </div>
            {b.status === 'AWAITING_EXIT' && <div className="banner info mt-12">Thiết bị đã ngắt điện an toàn. Vui lòng rút cáp và đưa xe rời vị trí – chỗ đỗ/cổng chỉ được giải phóng khi cảm biến xác nhận.</div>}
          </div>
          {holding && (
            <SimPanel title="Giả lập thiết bị tại Hub">
              {b.slotId && <NextOutcome deviceType="SLOT" deviceId={b.slotId} />}
              {b.portId && <NextOutcome deviceType="PORT" deviceId={b.portId} />}
              {b.slotId && (b.status === 'AWAITING_EXIT' || b.status === 'IN_USE') && <SimButton label="🚗 Xe rời ô đỗ (cảm biến)" path={`/api/v1/sim/slots/${b.slotId}/vacate`} onDone={() => setTimeout(reload, 800)} />}
              {!b.slotId && b.portId && b.status === 'AWAITING_EXIT' && <SimButton label="🔌 Rút cáp & rời cổng" path={`/api/v1/sim/ports/${b.portId}/unplug`} onDone={() => setTimeout(reload, 800)} />}
            </SimPanel>
          )}
        </div>
        <div className="card center" style={{ alignSelf: 'start' }}>
          <div className="eyebrow">Mã xác nhận đặt chỗ</div>
          <h3>{b.hubName} · {b.slotCode ? `Ô ${b.slotCode}` : ''} {b.portCode ? `· Cổng ${b.portCode}` : ''}</h3>
          <div className="mt-12">{b.qrToken ? <Qr value={b.qrToken} /> : <Empty icon="✔" title="Phiên đã kết thúc" />}</div>
          <div className="mt-12" style={{ textAlign: 'left' }}>
            <KV k="Mã đặt chỗ" v={b.code} /><KV k="Phương tiện" v={b.plateNumber} /><KV k="Từ" v={dateTime(b.startAt)} /><KV k="Đến" v={dateTime(b.endAt)} />
            {b.checkedInAt && <KV k="Check-in" v={time(b.checkedInAt)} />}{b.vehicleLeftAt && <KV k="Rời vị trí" v={time(b.vehicleLeftAt)} />}
          </div>
          <div className="banner info small mt-12" style={{ textAlign: 'left' }}>Đưa mã QR vào máy quét tại cổng Hub. Check-in trước giờ hẹn hoặc trễ tối đa 15 phút.</div>
        </div>
      </div>
      <Modal open={ext} onClose={() => setExt(false)}>
        <h2>Gia hạn thời gian đỗ & sạc</h2>
        <p className="muted mt-8">Phiên {b.code} – {b.slotCode ? `Ô ${b.slotCode}` : ''} {b.portCode ? `· Cổng ${b.portCode}` : ''}</p>
        <div className="row mt-16">{[30, 60, 120].map((m) => <button key={m} className={`choice ${minutes === m ? 'on' : ''}`} style={{ flex: 1 }} onClick={() => setMinutes(m)}><div className="t">+{m >= 60 ? m / 60 + ' giờ' : m + ' phút'}</div></button>)}</div>
        {eq && (<div className="mt-16">
          {eq.available ? <div className="banner success small">✓ Khung giờ tiếp giáp còn trống</div> : <div className="banner error small">✕ {eq.reason}. Vui lòng di chuyển xe đúng giờ để không ảnh hưởng lượt đặt kế tiếp.</div>}
          <KV k="Kết thúc hiện tại" v={time(eq.currentEndAt)} /><KV k="Kết thúc mới" v={time(eq.newEndAt)} /><KV k="Chi phí phát sinh (ước tính)" v={vnd(eq.extraCost)} />
        </div>)}
        <div className="row mt-16"><button className="btn ghost block" onClick={() => setExt(false)}>Hủy</button><button className="btn block" disabled={busy || !eq?.available} onClick={doExtend}>{busy ? <Spinner /> : 'Xác nhận gia hạn'}</button></div>
      </Modal>
      <ConfirmModal open={cancel} danger tone="red" icon="✕" title={`Hủy đặt chỗ ${b.code}?`} body="Chỗ đỗ và cổng sạc sẽ được giải phóng ngay." busy={busy}
        onClose={() => setCancel(false)} onConfirm={async () => { await act(`/api/v1/bookings/${b.id}/cancel`, 'Đã hủy'); setCancel(false); }} />
    </div>
  );
}
