import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, HttpError } from '../../api/client';
import type { RatingResult, ReservationView, TripView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { Empty, ErrorBanner, Field, KV, Loading, Pill, Spinner, Stars, errorText, useToast } from '../../components/ui';
import { dateTime, shortDateTime, time, vnd, vehicleTypeLabel } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

/** AC05 lịch sử chuyến đi + RE02 lịch sử đặt xe. */
export function TripsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') ?? 'trips';
  return (
    <div className="page">
      <PageHead eyebrow="Chuyến đi của tôi" title={tab === 'trips' ? 'Lịch sử chuyến đi' : 'Lịch sử đặt xe'}
        right={<div className="seg"><button className={tab === 'trips' ? 'on' : ''} onClick={() => setSp({})}>Lịch sử chuyến đi</button><button className={tab === 'reservations' ? 'on' : ''} onClick={() => setSp({ tab: 'reservations' })}>Lịch sử đặt xe</button></div>} />
      {tab === 'trips' ? <TripHistory /> : <ReservationHistory />}
    </div>
  );
}

function TripHistory() {
  const nav = useNavigate();
  const { data, loading, error } = useLoad(() => api<TripView[]>('/api/v1/trips'));
  const [sel, setSel] = useState<TripView | null>(null);
  useEffect(() => { if (data?.length && !sel) setSel(data[0]); }, [data, sel]);
  if (loading) return <Loading />;
  if (error) return <ErrorBanner error={error} />;
  if (!data?.length) return <div className="card"><Empty icon="🛵" title="Bạn chưa có chuyến đi nào"><button className="btn mt-12" onClick={() => nav('/')}>Đặt xe ngay</button></Empty></div>;
  return (
    <div className="grid side-wide">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Ngày</th><th>Lộ trình</th><th>Quãng đường</th><th>Chi phí</th><th>Trạng thái</th></tr></thead>
          <tbody>{data.map((t) => (
            <tr key={t.id} className={`clickable ${sel?.id === t.id ? 'selected' : ''}`} onClick={() => setSel(t)}>
              <td>{shortDateTime(t.startedAt)}</td><td>{t.startHubName} → {t.endHubName ?? '…'}<div className="tiny muted">{t.vehicleCode}</div></td>
              <td>{t.distanceKm} km</td><td>{vnd(t.cost)}</td>
              <td>{t.status === 'COMPLETED' ? (t.rated ? <Pill tone="green" label="Đã đánh giá" /> : <Pill tone="orange" label="Chưa đánh giá" />) : <Pill status={t.status} />}</td>
            </tr>))}</tbody>
        </table>
      </div>
      {sel && (
        <div className="card">
          <h3>Chi tiết chuyến đi #{sel.code}</h3>
          <div className="mt-12">
            <KV k="Thời gian" v={`${time(sel.startedAt)} – ${time(sel.endedAt)} (${sel.durationMinutes} phút)`} />
            <KV k="Lộ trình" v={`${sel.startHubName} → ${sel.endHubName ?? '—'}`} /><KV k="Quãng đường" v={`${sel.distanceKm} km`} />
            <KV k="Pin lúc nhận → trả" v={`${sel.startBattery}% → ${sel.endBattery ?? '—'}%`} />
            <KV k="Phương tiện" v={`${sel.vehicleCode} · ${vehicleTypeLabel(sel.vehicleType)}`} /><KV k="Chi phí chuyến đi" v={vnd(sel.cost)} />
          </div>
          {sel.status === 'COMPLETED' && !sel.rated && <Link className="btn block mt-16" to={`/trips/${sel.id}/rate`}>★ Đánh giá chuyến đi</Link>}
          {sel.status !== 'COMPLETED' && <Link className="btn block mt-16" to={`/trips/${sel.id}/live`}>Mở chuyến đi</Link>}
        </div>
      )}
    </div>
  );
}

const GROUPS: [string, string[]][] = [['Tất cả', []], ['Đang giữ chỗ', ['RESERVED', 'PICKUP_PENDING']], ['Đã nhận xe', ['PICKED_UP']], ['Hoàn tất', ['COMPLETED']], ['Đã hủy', ['CANCELLED']], ['Đã hết hạn', ['EXPIRED']]];

function ReservationHistory() {
  const { data, loading, error, reload } = useLoad(() => api<ReservationView[]>('/api/v1/reservations'));
  const [g, setG] = useState(0);
  const [sel, setSel] = useState<ReservationView | null>(null);
  if (loading) return <Loading />;
  if (error) return <div className="banner error">Lỗi tạm thời khi tải dữ liệu. <button className="btn link" onClick={reload}>Thử tải lại</button></div>;
  if (!data?.length) return <div className="card"><Empty icon="📋" title="Bạn chưa có lịch sử đặt xe" /></div>;
  const list = data.filter((r) => GROUPS[g][1].length === 0 || GROUPS[g][1].includes(r.status));
  return (
    <div className="grid side-wide">
      <div>
        <div className="row wrap mb-12">{GROUPS.map(([n], i) => <button key={n} className={`chip ${g === i ? 'on' : ''}`} onClick={() => setG(i)}>{n}</button>)}</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Mã đơn</th><th>Phương tiện · Hub</th><th>Đặt / hạn</th><th>Trạng thái</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id} className={`clickable ${sel?.id === r.id ? 'selected' : ''}`} onClick={() => setSel(r)}>
                <td className="mono">{r.code}{r.direct && <div className="tiny muted">thuê trực tiếp</div>}</td><td>{r.vehicleCode}<div className="tiny muted">{r.hubName}</div></td>
                <td>{shortDateTime(r.reservedAt)}<div className="tiny muted">hạn {time(r.expiresAt)}</div></td><td><Pill status={r.status} /></td>
              </tr>))}</tbody>
          </table>
        </div>
      </div>
      {sel && (
        <div className="card">
          <h3>Chi tiết đơn #{sel.code}</h3>
          <div className="mt-12"><KV k="Trạng thái" v={<Pill status={sel.status} />} /><KV k="Phương tiện" v={sel.vehicleCode} /><KV k="Hub" v={sel.hubName} />
            <KV k="Thời điểm đặt" v={dateTime(sel.reservedAt)} /><KV k="Hạn giữ chỗ" v={dateTime(sel.expiresAt)} />
            {sel.closeReason && <KV k="Lý do đóng" v={sel.closeReason} />}{sel.tripCode && <KV k="Chuyến đi" v={sel.tripCode} />}</div>
          <h3 className="mt-16 mb-8">Lịch sử trạng thái & gia hạn</h3>
          <div className="timeline">
            <div className="step done"><b>Tạo đơn – giữ chỗ 15 phút</b><div className="tiny muted">{dateTime(sel.reservedAt)}</div></div>
            {sel.extensions.map((e, i) => <div key={i} className="step done"><b>Gia hạn lần {i + 1} (+10 phút)</b><div className="tiny muted">{time(e.oldExpiresAt)} → {time(e.newExpiresAt)}</div></div>)}
            {sel.closedAt && <div className={`step ${sel.status === 'COMPLETED' ? 'done' : 'fail'}`}><b>{sel.status}</b><div className="tiny muted">{dateTime(sel.closedAt)}</div></div>}
          </div>
          {['RESERVED', 'PICKUP_PENDING'].includes(sel.status) && <Link className="btn block mt-12" to={`/reservations/${sel.id}`}>Mở đơn</Link>}
        </div>
      )}
    </div>
  );
}

const ISSUES = ['Phanh không ăn / kẹt xích', 'Pin sụt nhanh bất thường', 'Khóa xe không hoạt động', 'Lốp xẹp / hư hỏng thân xe', 'Hub bẩn / thiếu chỗ đỗ', 'Khác'];

/** AC06 – Đánh giá chuyến đi (≤2 sao hoặc có sự cố → ticket). E2: mất mạng → lưu nháp và gửi lại. */
export function RatingPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const draftKey = `unigo.rating.${id}`;
  const trip = useLoad(() => api<TripView>(`/api/v1/trips/${id}`), [id]);
  const init = JSON.parse(localStorage.getItem(draftKey) ?? 'null') ?? { vehicleStars: 5, hubStars: 5, comment: '', reportIssue: false, issueType: ISSUES[0], photoUrls: [] as string[], safetyCritical: false };
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RatingResult | null>(null);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api<RatingResult>(`/api/v1/trips/${id}/rating`, { body: f });
      if (localStorage.getItem(draftKey)) toast('Đã gửi đánh giá lưu nháp', 'success');
      localStorage.removeItem(draftKey);
      setDone(r);
    } catch (e) {
      if (e instanceof HttpError && e.status === 0) {
        localStorage.setItem(draftKey, JSON.stringify(f));
        setError('Mất kết nối mạng – đánh giá đã được lưu nháp trên thiết bị và sẽ gửi lại khi có kết nối.');
      } else setError(errorText(e));
    } finally { setBusy(false); }
  };
  useEffect(() => {
    const retry = () => { if (localStorage.getItem(draftKey)) submit(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!trip.data) return <Loading />;
  const t = trip.data;
  if (done) return (
    <div className="page narrow"><div className="card pad-lg center">
      <div className="modal-icon green">★</div><h1>Cảm ơn bạn đã đánh giá!</h1><p className="muted mt-8">{done.message}</p>
      <button className="btn block mt-16" onClick={() => nav('/trips')}>Về lịch sử chuyến đi</button></div></div>
  );
  return (
    <div className="page narrow">
      <div className="card pad-lg">
        <h1>Đánh giá chuyến đi #{t.code}</h1>
        <p className="muted mt-8">{t.startHubName} → {t.endHubName} · {t.durationMinutes} phút · {t.distanceKm} km · {t.vehicleCode}</p>
        {t.rated && <div className="banner warn mt-12">Chuyến đi này đã được đánh giá.</div>}
        <div className="grid cols-2 mt-16">
          <div><b>Chất lượng xe {t.vehicleCode}</b><div className="mt-8"><Stars value={f.vehicleStars} onChange={(v) => setF({ ...f, vehicleStars: v })} /></div></div>
          <div><b>Dịch vụ tại Hub {t.endHubName}</b><div className="mt-8"><Stars value={f.hubStars} onChange={(v) => setF({ ...f, hubStars: v })} /></div></div>
        </div>
        <Field label="Nhận xét" hint={`${f.comment.length}/500`}><textarea className="textarea mt-8" maxLength={500} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></Field>
        <div className="card flat" style={{ background: 'var(--bg)' }}>
          <label className="checkbox"><input type="checkbox" checked={f.reportIssue} onChange={(e) => setF({ ...f, reportIssue: e.target.checked })} /> <b>Báo cáo sự cố kèm ảnh chụp</b></label>
          {f.reportIssue && (
            <div className="mt-12">
              <Field label="Loại sự cố"><select className="select" value={f.issueType} onChange={(e) => setF({ ...f, issueType: e.target.value })}>{ISSUES.map((i) => <option key={i}>{i}</option>)}</select></Field>
              <Field label="Ảnh chụp (tối đa 3)">
                <div className="row">{f.photoUrls.map((_: string, i: number) => <div key={i} className="slot free" style={{ width: 64 }}>🖼️</div>)}
                  {f.photoUrls.length < 3 && <button className="btn ghost" onClick={() => setF({ ...f, photoUrls: [...f.photoUrls, `photo-${Date.now()}.jpg`] })}>+ Thêm ảnh</button>}</div>
              </Field>
              <label className="checkbox"><input type="checkbox" checked={f.safetyCritical} onChange={(e) => setF({ ...f, safetyCritical: e.target.checked })} /> Sự cố an toàn nghiêm trọng (xe sẽ ngừng cho thuê ngay)</label>
            </div>
          )}
        </div>
        <div className="banner info small mt-12">Đánh giá ≤ 2 sao hoặc có báo sự cố sẽ tạo ticket hỗ trợ gửi Đơn vị vận hành.</div>
        {error && <div className="banner warn mt-12">{error}</div>}
        <div className="row mt-16"><button className="btn ghost block" onClick={() => nav('/trips')}>Bỏ qua</button><button className="btn block" disabled={busy || t.rated} onClick={submit}>{busy ? <Spinner /> : 'Gửi đánh giá'}</button></div>
      </div>
    </div>
  );
}
