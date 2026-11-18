import { ApiError } from '../../../shared/api/http'
import { errorText } from '../../../shared/i18n/vi'
import { useCancelReservation } from '../api'
import type { Reservation } from '../types'
import { Modal } from './Modal'

interface Props {
  reservation: Reservation
  vehicleCode: string
  onClose: () => void
  onCancelled: (r: Reservation) => void
}

export function CancelReservationModal({ reservation, vehicleCode, onClose, onCancelled }: Props) {
  const cancel = useCancelReservation()
  const err = cancel.error instanceof ApiError ? cancel.error : null

  function confirm() {
    cancel.mutate(reservation.id, {
      onSuccess: (r) => onCancelled(r ?? reservation),
    })
  }

  return (
    <Modal
      title={`Hủy đặt trước xe ${vehicleCode}?`}
      icon="✕"
      tone="danger"
      onClose={onClose}
      busy={cancel.isPending}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={cancel.isPending}>
            Giữ lại đơn
          </button>
          <button className="btn btn-danger" onClick={confirm} disabled={cancel.isPending}>
            {cancel.isPending ? 'Đang hủy…' : 'Xác nhận hủy'}
          </button>
        </>
      }
    >
      <p>
        Đơn #{reservation.code} sẽ chuyển sang "Đã hủy". Xe được giải phóng và chỉ mở lại cho người khác sau khi hệ
        thống xác minh tình trạng thực tế.
      </p>
      <div className="alert alert-warning">Đơn đã nhận xe không thể hủy – vui lòng dùng chức năng Trả xe.</div>
      {err && (
        <div className="alert alert-error" role="alert">
          {err.code === 'RESERVATION_NOT_ACTIVE'
            ? 'Đơn không còn ở trạng thái giữ chỗ (đã nhận xe, đã hủy hoặc đã hết hạn) nên không thể hủy.'
            : errorText(err.code, err.message)}
        </div>
      )}
    </Modal>
  )
}
