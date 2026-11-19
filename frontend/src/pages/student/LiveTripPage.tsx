import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, call } from '../../api/client';
import type { HubSummary, ReturnResult, SearchResult, SlotView, TripView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { NextOutcome, SimButton, SimPanel } from '../../components/SimPanel';
import { Battery, KV, Loading, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { dateTime, mmss, time, vnd, vehicleTypeLabel } from '../../lib/format';
import { useLoad, useNow } from '../../lib/hooks';
import { offlineOtp } from '../../lib/otp';

const estimate = (t: TripView, minutes: number) => 3000 + Math.max(1, minutes) * (t.vehicleType === 'E_SCOOTER' ? 500 : 300);

/** RE05 chuyến đang diễn ra, RE06 trả xe (online + offline OTP). Góp ý #6: chỉ hoàn tất khi có bằng chứng vật lý. */
export function LiveTripPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const toast = useToast();
  const now = useNow();
  const trip = useLoad(() => api<TripView>(`/api/v1/trips/${id}`), [id], 10000);
  const hubs = useLoad(() => api<SearchResult>('/api/v1/hubs'), [], 30000);
  const [hubId, setHubId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [parkedSlot, setParkedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [offline, setOffline] = useState(false);
  const [otp, setOtp] = useState('');
  const [offlineAt, setOfflineAt] = useState<string | null>(null);

  const t = trip.data;
  // Lưu secret để tính OTP khi mất mạng
  useEffect(() => { if (t?.offlineSecret) localStorage.setItem(`unigo.trip.${t.id}.secret`, t.offlineSecret); }, [t]);
  useEffect(() => {
    if (!offline || !t) return;
    const secret = t.offlineSecret ?? localStorage.getItem(`unigo.trip.${t.id}.secret`);
    if (!secret) return;
    const upd = () => offlineOtp(secret, offlineAt ? new Date(offlineAt) : new Date()).then(setOtp);
    upd();
    const h = setInterval(upd, 15000);
    return () => clearInterval(h);
  }, [offline, t, offlineAt]);

  const loadSlots = (h: number) => api<SlotView[]>(`/api/v1/hubs/${h}/slots?kind=SHARED`).then(setSlots).catch(() => setSlots([]));
  useEffect(() => { if (hubId) loadSlots(hubId); }, [hubId]);
  useEffect(() => { if (!hubId && hubs.data?.items.length && t) setHubId(t.startHubId); }, [hubs.data, t, hubId]);

  const minutes = useMemo(() => (t ? Math.floor((now - new Date(t.startedAt).getTime()) / 60000) : 0), [now, t]);
  if (!t) return <Loading />;
  const done = t.status === 'COMPLETED' || result?.state === 'COMPLETED';
  const pending = t.status === 'PENDING_RECONCILIATION' || result?.state === 'PENDING_RECONCILIATION';

  const confirmReturn = async () => {
    setBusy(true);
    try {
      const { data } = await call<ReturnResult>(`/api/v1/trips/${t.id}/return`, { body: {} });
      setResult(data);
      trip.setData(data.trip);
      toast(data.message, data.state === 'COMPLETED' ? 'success' : 'info');
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const syncOffline = async () => {
    setBusy(true);
    try {
      const { data } = await call<ReturnResult>(`/api/v1/trips/${t.id}/offline-return`, { body: { otp, clientEndedAt: offlineAt ?? new Date().toISOString() } });
      setResult(data);
      trip.setData(data.trip);
      toast(data.message, 'info');
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  if (done) {
    const s = result?.trip ?? t;
    return (
      <div className="page narrow">
        <div className="card pad-lg center">
          <div className="modal-icon green">✓</div>
          <h1>Trả xe thành công!</h1>
          <p className="muted mt-8">Thiết bị đã xác nhận khóa xe tại {s.endHubName}{s.endSlotCode ? ` – ô ${s.endSlotCode}` : ''}.</p>
          <div className="mt-16" style={{ textAlign: 'left' }}>
            <KV k="Mã chuyến đi" v={s.code} /><KV k="Phương tiện" v={`${s.vehicleCode} · ${vehicleTypeLabel(s.vehicleType)}`} />
            <KV k="Thời gian sử dụng" v={`${s.durationMinutes} phút (${time(s.startedAt)} – ${time(s.endedAt)})`} />
            <KV k="Lộ trình" v={`${s.startHubName} → ${s.endHubName ?? '—'}`} /><KV k="Quãng đường" v={`${s.distanceKm} km`} />
            <KV k="Pin lúc nhận → trả" v={`${s.startBattery}% → ${s.endBattery ?? '—'}%`} />
            {result?.nextVehicleStatus && <KV k="Trạng thái xe sau khi trả" v={<Pill status={result.nextVehicleStatus} />} />}
            <KV k="Chi phí chuyến đi" v={<b style={{ color: 'var(--primary)' }}>{vnd(s.cost)}</b>} />
          </div>
          <div className="banner info small mt-16" style={{ textAlign: 'left' }}>Chi phí được tính bởi dịch vụ thanh toán mô phỏng dựa trên thời lượng và quãng đường.</div>
          <Link className="btn lg block mt-16" to={`/trips/${s.id}/rate`}>★ Đánh giá chuyến đi</Link>
          <Link className="btn ghost block mt-8" to="/">Về trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {sp.get('started') && <div className="banner success mb-16">🔓 Mở khóa thành công – thiết bị đã xác nhận. Chuyến đi {t.code} bắt đầu lúc {time(t.startedAt)}.</div>}
      <PageHead eyebrow="Chuyến đi" title={`Chuyến đi ${t.vehicleCode} – xuất phát ${t.startHubName} lúc ${time(t.startedAt)}`} right={<Pill status={t.status} />} />
      <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
        <div className="col">
          {pending ? (
            <div className="card pad-lg">
              <div className="modal-icon">⏳</div>
              <h2 className="center">Chuyến đi đang chờ đối soát</h2>
              <p className="center muted mt-8">{result?.message ?? t.reconciliationNote}</p>
              <div className="banner warn mt-16">Chuyến đi chỉ chuyển "Hoàn tất" khi hệ thống nhận được <b>bằng chứng vật lý</b>: cảm biến xác nhận xe nằm trong ô hợp lệ và đã khóa an toàn. OTP chỉ dùng để xác thực yêu cầu trả xe.</div>
              <SimPanel title="Giả lập bằng chứng vật lý">
                <SimButton label="🔒 Xe đã khóa (cảm biến báo)" path={`/api/v1/sim/vehicles/${t.vehicleId}/lock`} body={{ state: 'LOCKED' }} onDone={() => setTimeout(trip.reload, 1500)} />
                <span className="tiny muted">Tiến trình đối soát chạy mỗi 20 giây.</span>
              </SimPanel>
              <button className="btn ghost block mt-12" onClick={trip.reload}>⟳ Kiểm tra lại</button>
            </div>
          ) : (
            <div className="card pad-lg">
              <div className="row between"><h2>Trả xe tại Hub</h2>
                <label className="checkbox small"><input type="checkbox" checked={offline} onChange={(e) => { setOffline(e.target.checked); setOfflineAt(e.target.checked ? new Date().toISOString() : null); }} /> Tôi đang mất kết nối mạng (trả xe offline)</label></div>
              <div className="timeline mt-16">
                <div className={`step ${parkedSlot ? 'done' : 'current'}`}>
                  <b>1. Đỗ xe vào vị trí trống hợp lệ</b>
                  <div className="small muted">Thiết bị tại Hub phải xác nhận xe nằm trong ô đỗ hợp lệ.</div>
                  <div className="row mt-8">
                    <select className="select" style={{ maxWidth: 260 }} value={hubId ?? ''} onChange={(e) => setHubId(Number(e.target.value))}>
                      {hubs.data?.items.map((h: HubSummary) => <option key={h.id} value={h.id}>{h.name} · {h.freeSharedSlots} chỗ trống</option>)}
                    </select>
                  </div>
                  <div className="slot-grid mt-8">
                    {slots.map((s) => (
                      <div key={s.id} className={`slot ${s.status === 'AVAILABLE' ? 'free pick' : s.status === 'HELD' ? 'held' : s.vehicleCode === t.vehicleCode ? 'selected free' : 'busy'}`}
                        title={s.status === 'HELD' ? 'Ô đã giữ cho xe điều chuyển tới' : s.status}
                        onClick={async () => {
                          if (s.status !== 'AVAILABLE') return;
                          try { await api(`/api/v1/sim/vehicles/${t.vehicleId}/park`, { body: { slotId: s.id } }); setParkedSlot(s.code); toast(`Cảm biến xác nhận ${t.vehicleCode} trong ô ${s.code}`, 'success'); if (hubId) loadSlots(hubId); }
                          catch (e) { toast(errorText(e), 'error'); }
                        }}>{s.code}</div>
                    ))}
                  </div>
                  <div className="legend mt-8"><span style={{ ['--c' as string]: '#eef3ff' }}>Trống (bấm để giả lập đỗ)</span><span style={{ ['--c' as string]: '#9b8cf5' }}>Giữ cho xe điều chuyển</span><span style={{ ['--c' as string]: '#c96f3a' }}>Có xe</span></div>
                  {parkedSlot && <div className="banner success small mt-8">✓ Thiết bị xác nhận {t.vehicleCode} nằm trong ô {parkedSlot}</div>}
                </div>
                <div className="step"><b>2. Kiểm tra lại xe trước khi trả</b><div className="small muted">Xe không hư hỏng, đã tắt nguồn. Nếu có hư hỏng: <Link to={`/report?vehicle=${t.vehicleCode}&hub=${hubId ?? ''}&trip=${t.id}`}>lập biên bản sự cố kèm ảnh</Link>.</div></div>
                <div className="step"><b>3. Xác nhận trả xe</b><div className="small muted">Hệ thống gửi lệnh khóa xe, chỉ kết thúc chuyến khi thiết bị xác nhận đã khóa.</div></div>
              </div>
              {!offline ? (
                <>
                  <SimPanel title="Giả lập lệnh khóa xe">
                    <NextOutcome deviceType="VEHICLE" deviceId={t.vehicleId} />
                  </SimPanel>
                  <button className="btn lg block mt-12" disabled={busy || !parkedSlot} onClick={confirmReturn}>{busy ? <Spinner /> : 'Xác nhận trả xe'}</button>
                  {!parkedSlot && <p className="tiny muted mt-8">Cần cảm biến ô đỗ xác nhận trước khi trả xe.</p>}
                </>
              ) : (
                <div className="card flat mt-12" style={{ background: 'var(--bg)' }}>
                  <b>Trả xe offline bằng mã OTP</b>
                  <p className="small muted mt-8">Mã được tính ngay trên điện thoại (không cần mạng) và thay đổi mỗi 5 phút. Nhập mã tại thiết bị của Hub hoặc đồng bộ khi có mạng trở lại.</p>
                  <div className="center mt-12"><div className="mono" style={{ fontSize: 38, fontWeight: 800, letterSpacing: 8, color: 'var(--primary)' }}>{otp || '······'}</div>
                    <div className="tiny muted">Thời điểm trả xe ghi nhận: {offlineAt ? dateTime(offlineAt) : '—'}</div></div>
                  <div className="banner warn small mt-12">OTP chỉ xác thực yêu cầu trả xe. Chuyến đi sẽ ở trạng thái <b>chờ đối soát</b> cho đến khi thiết bị xác nhận xe đã vào đúng ô và khóa an toàn.</div>
                  <button className="btn block mt-12" disabled={busy || !otp} onClick={syncOffline}>{busy ? <Spinner /> : 'Đồng bộ yêu cầu trả xe offline'}</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3>Tóm tắt tạm tính</h3>
          <div className="mt-12">
            <div className="stat-tile mb-8"><div className="label">Chi phí tạm tính</div><div className="value">{vnd(estimate(t, minutes))}</div></div>
            <div className="stat-tile mb-8"><div className="label">Thời gian đã đi</div><div className="value">{mmss((now - new Date(t.startedAt).getTime()) / 1000)}</div></div>
            <div className="stat-tile"><div className="label">Pin hiện tại</div><div className="value">{t.currentBattery ?? '—'}%</div><Battery value={t.currentBattery} showText={false} /></div>
          </div>
          <div className="mt-12"><KV k="Quãng đường" v={`${t.distanceKm} km`} /><KV k="Xe" v={`${t.vehicleCode} · ${vehicleTypeLabel(t.vehicleType)}`} /></div>
          <Link className="btn danger-soft block mt-12" to={`/report?vehicle=${t.vehicleCode}&hub=${t.startHubId}&trip=${t.id}`}>⚠ Báo xe gặp sự cố</Link>
        </div>
      </div>
    </div>
  );
}
