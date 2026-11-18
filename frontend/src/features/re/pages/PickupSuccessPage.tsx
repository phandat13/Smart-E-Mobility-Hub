import { Link, useNavigate } from 'react-router'
import { formatDateTime, formatRange, formatTime } from '../../../shared/i18n/format'
import { vehicleTypeLabel } from '../../../shared/i18n/vi'
import { useCurrentTrip, useHubs, useVehicle } from '../api'
import '../re.css'

export function PickupSuccessPage() {
  const navigate = useNavigate()
  const trip = useCurrentTrip()
  const hubs = useHubs()
  const vehicle = useVehicle(trip.data?.vehicleId)

  if (trip.isPending) return <p className="muted">Đang tải chuyến đi…</p>
  if (!trip.data) {
    return (
      <div className="card re-empty">
        <h2>Không có chuyến đi đang diễn ra</h2>
        <Link to="/trips/history">Xem lịch sử đặt xe</Link>
      </div>
    )
  }

  const t = trip.data
  const hub = hubs.data?.find((h) => h.id === t.startHubId)
  const range = vehicle.data ? (vehicle.data.rangeKm * t.startBattery) / Math.max(1, vehicle.data.batteryPercent) : null

  return (
    <section className="card re-result">
      <div className="re-result-icon is-success" aria-hidden="true">
        ✓
      </div>
      <h1>Mở khóa xe thành công!</h1>
      <p className="muted">Thiết bị đã xác nhận mở khóa · chuyến đi bắt đầu lúc {formatTime(t.startedAt)}.</p>

      <dl className="re-info">
        <dt>Mã chuyến đi</dt>
        <dd>#{t.code}</dd>
        <dt>Phương tiện</dt>
        <dd>
          {t.vehicleCode} · {vehicleTypeLabel[t.vehicleType] ?? t.vehicleType}
        </dd>
        <dt>Hub xuất phát</dt>
        <dd>
          {hub?.name ?? '…'}
          {t.startSlotCode ? ` · ô ${t.startSlotCode}` : ''}
        </dd>
        <dt>Pin lúc nhận</dt>
        <dd>
          {t.startBattery} %{range != null ? ` (${formatRange(range)})` : ''}
        </dd>
        <dt>Bắt đầu</dt>
        <dd>{formatDateTime(t.startedAt)}</dd>
      </dl>

      <div className="re-actions">
        <button className="btn btn-primary" onClick={() => navigate('/trips/current')}>
          Xem chuyến đi đang diễn ra
        </button>
      </div>

      <details className="re-safety">
        <summary>Xem hướng dẫn an toàn khi di chuyển trong khuôn viên</summary>
        <ul className="re-notes">
          <li>Đội mũ bảo hiểm, đi đúng làn dành cho xe đạp/xe điện.</li>
          <li>Giảm tốc độ khi qua khu vực đông sinh viên, cổng KTX và nhà ga.</li>
          <li>Không chở quá số người cho phép, không dùng điện thoại khi đang chạy.</li>
          <li>Gặp sự cố, dừng xe an toàn rồi bấm "Báo cáo sự cố" trên màn chuyến đi.</li>
        </ul>
      </details>
    </section>
  )
}
