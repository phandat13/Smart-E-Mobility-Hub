import { useState } from 'react'
import { ApiError } from '../../../shared/api/http'
import { errorText } from '../../../shared/i18n/vi'
import { useRateTrip } from '../api'
import { Modal } from './Modal'

interface Props {
  tripId: number
  onClose: () => void
  onRated: () => void
}

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <fieldset className="re-stars">
      <legend>{label}</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= value ? 'is-on' : ''}
          aria-label={`${n} sao`}
          aria-pressed={n === value}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </fieldset>
  )
}

export function RatingModal({ tripId, onClose, onRated }: Props) {
  const rate = useRateTrip()
  const [vehicleStars, setVehicleStars] = useState(0)
  const [hubStars, setHubStars] = useState(0)
  const [comment, setComment] = useState('')
  const err = rate.error instanceof ApiError ? rate.error : null
  const ready = vehicleStars > 0 && hubStars > 0

  function submit() {
    rate.mutate(
      { tripId, body: { vehicleStars, hubStars, comment: comment.trim() || undefined } },
      { onSuccess: onRated },
    )
  }

  return (
    <Modal
      title="Đánh giá chuyến đi"
      icon="★"
      onClose={onClose}
      busy={rate.isPending}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={rate.isPending}>
            Để sau
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!ready || rate.isPending}>
            {rate.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
          </button>
        </>
      }
    >
      <Stars label="Phương tiện" value={vehicleStars} onChange={setVehicleStars} />
      <Stars label="Hub" value={hubStars} onChange={setHubStars} />
      <label className="re-field">
        <span>Nhận xét (không bắt buộc)</span>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      {err && (
        <div className="alert alert-error" role="alert">
          {errorText(err.code, err.message)}
        </div>
      )}
    </Modal>
  )
}
