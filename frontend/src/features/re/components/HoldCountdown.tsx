import { formatCountdown, formatTime } from '../../../shared/i18n/format'
import { RESERVATION_RULES } from '../types'
import type { Reservation } from '../types'

interface Props {
  reservation: Reservation
  now: number
}

/** RE01: "Thời hạn giữ chỗ còn lại mm:ss" + thanh tiến trình, tính theo expiresAt từ server. */
export function HoldCountdown({ reservation, now }: Props) {
  const start = Date.parse(reservation.reservedAt)
  const end = Date.parse(reservation.expiresAt)
  const remaining = end - now
  // Tổng thời gian đã gồm cả các lần gia hạn, nên thanh tiến trình không bị nhảy sau RE04.
  const ratio = end > start ? Math.min(1, Math.max(0, remaining / (end - start))) : 0
  const urgent = remaining <= 3 * 60_000

  return (
    <section className={`re-countdown${urgent ? ' is-urgent' : ''}`} aria-live="polite">
      <div className="re-countdown-head">
        <span>Thời hạn giữ chỗ còn lại</span>
        <strong className="re-countdown-clock">{formatCountdown(remaining)}</strong>
      </div>
      <div
        className="re-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div className="re-progress-bar" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="muted">
        Hết hạn lúc {formatTime(reservation.expiresAt)} · Đã gia hạn {reservation.extensionCount}/
        {RESERVATION_RULES.maxExtensions} lần
      </p>
    </section>
  )
}
