import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ApiError } from '../../../shared/api/http'
import { useServerNow } from '../../../shared/hooks/useServerNow'
import { formatCountdown, formatRange, formatTimeWithSeconds } from '../../../shared/i18n/format'
import { errorText, vehicleTypeLabel } from '../../../shared/i18n/vi'
import { useAvailableVehicles, useCurrentReservation, useCurrentTrip, useHubs, usePickup, useVehicle } from '../api'
import { StepList } from '../components/StepList'
import type { Step, StepState } from '../components/StepList'
import { RESERVATION_RULES } from '../types'
import type { Reservation } from '../types'
import '../re.css'

type StepKey = 'identity' | 'reservation' | 'location' | 'battery' | 'incident' | 'unlock'
const ORDER: StepKey[] = ['identity', 'reservation', 'location', 'battery', 'incident', 'unlock']

const FAILED_STEP: Record<string, StepKey> = {
  UNAUTHORIZED: 'identity',
  TOKEN_INVALID: 'identity',
  NOT_FOUND: 'reservation',
  RESERVATION_NOT_ACTIVE: 'reservation',
  RESERVATION_EXPIRED: 'reservation',
  WRONG_VEHICLE: 'reservation',
  ACTIVE_RESERVATION_EXISTS: 'reservation',
  ACTIVE_TRIP_EXISTS: 'reservation',
  VEHICLE_UNAVAILABLE: 'reservation',
  VEHICLE_HAS_OPERATION: 'reservation',
  VEHICLE_NOT_AT_HUB: 'location',
  LOW_BATTERY: 'battery',
  INCIDENT_ALREADY_OPEN: 'incident',
  IOT_TIMEOUT: 'unlock',
  IOT_COMMAND_FAILED: 'unlock',
}

const SUGGEST_OTHER = new Set([
  'VEHICLE_UNAVAILABLE',
  'VEHICLE_HAS_OPERATION',
  'VEHICLE_NOT_AT_HUB',
  'LOW_BATTERY',
  'INCIDENT_ALREADY_OPEN',
  'IOT_TIMEOUT',
  'IOT_COMMAND_FAILED',
])

function pickupErrorText(err: ApiError): string {
  switch (err.code) {
    case 'IOT_TIMEOUT':
      return 'Thiết bị không phản hồi khi mở khóa. Chuyến đi không được tạo; xe đã chuyển "Báo lỗi". Vui lòng chọn xe khác.'
    case 'IOT_COMMAND_FAILED':
      return 'Thiết bị báo mở khóa thất bại. Chuyến đi không được tạo; xe đã chuyển "Báo lỗi". Vui lòng chọn xe khác.'
    case 'LOW_BATTERY':
      return `Pin xe dưới ${RESERVATION_RULES.minBatteryPercent} %, không thể nhận. Vui lòng chọn xe khác.`
    case 'VEHICLE_UNAVAILABLE':
      return 'Xe vừa được người khác nhận hoặc không còn sẵn sàng. Vui lòng chọn xe khác.'
    default:
      return errorText(err.code, err.message)
  }
}

export function PickupPage() {
  const trip = useCurrentTrip()
  const current = useCurrentReservation()
  const [submitted, setSubmitted] = useState(false)

  if (trip.isPending || current.isPending) return <p className="muted">Đang tải…</p>
  if (trip.data && !submitted) return <Navigate to="/trips/current" replace />
  const reservation = current.data?.status === 'RESERVED' ? current.data : null
  return <PickupForm reservation={reservation} onSubmit={() => setSubmitted(true)} />
}

function PickupForm({
  reservation: liveReservation,
  onSubmit,
}: {
  reservation: Reservation | null
  onSubmit: () => void
}) {
  const navigate = useNavigate()
  const now = useServerNow()
  const hubs = useHubs()
  const pickup = usePickup()
  const [snapshot, setSnapshot] = useState<Reservation | null>(null)
  const showingResult = pickup.isPending || pickup.isSuccess || pickup.isError
  const reservation = showingResult ? snapshot : liveReservation
  const reservedVehicle = useVehicle(reservation?.vehicleId)
  const [typedCode, setCode] = useState<string | null>(null)
  const code = typedCode ?? reservedVehicle.data?.code ?? ''
  const [progress, setProgress] = useState(0)
  const [succeeded, setSucceeded] = useState(false)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!pickup.isPending) return
    const id = setInterval(() => setProgress((p) => Math.min(p + 1, ORDER.length - 1)), 350)
    return () => clearInterval(id)
  }, [pickup.isPending])

  const err = pickup.error instanceof ApiError ? pickup.error : null
  const errHubId = typeof err?.details.hubId === 'number' ? err.details.hubId : null
  const errVehicleId = typeof err?.details.vehicleId === 'number' ? err.details.vehicleId : null
  const showSuggestions = err != null && SUGGEST_OTHER.has(err.code) && errHubId != null
  const suggestions = useAvailableVehicles(errHubId, showSuggestions)

  const hub = hubs.data?.find((h) => h.id === reservation?.hubId)
  const holdLeft = reservation ? Date.parse(reservation.expiresAt) - now : 0
  const holdExpired = reservation != null && holdLeft <= 0

  function submit(e?: FormEvent) {
    e?.preventDefault()
    const vehicleCode = code.trim().toUpperCase()
    if (!vehicleCode || pickup.isPending || succeeded) return
    onSubmit()
    setProgress(0)
    setSnapshot(liveReservation)
    pickup.mutate(
      { vehicleCode, reservationId: liveReservation?.id },
      {
        onSuccess: () => {
          setSucceeded(true)
          setTimeout(() => navigate('/pickup/success', { replace: true }), 700)
        },
        onSettled: () => setCheckedAt(new Date().toISOString()),
      },
    )
  }

  function stateOf(key: StepKey): StepState {
    const idx = ORDER.indexOf(key)
    if (succeeded) return 'done'
    if (pickup.isPending) return idx < progress ? 'done' : idx === progress ? 'running' : 'idle'
    if (err) {
      const failed = ORDER.indexOf(FAILED_STEP[err.code] ?? ORDER[progress])
      return idx < failed ? 'done' : idx === failed ? 'failed' : 'idle'
    }
    return 'idle'
  }

  const battery = reservedVehicle.data?.batteryPercent ?? (err?.details.batteryPercent as number | undefined)
  const steps: Step[] = [
    { key: 'identity', title: 'Xác thực danh tính', detail: 'Tài khoản sinh viên đang đăng nhập', state: stateOf('identity') },
    {
      key: 'reservation',
      title: reservation ? 'Đơn đặt trước hợp lệ' : 'Thuê trực tiếp – xe đang "Sẵn sàng"',
      detail: reservation
        ? `#${reservation.code}${holdExpired ? ', đã hết hạn' : `, còn ${formatCountdown(holdLeft)}`}`
        : 'Hệ thống giữ xe cho bạn trong lúc xử lý nhận xe',
      state: stateOf('reservation'),
    },
    { key: 'location', title: 'Xe đứng yên tại Hub', detail: 'Cảm biến vị trí', state: stateOf('location') },
    {
      key: 'battery',
      title: 'Mức pin đạt ngưỡng',
      detail: battery != null ? `${battery} % (tối thiểu ${RESERVATION_RULES.minBatteryPercent} %)` : `Tối thiểu ${RESERVATION_RULES.minBatteryPercent} %`,
      state: stateOf('battery'),
    },
    {
      key: 'incident',
      title: 'Không có sự cố đang mở',
      detail: checkedAt ? `Dữ liệu cảm biến cập nhật ${formatTimeWithSeconds(checkedAt)}` : 'Theo dữ liệu cảm biến mới nhất',
      state: stateOf('incident'),
    },
    { key: 'unlock', title: 'Đang gửi yêu cầu mở khóa tới thiết bị', state: stateOf('unlock') },
  ]

  function chooseSuggestion(vehicleCode: string) {
    pickup.reset()
    setCode(vehicleCode)
  }

  return (
    <div className="re-layout">
      <section className="card re-main">
        <span className="eyebrow">Nhận xe tại Hub{hub ? ` – ${hub.name}` : ''}</span>

        <div className="re-qr" aria-label="Khung quét mã QR">
          <div className="re-qr-frame">
            <span />
          </div>
          <p>Đưa mã QR trên xe hoặc tại điểm đỗ vào khung</p>
          <p className="muted re-small">Bản demo chưa bật camera – vui lòng nhập mã xe bên dưới.</p>
        </div>

        <form className="re-code-form" onSubmit={submit}>
          <label className="re-field">
            <span>Hoặc nhập mã xe</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="UG-018"
              autoComplete="off"
              disabled={pickup.isPending || succeeded}
            />
          </label>
          <button className="btn btn-secondary" type="submit" disabled={!code.trim() || pickup.isPending || succeeded}>
            Xác nhận
          </button>
        </form>

        {!reservation && (
          <p className="muted re-footnote">
            Không đặt trước? Bạn vẫn có thể thuê trực tiếp một xe đang "Sẵn sàng" tại Hub – hệ thống giữ xe cho bạn trong
            lúc xử lý nhận xe.
          </p>
        )}
        {reservation && holdExpired && (
          <div className="alert alert-warning">
            Đơn #{reservation.code} đã hết thời gian giữ chỗ. <Link to="/reserve">Đặt xe khác</Link>
          </div>
        )}

        {err && (
          <div className="alert alert-error" role="alert">
            {pickupErrorText(err)}
            {err.code === 'ACTIVE_RESERVATION_EXISTS' && (
              <>
                {' '}
                <Link to="/reserve/current">Xem đơn hiện tại</Link>
              </>
            )}
          </div>
        )}

        {showSuggestions && (
          <section className="re-suggest">
            <h3>Gợi ý xe khác tại Hub này</h3>
            {suggestions.isPending && <p className="muted">Đang tìm xe…</p>}
            {suggestions.data
              ?.filter((v) => v.id !== errVehicleId && v.batteryPercent >= RESERVATION_RULES.minBatteryPercent)
              .slice(0, 4)
              .map((v) => (
                <div key={v.id} className="re-suggest-item">
                  <span>
                    <strong>{v.code}</strong> · {vehicleTypeLabel[v.type] ?? v.type} · Pin {v.batteryPercent} % (
                    {formatRange(v.rangeKm)})
                  </span>
                  <button className="btn btn-secondary" onClick={() => chooseSuggestion(v.code)}>
                    Chọn xe này
                  </button>
                </div>
              ))}
            {suggestions.data?.length === 0 && <p className="muted">Hiện không còn xe sẵn sàng tại Hub này.</p>}
          </section>
        )}
      </section>

      <aside className="re-side">
        <section className="card">
          <h3>Xác thực & kiểm tra điều kiện nhận xe</h3>
          <StepList steps={steps} />
          <div className="alert alert-warning re-gap-top">
            Nếu thiết bị phản hồi thất bại hoặc quá thời gian, chuyến đi không được tạo; xe chuyển "Báo lỗi" và hệ thống
            gợi ý xe khác.
          </div>
          <button
            className="btn btn-primary re-block re-gap-top"
            onClick={() => submit()}
            disabled={!code.trim() || pickup.isPending || succeeded || holdExpired}
          >
            {pickup.isPending ? 'Đang mở khóa xe…' : succeeded ? 'Đã mở khóa' : 'Nhận xe'}
          </button>
        </section>
      </aside>
    </div>
  )
}
