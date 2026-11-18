import { ApiError } from '../../../shared/api/http'
import { formatTime } from '../../../shared/i18n/format'
import { errorText } from '../../../shared/i18n/vi'
import { useExtendReservation } from '../api'
import { RESERVATION_RULES } from '../types'
import type { Reservation } from '../types'
import { Modal } from './Modal'

interface Props {
  reservation: Reservation
  onClose: () => void
  onExtended: (r: Reservation) => void
}

function extendErrorText(err: ApiError) {
  if (err.code === 'VEHICLE_HAS_OPERATION') {
    return 'Xe đang được ưu tiên cho quy trình vận hành khác nên không thể gia hạn. Bạn vẫn có thể nhận xe trước khi hết hạn.'
  }
  return errorText(err.code, err.message)
}

export function ExtendReservationModal({ reservation, onClose, onExtended }: Props) {
  const extend = useExtendReservation()
  const err = extend.error instanceof ApiError ? extend.error : null
  const extra = RESERVATION_RULES.extendMinutes * 60_000
  const newExpiresAt = new Date(Date.parse(reservation.expiresAt) + extra).toISOString()
  const limitReached = reservation.extensionCount >= RESERVATION_RULES.maxExtensions

  function confirm() {
    extend.mutate(reservation.id, {
      onSuccess: (r) => onExtended(r ?? reservation),
    })
  }

  return (
    <Modal
      title="Gia hạn thời gian giữ chỗ"
      icon="⏱"
      onClose={onClose}
      busy={extend.isPending}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={extend.isPending}>
            Để sau
          </button>
          <button className="btn btn-primary" onClick={confirm} disabled={extend.isPending || limitReached}>
            {extend.isPending ? 'Đang gia hạn…' : 'Xác nhận gia hạn'}
          </button>
        </>
      }
    >
      <p>
        Cộng thêm {RESERVATION_RULES.extendMinutes} phút vào thời hạn hiện tại của đơn #{reservation.code}.
      </p>
      <dl className="re-info re-info-compact">
        <dt>Hạn giữ chỗ hiện tại</dt>
        <dd>{formatTime(reservation.expiresAt)}</dd>
        <dt>Hạn giữ chỗ mới</dt>
        <dd className="text-success">{limitReached ? '—' : formatTime(newExpiresAt)}</dd>
        <dt>Số lần gia hạn sau xác nhận</dt>
        <dd>
          {Math.min(reservation.extensionCount + 1, RESERVATION_RULES.maxExtensions)}/{RESERVATION_RULES.maxExtensions}
        </dd>
      </dl>
      {limitReached && (
        <div className="alert alert-warning">
          Đơn đã gia hạn {RESERVATION_RULES.maxExtensions}/{RESERVATION_RULES.maxExtensions} lần, không thể gia hạn
          thêm.
        </div>
      )}
      {err && (
        <div className="alert alert-error" role="alert">
          {extendErrorText(err)}
        </div>
      )}
    </Modal>
  )
}
