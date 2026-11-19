import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, call, HttpError } from '../../api/client';
import type { ActiveState, AlternativeView, HubDetail, PickupResult } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { NextOutcome, SimPanel } from '../../components/SimPanel';
import { Battery, Spinner, errorText } from '../../components/ui';
import { vehicleTypeLabel } from '../../lib/format';

/**
 * RE05 – Nhận xe. Góp ý #5: chỉ báo "bắt đầu chuyến" khi thiết bị xác nhận mở khóa; kết quả không xác định
 * → hiển thị trạng thái đang đối soát, không cho dắt xe đi, tự kiểm tra lại.
 */
export function PickupPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const reservationId = sp.get('reservation');
  const [code, setCode] = useState(sp.get('code') ?? '');
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; alts: AlternativeView[] } | null>(null);
  const [reconciling, setReconciling] = useState<PickupResult | null>(null);

  // Tra id xe từ mã để cấu hình giả lập
  useEffect(() => {
    if (!code || code.length < 4) { setVehicleId(null); return; }
    const t = setTimeout(() => {
      api<{ items: { id: number }[] }>('/api/v1/hubs').then(async (s) => {
        for (const h of s.items) {
          const d = await api<HubDetail>(`/api/v1/hubs/${h.id}`);
          const v = d.vehicles.find((x) => x.code.toUpperCase() === code.toUpperCase());
          if (v) { setVehicleId(v.id); return; }
        }
        setVehicleId(null);
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [code]);

  // Đang đối soát: hỏi lại định kỳ
  useEffect(() => {
    if (!reconciling) return;
    const t = setInterval(async () => {
      const a = await api<ActiveState>('/api/v1/trips/active').catch(() => null);
      if (a?.trip) nav(`/trips/${a.trip.id}/live`);
      else if (a && !a.reservation) { setReconciling(null); setError({ msg: 'Hệ thống xác minh xe chưa được mở khóa. Đơn đã đóng, bạn không bị tính phí.', alts: [] }); }
      else if (a?.reservation?.status === 'RESERVED') { setReconciling(null); setError({ msg: 'Hệ thống xác minh xe vẫn đang khóa – đơn vẫn được giữ, vui lòng thử nhận xe lại.', alts: [] }); }
    }, 4000);
    return () => clearInterval(t);
  }, [reconciling, nav]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, status } = await call<PickupResult>('/api/v1/trips/pickup', { body: { vehicleCode: code.trim().toUpperCase(), reservationId: reservationId ? Number(reservationId) : null } });
      if (status === 202 || data.state === 'RECONCILING') setReconciling(data);
      else if (data.trip) nav(`/trips/${data.trip.id}/live?started=1`);
    } catch (e) {
      setError({ msg: errorText(e), alts: e instanceof HttpError ? e.detail<AlternativeView[]>('alternatives') ?? [] : [] });
    } finally { setBusy(false); }
  };

  return (
    <div className="page medium">
      <PageHead eyebrow="RE05 · Nhận xe" title="Quét mã QR trên xe" sub={reservationId ? 'Nhận xe theo đơn đặt trước' : 'Thuê trực tiếp tại Hub (không đặt trước)'} />
      <div className="grid cols-2">
        <div className="card pad-lg">
          <div style={{ background: '#1e2945', borderRadius: 16, height: 230, display: 'grid', placeItems: 'center', color: '#c9d1e6' }}>
            <div className="center"><div style={{ fontSize: 44 }}>⌗</div><div className="small mt-8">Đưa mã QR trên xe hoặc điểm đỗ vào khung hình</div></div>
          </div>
          <div className="field mt-16">
            <label>Hoặc nhập mã xe</label>
            <div className="row"><input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="UG-018" /><button className="btn" disabled={busy || !code || !!reconciling} onClick={submit}>{busy ? <Spinner /> : 'Xác nhận'}</button></div>
          </div>
          <SimPanel title="Giả lập khóa xe (demo góp ý #5)">
            <NextOutcome deviceType="VEHICLE" deviceId={vehicleId} />
            {!vehicleId && <span className="tiny muted">Nhập mã xe để cấu hình</span>}
          </SimPanel>
        </div>
        <div className="card pad-lg">
          <h3>Xác thực & kiểm tra điều kiện an toàn</h3>
          <div className="timeline mt-16">
            <div className={`step ${code ? 'done' : 'current'}`}><b>Xác thực danh tính</b><div className="small muted">Tài khoản sinh viên đang đăng nhập</div></div>
            <div className="step done"><b>{reservationId ? 'Đơn đặt trước hợp lệ' : 'Thuê trực tiếp'}</b><div className="small muted">{reservationId ? 'Kiểm tra lại khi xác nhận' : 'Giữ xe nguyên tử tại thời điểm xác nhận'}</div></div>
            <div className="step"><b>Đối chiếu dữ liệu cảm biến mới nhất</b><div className="small muted">Vị trí đúng Hub, pin ≥ 20%, không có sự cố mở</div></div>
            <div className={`step ${reconciling ? 'current' : ''}`}><b>Gửi lệnh mở khóa & chờ thiết bị phản hồi</b><div className="small muted">Chỉ bắt đầu chuyến khi khóa xác nhận thành công</div></div>
          </div>
          {reconciling && (
            <div className="banner warn mt-12"><Spinner /><div><b>Đang đối soát với thiết bị</b><br />{reconciling.message}</div></div>
          )}
          {error && (
            <div className="mt-12">
              <div className="banner error">{error.msg}</div>
              {error.alts.length > 0 && <div className="small muted mt-12">Xe khác cùng Hub:</div>}
              {error.alts.map((a) => (
                <div key={a.id} className="list-item" onClick={() => { setCode(a.code); setError(null); }}>
                  <div className="vehicle-ico">🛵</div><div style={{ flex: 1 }}><b>{a.code}</b> <span className="small muted">{vehicleTypeLabel(a.type)}</span><Battery value={a.batteryPercent} /></div>
                </div>
              ))}
            </div>
          )}
          <div className="banner info small mt-16">Nếu mở khóa thất bại, chuyến đi không được tạo, xe chuyển "Báo lỗi" và sự cố được gửi tới Đơn vị vận hành.</div>
        </div>
      </div>
    </div>
  );
}
