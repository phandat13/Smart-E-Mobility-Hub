import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../../shared/api/http'
import { formatRange } from '../../../shared/i18n/format'
import { errorText, vehicleTypeLabel } from '../../../shared/i18n/vi'
import { useAvailableVehicles, useCurrentReservation, useHubs, useReserve } from '../api'
import { RESERVATION_RULES } from '../types'
import '../re.css'

/**
 * Danh sách xe "Sẵn sàng" để chọn đặt trước (bước trước RE01).
 * Màn này không có khung riêng trong Figma RE (B.8), nhãn chữ cần nhóm xác nhận.
 */
export function VehicleListPage() {
  const navigate = useNavigate()
  const [hubId, setHubId] = useState<number | null>(null)
  const hubs = useHubs()
  const vehicles = useAvailableVehicles(hubId)
  const current = useCurrentReservation()
  const reserve = useReserve()

  const hubName = (id: number | null) => hubs.data?.find((h) => h.id === id)?.name ?? '—'
  const hasActive = current.data != null

  function onReserve(vehicleId: number) {
    reserve.mutate(vehicleId, { onSuccess: () => navigate('/reserve/current') })
  }

  const err = reserve.error instanceof ApiError ? reserve.error : null

  return (
    <div className="re-page">
      <header className="re-page-head">
        <span className="eyebrow">Đặt chỗ</span>
        <h1>Chọn phương tiện để đặt trước</h1>
        <p className="muted">Xe được giữ cho bạn trong {RESERVATION_RULES.holdMinutes} phút sau khi đặt.</p>
      </header>

      {hasActive && (
        <div className="alert alert-warning">
          Bạn đang có một đơn đặt xe còn hiệu lực. <Link to="/reserve/current">Xem đơn hiện tại</Link>
        </div>
      )}

      {err && (
        <div className="alert alert-error" role="alert">
          {errorText(err.code, err.message)}
          {err.code === 'ACTIVE_RESERVATION_EXISTS' && (
            <>
              {' '}
              <Link to="/reserve/current">Xem đơn hiện tại</Link>
            </>
          )}
        </div>
      )}

      <div className="re-chips" role="tablist" aria-label="Lọc theo Hub">
        <button className={`re-chip${hubId == null ? ' is-active' : ''}`} onClick={() => setHubId(null)}>
          Tất cả Hub
        </button>
        {hubs.data?.map((h) => (
          <button
            key={h.id}
            className={`re-chip${hubId === h.id ? ' is-active' : ''}`}
            onClick={() => setHubId(h.id)}
          >
            {h.name}
          </button>
        ))}
      </div>

      {vehicles.isPending && <p className="muted">Đang tải danh sách xe…</p>}
      {vehicles.isError && <div className="alert alert-error">Không tải được danh sách xe.</div>}
      {vehicles.data?.length === 0 && <p className="muted">Hiện không có xe sẵn sàng tại Hub này.</p>}

      <div className="re-vehicle-grid">
        {vehicles.data?.map((v) => {
          const lowBattery = v.batteryPercent < RESERVATION_RULES.minBatteryPercent
          return (
            <article key={v.id} className="card re-vehicle">
              <div className="re-vehicle-top">
                <strong>{v.code}</strong>
                <span className="badge">Sẵn sàng</span>
              </div>
              <p className="muted">
                {vehicleTypeLabel[v.type] ?? v.type} · {hubName(v.hubId)}
              </p>
              <p className={lowBattery ? 're-battery is-low' : 're-battery'}>
                Pin {v.batteryPercent} % ({formatRange(v.rangeKm)})
              </p>
              <button
                className="btn btn-primary"
                // Chặn bấm đúp: khóa mọi nút khi đang gửi một yêu cầu đặt xe.
                disabled={reserve.isPending || hasActive || lowBattery}
                onClick={() => onReserve(v.id)}
              >
                {reserve.isPending && reserve.variables === v.id ? 'Đang đặt…' : 'Đặt trước'}
              </button>
              {lowBattery && (
                <span className="re-hint">Pin dưới {RESERVATION_RULES.minBatteryPercent} %, không thể đặt</span>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
