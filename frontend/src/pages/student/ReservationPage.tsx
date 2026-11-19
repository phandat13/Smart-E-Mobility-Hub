import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, newIdempotencyKey, HttpError } from '../../api/client';
import type { ReservationView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { HubMap } from '../../components/HubMap';
import { ConfirmModal, KV, Loading, Pill, errorText, useToast, Battery } from '../../components/ui';
import { mmss, time, dateTime, vehicleTypeLabel } from '../../lib/format';
import { useLoad, useNow } from '../../lib/hooks';

/** RE01 xác nhận & đếm ngược, RE03 hủy, RE04 gia hạn (+10 phút, tối đa 2 lần, idempotent). */
export function ReservationPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: r, setData, reload, error } = useLoad(() => api<ReservationView>(`/api/v1/reservations/${id}`), [id], 15000);
  const now = useNow();
  const [ext, setExt] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  // Một khóa idempotency cho MỖI lần mở hộp thoại gia hạn: bấm lặp / gửi lại do mạng chậm dùng chung khóa
  const extKey = useRef<string>('');

  const left = r ? Math.max(0, (new Date(r.expiresAt).getTime() - now) / 1000) : 0;
  useEffect(() => { if (r?.status === 'RESERVED' && left === 0) reload(); }, [left, r?.status, reload]);
  if (error) return <div className="page narrow"><div className="banner error">{error.message}</div></div>;
  if (!r) return <Loading />;
  const total = (new Date(r.expiresAt).getTime() - new Date(r.reservedAt).getTime()) / 1000;

  const doExtend = async () => {
    setBusy(true);
    try {
      const res = await api<ReservationView>(`/api/v1/reservations/${r.id}/extend`, { body: {}, headers: { 'Idempotency-Key': extKey.current } });
      setData(res);
      toast(res.message ?? 'Gia hạn thành công', 'success');
      setExt(false);
    } catch (e) {
      toast(errorText(e), 'error');
      if (e instanceof HttpError && e.code !== 'CONFLICT') { setExt(false); reload(); }
    } finally { setBusy(false); }
  };
  const doCancel = async () => {
    setBusy(true);
    try { const res = await api<ReservationView>(`/api/v1/reservations/${r.id}/cancel`, { body: {} }); setData(res); toast(res.message ?? 'Đã hủy', 'success'); setCancel(false); }
    catch (e) { toast(errorText(e), 'error'); setCancel(false); reload(); } finally { setBusy(false); }
  };

  const active = r.status === 'RESERVED';
  return (
    <div className="page medium">
      <PageHead eyebrow="Đặt trước phương tiện" title={`Đơn đặt xe #${r.code}`} right={<Link className="btn ghost" to="/trips?tab=reservations">Lịch sử đặt xe</Link>} />
      <div className="grid side-wide">
        <div className="card pad-lg">
          <Pill status={r.status} />
          {active ? (
            <>
              <div className="small muted mt-12">Thời hạn giữ chỗ còn lại</div>
              <div className="countdown">{mmss(left)}</div>
              <div className="bar thick mt-8"><span style={{ width: `${Math.min(100, (left / total) * 100)}%` }} /></div>
              <div className="small muted mt-8">Hết hạn lúc {time(r.expiresAt)} · Đã gia hạn {r.extensionCount}/{r.maxExtensions} lần</div>
            </>
          ) : r.status === 'PICKUP_PENDING' ? (
            <div className="banner info mt-12">Đang xử lý nhận xe / xác minh trạng thái khóa với thiết bị…</div>
          ) : (
            <div className="banner info mt-12">Đơn ở trạng thái <b>{r.status}</b>{r.closeReason ? ` (${r.closeReason})` : ''}{r.tripCode ? ` · chuyến ${r.tripCode}` : ''}.</div>
          )}
          <div className="mt-16">
            <KV k="Phương tiện" v={`${r.vehicleCode} · ${vehicleTypeLabel(r.vehicleType)}`} />
            <KV k="Mức pin" v={<div style={{ width: 160 }}><Battery value={r.batteryPercent} /></div>} />
            <KV k="Hub nhận xe" v={r.hubName} />
            <KV k="Thời điểm đặt" v={dateTime(r.reservedAt)} />
            <KV k="Thời hạn giữ chỗ mặc định" v="15 phút" />
          </div>
          {active && (
            <>
              <button className="btn lg block mt-16" onClick={() => nav(`/pickup?reservation=${r.id}&code=${r.vehicleCode}`)}>📷 Nhận xe – quét mã QR trên xe</button>
              <div className="row mt-8">
                <button className="btn soft block" disabled={r.extensionCount >= r.maxExtensions} onClick={() => { extKey.current = newIdempotencyKey(); setExt(true); }}>⏱ Gia hạn giữ chỗ (+10 phút)</button>
                <button className="btn danger-soft block" onClick={() => setCancel(true)}>Hủy đặt trước</button>
              </div>
            </>
          )}
          <p className="tiny muted mt-12">Bạn chỉ có thể có 1 đơn đặt xe còn hiệu lực. Xe đã được ẩn khỏi danh sách khả dụng của người dùng khác.</p>
        </div>
        <div className="card">
          <h3 className="mb-12">Đường đến Hub</h3>
          <HubMap hubs={[{ id: r.hubId, name: r.hubName, latitude: r.hubLat, longitude: r.hubLng }]} selectedId={r.hubId} height={260} />
          <h3 className="mt-16 mb-8">Lưu ý khi giữ chỗ</h3>
          <ul className="small muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
            <li>Xe được giữ độc quyền cho bạn đến hết thời hạn giữ chỗ.</li>
            <li>Có thể gia hạn tối đa 2 lần, mỗi lần +10 phút.</li>
            <li>Quá hạn chưa nhận xe: đơn chuyển "Đã hết hạn", xe được kiểm tra lại trước khi mở cho người khác.</li>
          </ul>
          {r.extensions.length > 0 && (<><h3 className="mt-16 mb-8">Lịch sử gia hạn</h3>{r.extensions.map((e, i) => <KV key={i} k={`Lần ${i + 1} · ${time(e.at)}`} v={`${time(e.oldExpiresAt)} → ${time(e.newExpiresAt)}`} />)}</>)}
        </div>
      </div>

      <ConfirmModal open={ext} icon="⏱" title="Gia hạn thời gian giữ chỗ" body={`Cộng thêm 10 phút vào thời hạn hiện tại của đơn #${r.code}`}
        confirmText="Xác nhận gia hạn" busy={busy} onClose={() => setExt(false)} onConfirm={doExtend}>
        <KV k="Hạn giữ chỗ hiện tại" v={time(r.expiresAt)} />
        <KV k="Hạn giữ chỗ mới" v={<span style={{ color: 'var(--primary)' }}>{time(new Date(new Date(r.expiresAt).getTime() + 600000).toISOString())}</span>} />
        <KV k="Số lần gia hạn sau xác nhận" v={`${r.extensionCount + 1}/${r.maxExtensions}`} />
      </ConfirmModal>
      <ConfirmModal open={cancel} icon="✕" tone="red" danger title={`Hủy đặt trước xe ${r.vehicleCode}?`} body={`Đơn #${r.code} sẽ chuyển sang "Đã hủy" và xe được giải phóng sau khi hệ thống xác minh.`}
        confirmText="Xác nhận hủy" busy={busy} onClose={() => setCancel(false)} onConfirm={doCancel} />
    </div>
  );
}
