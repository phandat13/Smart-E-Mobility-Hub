import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { formatKm, formatMoney, formatTime, minutesBetween } from '../../../shared/i18n/format'
import { useCurrentTrip, useHubs, useTrip } from '../api'
import { RatingModal } from '../components/RatingModal'
import { VehicleStatusChip } from '../components/StatusChip'
import '../re.css'

export function TripSummaryPage() {
  const { id } = useParams()
  const trip = useTrip(Number(id))
  const hubs = useHubs()
  const [rating, setRating] = useState(false)
  const [justRated, setJustRated] = useState(false)

  if (trip.isPending) return <p className="muted">Đang tải chuyến đi…</p>
  if (trip.isError || !trip.data) return <div className="alert alert-error">Không tìm thấy chuyến đi.</div>

  const t = trip.data
  if (t.status !== 'COMPLETED' || !t.endedAt) return <Navigate to="/trips/current" replace />

  const hubName = (hid: number | null) => hubs.data?.find((h) => h.id === hid)?.name ?? '…'
  const rated = t.rated || justRated

  return (
    <section className="card re-result">
      <div className="re-result-icon is-success" aria-hidden="true">
        ✓
      </div>
      <h1>Trả xe thành công!</h1>
      <p className="muted">
        Thiết bị đã khóa xe tại Hub {hubName(t.endHubId)}
        {t.endSlotCode ? ` · ô ${t.endSlotCode}` : ''}
      </p>

      <dl className="re-info">
        <dt>Mã chuyến</dt>
        <dd>#{t.code}</dd>
        <dt>Thời gian sử dụng</dt>
        <dd>
          {minutesBetween(t.startedAt, t.endedAt)} phút ({formatTime(t.startedAt)}–{formatTime(t.endedAt)})
        </dd>
        <dt>Lộ trình</dt>
        <dd>
          {hubName(t.startHubId)} → {hubName(t.endHubId)}
        </dd>
        <dt>Quãng đường</dt>
        <dd>{formatKm(t.distanceKm)}</dd>
        <dt>Pin nhận → trả</dt>
        <dd>
          {t.startBattery} % → {t.endBattery ?? t.currentBattery} %
        </dd>
        <dt>Trạng thái xe sau khi trả</dt>
        <dd>{t.vehicleStatusAfterReturn ? <VehicleStatusChip status={t.vehicleStatusAfterReturn} /> : '—'}</dd>
        <dt>Chi phí</dt>
        <dd className="re-cost">{formatMoney(t.cost)}</dd>
      </dl>
      <p className="muted re-footnote">Chi phí do dịch vụ thanh toán mô phỏng tính, đã lưu vào lịch sử chuyến đi.</p>

      {justRated && (
        <div className="alert alert-success" role="status">
          Cảm ơn bạn đã đánh giá chuyến đi!
        </div>
      )}

      <div className="re-actions">
        <button className="btn btn-primary" onClick={() => setRating(true)} disabled={rated}>
          {rated ? 'Đã đánh giá' : 'Đánh giá chuyến đi'}
        </button>
        <Link className="btn btn-secondary" to="/">
          Về trang chủ
        </Link>
      </div>

      {rating && (
        <RatingModal
          tripId={t.id}
          onClose={() => setRating(false)}
          onRated={() => {
            setRating(false)
            setJustRated(true)
          }}
        />
      )}
    </section>
  )
}

export function TripsIndexRedirect() {
  const trip = useCurrentTrip()
  if (trip.isPending) return <p className="muted">Đang tải…</p>
  return <Navigate to={trip.data ? '/trips/current' : '/trips/history'} replace />
}
