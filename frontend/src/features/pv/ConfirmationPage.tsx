import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useDemoState } from '../../mocks/store';
import { bookingLabel, serviceLabel, time, weekdayDate } from '../../shared/format';
import { Empty, Notice, Summary } from '../../shared/ui';
import './pv.css';

export default function ConfirmationPage() {
  const { id } = useParams(); const state = useDemoState();
  const booking = state.bookings.find(b => b.id === id);
  const [qr, setQr] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    let live = true; setQr(''); setError('');
    if (booking) void QRCode.toDataURL(booking.token, { width: 260, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }).then(url => { if (live) setQr(url); }).catch(() => { if (live) setError('Không tạo được mã QR. Hãy tải lại trang.'); });
    return () => { live = false; };
  }, [booking?.token]);
  if (!booking) return <main className="pv-page ui-panel"><Empty title="Không tìm thấy lượt đặt" to="/pv/book" action="Đặt chỗ mới" /></main>;
  const vehicle = state.vehicles.find(v => v.id === booking.vehicleId) ?? booking.vehicleSnapshot!; const hub = state.hubs.find(h => h.id === booking.hubId)!;
  return <main className="pv-page"><section className="pv-qr-card ui-panel" data-figma-node="15:1243"><p className="ui-eyebrow">MÃ XÁC NHẬN ĐẶT CHỖ</p><h1>{hub.shortName} · Ô {booking.slotId}{booking.portId ? ` · Cổng sạc #${booking.portId}` : ''}</h1><p className="ui-subtitle">{time(booking.startAt)} – {time(booking.endAt)} · {weekdayDate(booking.startAt)}</p>
    <div className="pv-qr">{qr ? <img src={qr} width="260" height="260" alt={`Mã QR cho lượt đặt ${booking.id}`} /> : <p role="status">{error || 'Đang tạo mã QR…'}</p>}</div><h2>Mã đặt chỗ: {booking.id}</h2>
    <Summary rows={[[ 'Phương tiện', `${vehicle.model} · ${vehicle.plate}` ], ['Dịch vụ', serviceLabel[booking.service]], ['Trạng thái', <span className={`pv-status-text ${['EXPIRED', 'CANCELLED'].includes(booking.status) ? 'is-bad' : ''}`}>{bookingLabel[booking.status]}</span>]]} />
    <Notice>Quét mã tại điểm check-in của Hub{booking.portId ? ` hoặc tại cổng sạc #${booking.portId}` : ''}. Cho phép đến trước giờ hẹn hoặc trễ tối đa 15 phút.</Notice><Link className="ui-button ui-button--soft pv-full" to={`/pv/sessions/${booking.id}`}>Xem phiên đỗ & sạc</Link>{qr && <a className="ui-link pv-summary-link" href={qr} download={`${booking.id}.png`}>Tải mã QR</a>}
  </section></main>;
}
