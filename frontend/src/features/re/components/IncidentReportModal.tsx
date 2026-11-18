import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/http'
import { errorText, incidentCategoryLabel } from '../../../shared/i18n/vi'
import { useReportIncident } from '../api'
import type { Incident, IncidentCategory, IncidentTarget } from '../types'
import { Modal } from './Modal'

interface Props {
  vehicleId: number
  vehicleCode: string
  tripId?: number
  hubId?: number
  mode?: 'report' | 'damage'
  onClose: () => void
  onReported: (incident: Incident) => void
}

const VEHICLE_CATEGORIES: IncidentCategory[] = ['DAMAGE', 'BRAKE_LIGHT', 'BATTERY', 'LOCK', 'OTHER']

export function IncidentReportModal({ vehicleId, vehicleCode, tripId, hubId, mode = 'report', onClose, onReported }: Props) {
  const report = useReportIncident()
  const [target, setTarget] = useState<IncidentTarget>('VEHICLE')
  const [category, setCategory] = useState<IncidentCategory>('DAMAGE')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)

  const isDamage = mode === 'damage'
  const effectiveCategory: IncidentCategory = target === 'CHARGING_PORT' ? 'CHARGING_PORT' : category
  const missingPhoto = isDamage && photos.length === 0
  const err = report.error instanceof ApiError ? report.error : null

  function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!description.trim() || missingPhoto) return
    report.mutate(
      {
        targetType: target,
        category: effectiveCategory,
        description: description.trim(),
        vehicleId,
        tripId,
        hubId,
        photos,
      },
      { onSuccess: (incident) => incident && onReported(incident) },
    )
  }

  return (
    <Modal
      title={isDamage ? `Lập biên bản sự cố xe ${vehicleCode}` : 'Báo cáo sự cố (xe / cổng sạc)'}
      icon="!"
      tone="danger"
      onClose={onClose}
      busy={report.isPending}
    >
      <form className="re-form" onSubmit={submit} noValidate>
        {!isDamage && (
          <fieldset className="re-segment">
            <legend className="sr-only">Đối tượng gặp sự cố</legend>
            <label className={target === 'VEHICLE' ? 'is-active' : ''}>
              <input type="radio" name="target" checked={target === 'VEHICLE'} onChange={() => setTarget('VEHICLE')} />
              Xe {vehicleCode}
            </label>
            <label className={target === 'CHARGING_PORT' ? 'is-active' : ''}>
              <input
                type="radio"
                name="target"
                checked={target === 'CHARGING_PORT'}
                onChange={() => setTarget('CHARGING_PORT')}
              />
              Cổng sạc
            </label>
          </fieldset>
        )}

        {target === 'VEHICLE' && (
          <label className="re-field">
            <span>Loại sự cố</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)}>
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {incidentCategoryLabel[c]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="re-field">
          <span>Mô tả</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ví dụ: chắn bùn sau bị nứt, phanh trước kêu…"
            aria-invalid={submitted && !description.trim()}
          />
          {submitted && !description.trim() && <span className="re-hint">Vui lòng mô tả sự cố.</span>}
        </label>

        <label className="re-field">
          <span>Ảnh chụp{isDamage ? '' : ' (không bắt buộc)'}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          />
          {photos.length > 0 && <span className="muted re-small">Đã chọn {photos.length} ảnh</span>}
          {submitted && missingPhoto && <span className="re-hint">Biên bản hư hỏng cần ít nhất 1 ảnh.</span>}
        </label>

        {isDamage && (
          <div className="alert alert-warning">
            Sau khi trả, xe sẽ chuyển sang "Bảo trì" và đơn vị vận hành nhận được biên bản này.
          </div>
        )}
        {err && (
          <div className="alert alert-error" role="alert">
            {errorText(err.code, err.message)}
          </div>
        )}

        <div className="re-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={report.isPending}>
            Đóng
          </button>
          <button type="submit" className="btn btn-danger" disabled={report.isPending}>
            {report.isPending ? 'Đang gửi…' : isDamage ? 'Lập biên bản' : 'Gửi báo cáo'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
