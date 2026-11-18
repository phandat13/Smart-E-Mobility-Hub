import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useServerNow } from '../../../shared/hooks/useServerNow'
import { formatDateTime, formatRange, formatTime } from '../../../shared/i18n/format'
import { reservationStatusLabel, vehicleTypeLabel } from '../../../shared/i18n/vi'
import { reKeys, useCurrentReservation, useHubs, useVehicle } from '../api'
import { CancelReservationModal } from '../components/CancelReservationModal'
import { ExtendReservationModal } from '../components/ExtendReservationModal'
import { HoldCountdown } from '../components/HoldCountdown'
import { HubDirections } from '../components/HubDirections'
import { RESERVATION_RULES } from '../types'
import type { Reservation } from '../types'
import '../re.css'

export function ReservationPage() {
  const current = useCurrentReservation()
  const [cancelledCode, setCancelledCode] = useState<string | null>(null)

  if (current.isPending) return <p className="muted">Đang tải đơn đặt xe…</p>
  if (current.isError) return <div className="alert alert-error">Không tải được đơn đặt xe.</div>
  if (!current.data) return <NoReservation cancelledCode={cancelledCode} />
  return <ReservationDetail reservation={current.data} onCancelled={setCancelledCode} />
}

function NoReservation({ cancelledCode }: { cancelledCode: string | null }) {
  return (
    <div className="card re-empty">
      {cancelledCode && (
        <div className="alert alert-success" role="status">
          Đã hủy đơn #{cancelledCode}. Xe sẽ được hệ thống xác minh trước khi mở lại cho người khác.
        </div>
      )}
      <h2>Bạn chưa có đơn đặt xe nào đang hiệu lực</h2>
      <p className="muted">Chọn một xe đang sẵn sàng tại Hub để giữ chỗ trong {RESERVATION_RULES.holdMinutes} phút.</p>
      <div className="re-actions">
        <Link className="btn btn-primary" to="/reserve">
          Chọn xe để đặt trước
        </Link>
        <Link className="btn btn-secondary" to="/pickup">
          Thuê trực tiếp tại Hub
        </Link>
      </div>
      <Link to="/trips/history">Xem lịch sử đặt xe</Link>
    </div>
  )
}

type OpenModal = 'extend' | 'cancel' | null

function ReservationDetail({
  reservation,
  onCancelled,
}: {
  reservation: Reservation
  onCancelled: (code: string) => void
}) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const now = useServerNow()
  const vehicle = useVehicle(reservation.vehicleId)
  const hubs = useHubs()
  const hub = hubs.data?.find((h) => h.id === reservation.hubId)
  const [modal, setModal] = useState<OpenModal>(null)
  const [extendedNotice, setExtendedNotice] = useState<string | null>(null)

  const isHolding = reservation.status === 'RESERVED'
  const expired = isHolding && now >= Date.parse(reservation.expiresAt)

  useEffect(() => {
    if (expired) qc.invalidateQueries({ queryKey: reKeys.currentReservation })
  }, [expired, qc])

  const v = vehicle.data
  const limitReached = reservation.extensionCount >= RESERVATION_RULES.maxExtensions
  const activeModal = isHolding && !expired ? modal : null

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
            Bạn đã nhận xe. <Link to="/trips/current">Xem chuyến đi đang diễn ra</Link>
          </div>
        )}

        {extendedNotice && isHolding && !expired && (
          <div className="alert alert-success" role="status">
            {extendedNotice}
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
              <button className="btn btn-primary" onClick={() => navigate('/pickup')}>
                Nhận xe – quét mã QR trên xe
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setModal('extend')}
                disabled={limitReached}
                title={limitReached ? `Đã gia hạn tối đa ${RESERVATION_RULES.maxExtensions} lần` : undefined}
              >
                Gia hạn giữ chỗ (+{RESERVATION_RULES.extendMinutes} phút)
              </button>
              <button className="btn btn-danger-ghost" onClick={() => setModal('cancel')}>
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

      {activeModal === 'extend' && (
        <ExtendReservationModal
          reservation={reservation}
          onClose={() => setModal(null)}
          onExtended={(r) => {
            setModal(null)
            setExtendedNotice(
              `Đã gia hạn. Hạn giữ chỗ mới: ${formatTime(r.expiresAt)} (${r.extensionCount}/${RESERVATION_RULES.maxExtensions} lần).`,
            )
          }}
        />
      )}
      {activeModal === 'cancel' && (
        <CancelReservationModal
          reservation={reservation}
          vehicleCode={v?.code ?? `#${reservation.vehicleId}`}
          onClose={() => setModal(null)}
          onCancelled={(r) => {
            setModal(null)
            onCancelled(r.code)
          }}
        />
      )}
    </div>
  )
}
