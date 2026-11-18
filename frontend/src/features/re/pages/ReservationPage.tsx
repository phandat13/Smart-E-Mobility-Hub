import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { useServerNow } from '../../../shared/hooks/useServerNow'
import { formatDateTime, formatRange } from '../../../shared/i18n/format'
import { reservationStatusLabel, vehicleTypeLabel } from '../../../shared/i18n/vi'
import { reKeys, useCurrentReservation, useHubs, useVehicle } from '../api'
import { HoldCountdown } from '../components/HoldCountdown'
import { RESERVATION_RULES } from '../types'
import type { Hub, Reservation } from '../types'
import '../re.css'

/** RE01 (Figma 400-220): Đặt trước phương tiện – xác nhận & đếm ngược. */
export function ReservationPage() {
  const current = useCurrentReservation()

  if (current.isPending) return <p className="muted">Đang tải đơn đặt xe…</p>
  if (current.isError) return <div className="alert alert-error">Không tải được đơn đặt xe.</div>
  if (!current.data) return <NoReservation />
  return <ReservationDetail reservation={current.data} />
}

function NoReservation() {
  return (
    <div className="card re-empty">
      <h2>Bạn chưa có đơn đặt xe nào đang hiệu lực</h2>
      <p className="muted">Chọn một xe đang sẵn sàng tại Hub để giữ chỗ trong {RESERVATION_RULES.holdMinutes} phút.</p>
      <Link className="btn btn-primary" to="/reserve">
        Chọn xe để đặt trước
      </Link>
    </div>
  )
}

function ReservationDetail({ reservation }: { reservation: Reservation }) {
  const qc = useQueryClient()
  const now = useServerNow()
  const vehicle = useVehicle(reservation.vehicleId)
  const hubs = useHubs()
  const hub = hubs.data?.find((h) => h.id === reservation.hubId)

  const isHolding = reservation.status === 'RESERVED'
  // Job hết hạn ở backend chạy định kỳ nên có độ trễ; FE coi như hết hạn ngay khi qua expiresAt.
  const expired = isHolding && now >= Date.parse(reservation.expiresAt)

  useEffect(() => {
    if (expired) qc.invalidateQueries({ queryKey: reKeys.currentReservation })
  }, [expired, qc])

  const v = vehicle.data

  return (
    <div className="re-layout">
      <section className="card re-main">
        <div className="re-title">
          <h1>Đơn đặt xe #{reservation.code}</h1>
          <span className="badge">
            {expired ? reservationStatusLabel.EXPIRED : reservationStatusLabel[reservation.status]}
          </span>
        </div>

        {isHolding && <HoldCountdown reservation={reservation} now={now} />}

        {expired && (
          <div className="alert alert-warning" role="alert">
            Đơn đã hết thời gian giữ chỗ. Xe sẽ được kiểm tra lại trước khi mở cho người khác.{' '}
            <Link to="/reserve">Đặt xe khác</Link>
          </div>
        )}

        {reservation.status === 'PICKED_UP' && (
          <div className="alert alert-warning">
            Bạn đã nhận xe. Theo dõi chuyến đi ở mục <Link to="/trips">Chuyến đi</Link>.
          </div>
        )}

        <dl className="re-info">
          <dt>Phương tiện</dt>
          <dd>{v ? `${v.code} · ${vehicleTypeLabel[v.type] ?? v.type}` : '…'}</dd>
          <dt>Mức pin</dt>
          <dd>{v ? `${v.batteryPercent} % (${formatRange(v.rangeKm)})` : '…'}</dd>
          <dt>Hub nhận xe</dt>
          <dd>{hub?.name ?? '…'}</dd>
          <dt>Thời điểm đặt</dt>
          <dd>{formatDateTime(reservation.reservedAt)}</dd>
          <dt>Hạn giữ mặc định</dt>
          <dd>{RESERVATION_RULES.holdMinutes} phút</dd>
        </dl>

        {isHolding && !expired && (
          <>
            <div className="re-actions">
              {/* RE05, RE04, RE03 làm ở các bước sau; nút giữ chỗ trước để bố cục khớp Figma. */}
              <button className="btn btn-primary" disabled title="RE05 – chưa làm">
                Nhận xe – quét mã QR trên xe
              </button>
              <button className="btn btn-secondary" disabled title="RE04 – chưa làm">
                Gia hạn giữ chỗ (+{RESERVATION_RULES.extendMinutes} phút)
              </button>
              <button className="btn btn-danger-ghost" disabled title="RE03 – chưa làm">
                Hủy đặt trước
              </button>
            </div>
            <p className="muted re-footnote">
              Mỗi sinh viên chỉ có 1 đơn đặt xe hiệu lực. Xe đã được ẩn khỏi danh sách khả dụng của người khác.
            </p>
          </>
        )}
      </section>

      <aside className="re-side">
        <HubDirections hub={hub} />
        <section className="card">
          <h3>Lưu ý khi giữ chỗ</h3>
          <ul className="re-notes">
            <li>Xe được giữ độc quyền cho bạn đến khi hết hạn giữ chỗ.</li>
            <li>
              Có thể gia hạn tối đa {RESERVATION_RULES.maxExtensions} lần, mỗi lần +{RESERVATION_RULES.extendMinutes}{' '}
              phút.
            </li>
            <li>Quá hạn, đơn chuyển sang "Đã hết hạn"; xe được kiểm tra lại trước khi mở cho người khác.</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

function HubDirections({ hub }: { hub: Hub | undefined }) {
  return (
    <section className="card">
      <h3>Đường đến Hub</h3>
      <div className="re-map" aria-hidden="true">
        <span>{hub?.name ?? '…'}</span>
      </div>
      {hub && (
        <a
          className="re-map-link"
          href={`https://www.google.com/maps/dir/?api=1&destination=${hub.latitude},${hub.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Mở chỉ đường
        </a>
      )}
    </section>
  )
}
