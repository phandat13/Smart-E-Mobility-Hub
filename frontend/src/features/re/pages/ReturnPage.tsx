import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError, serverNow } from '../../../shared/api/http'
import { useServerNow } from '../../../shared/hooks/useServerNow'
import { formatKm, formatMoney, formatTime, formatTimeWithSeconds } from '../../../shared/i18n/format'
import { errorText } from '../../../shared/i18n/vi'
import { useCurrentTrip, useHubs, useReturnCheck, useReturnTrip, useUploadReturnPhoto } from '../api'
import { HubDirections } from '../components/HubDirections'
import { IncidentReportModal } from '../components/IncidentReportModal'
import { StepList } from '../components/StepList'
import type { Step } from '../components/StepList'
import { useOfflineReturnSync } from '../offlineReturn'
import type { Incident, ManualProof, Trip } from '../types'
import '../re.css'

const OTP_RE = /^\d{6}$/

function returnErrorText(err: ApiError): string {
  switch (err.code) {
    case 'IOT_TIMEOUT':
    case 'IOT_COMMAND_FAILED':
      return 'Thiết bị khóa xe không phản hồi. Hệ thống đã ghi nhận sự cố – vui lòng thử lại, hoặc trả xe bằng mã OTP tại chỗ.'
    case 'NETWORK_ERROR':
      return 'Mất kết nối mạng. Bạn có thể trả xe bằng mã OTP offline bên dưới.'
    default:
      return errorText(err.code, err.message)
  }
}

export function ReturnPage() {
  const trip = useCurrentTrip()
  const [returnedId, setReturnedId] = useState<number | null>(null)

  if (returnedId != null) return <p className="muted">Đang mở tóm tắt chuyến đi…</p>
  if (trip.isPending) return <p className="muted">Đang tải chuyến đi…</p>
  if (!trip.data) {
    return (
      <div className="card re-empty">
        <h2>Bạn không có chuyến đi nào cần trả xe</h2>
        <Link to="/trips/history">Xem lịch sử đặt xe</Link>
      </div>
    )
  }
  return <ReturnForm trip={trip.data} onReturned={setReturnedId} />
}

function ReturnForm({ trip, onReturned }: { trip: Trip; onReturned: (id: number) => void }) {
  const navigate = useNavigate()
  const now = useServerNow()
  const hubs = useHubs()
  const [hubId, setHubId] = useState<number | null>(null)
  const check = useReturnCheck(trip.id, hubId)
  const returnTrip = useReturnTrip()
  const upload = useUploadReturnPhoto()

  const [noDamage, setNoDamage] = useState(false)
  const [itemsTaken, setItemsTaken] = useState(false)
  const [damage, setDamage] = useState<Incident | null>(null)
  const [reportingDamage, setReportingDamage] = useState(false)

  const [manualOpen, setManualOpen] = useState(false)
  const [manualMethod, setManualMethod] = useState<'OTP' | 'PHOTO'>('OTP')
  const [manualOtp, setManualOtp] = useState('')
  const [manualPhoto, setManualPhoto] = useState<File | null>(null)

  const [offlineOpen, setOfflineOpen] = useState(false)
  const [offlineOtp, setOfflineOtp] = useState('')

  const goSummary = (t: Trip) => {
    onReturned(t.id)
    navigate(`/trips/${t.id}/summary`, { replace: true })
  }
  const offline = useOfflineReturnSync(goSummary)

  const hub = hubs.data?.find((h) => h.id === hubId)
  const startHub = hubs.data?.find((h) => h.id === trip.startHubId)
  const c = check.data?.hubId === hubId ? check.data : undefined
  const slotConfirmed = c?.slotConfirmed === true
  const manualReady = manualOpen && (manualMethod === 'OTP' ? OTP_RE.test(manualOtp) : manualPhoto != null)
  const checklistOk = itemsTaken && (noDamage || damage != null)
  const busy = returnTrip.isPending || upload.isPending
  const canSubmit = hubId != null && (slotConfirmed || manualReady) && checklistOk && !busy
  const err =
    (returnTrip.error instanceof ApiError ? returnTrip.error : null) ??
    (upload.error instanceof ApiError ? upload.error : null)
  const rideMinutes = Math.max(1, Math.ceil((now - Date.parse(trip.startedAt)) / 60_000))
  const pendingOffline = offline.pending?.tripId === trip.id

  function chooseHub(id: number) {
    setHubId(id)
    setManualOpen(false)
    returnTrip.reset()
  }

  async function submit() {
    if (!canSubmit || hubId == null) return
    let manualProof: ManualProof | undefined
    if (!slotConfirmed) {
      if (manualMethod === 'OTP') manualProof = { method: 'OTP', otp: manualOtp }
      else if (manualPhoto) {
        const res = await upload.mutateAsync({ tripId: trip.id, photo: manualPhoto }).catch(() => null)
        if (!res) return
        manualProof = { method: 'PHOTO', proofId: res.proofId }
      }
    }
    returnTrip.mutate(
      {
        tripId: trip.id,
        body: { hubId, checklistConfirmed: true, damageIncidentId: damage?.id, manualProof },
      },
      {
        onSuccess: (t) => t && goSummary(t),
        onError: (e) => {
          if (e instanceof ApiError && e.code === 'INVALID_RETURN_LOCATION') setManualOpen(true)
          if (e instanceof ApiError && e.code === 'NETWORK_ERROR') setOfflineOpen(true)
        },
      },
    )
  }

  function submitOffline() {
    if (hubId == null || !OTP_RE.test(offlineOtp) || !checklistOk) return
    offline.enqueue({
      tripId: trip.id,
      body: {
        hubId,
        otp: offlineOtp,
        clientEndedAt: new Date(serverNow()).toISOString(),
        checklistConfirmed: true,
        damageIncidentId: damage?.id,
      },
    })
  }

  const step1: Step = {
    key: 'slot',
    title: 'Đỗ xe vào vị trí trống hợp lệ',
    state: hubId == null ? 'idle' : slotConfirmed || manualReady ? 'done' : 'running',
    detail:
      hubId == null
        ? 'Chọn Hub bạn đang trả xe ở trên.'
        : slotConfirmed && c
          ? `Thiết bị tại Hub xác nhận xe nằm trong ô ${c.slotCode} · ${formatTimeWithSeconds(c.confirmedAt!)}`
          : manualReady
            ? `Xác nhận thủ công bằng ${manualMethod === 'OTP' ? 'mã OTP tại chỗ' : 'ảnh chụp'}`
            : 'Đang chờ thiết bị tại Hub xác nhận vị trí đỗ…',
  }
  const step2: Step = {
    key: 'charge',
    title: 'Cắm sạc (tùy chọn)',
    state: c?.chargingConnected ? 'done' : slotConfirmed || manualReady ? 'skipped' : 'idle',
    detail: c?.chargingConnected
      ? `Cổng sạc ${c.chargingPortCode} xác nhận bắt đầu phiên sạc`
      : slotConfirmed || manualReady
        ? 'Chưa cắm sạc – có thể bỏ qua'
        : 'Nếu Hub có cổng sạc trống, cắm sạc giúp xe sẵn sàng cho người sau',
  }
  const step3: Step = {
    key: 'checklist',
    title: 'Kiểm tra lại xe trước khi trả',
    state: checklistOk ? 'done' : 'idle',
    detail: (
      <div className="re-checklist">
        {damage ? (
          <span className="text-danger">Đã lập biên bản sự cố #{damage.code} – xe sẽ chuyển "Bảo trì" sau khi trả.</span>
        ) : (
          <label>
            <input type="checkbox" checked={noDamage} onChange={(e) => setNoDamage(e.target.checked)} />
            Xe không hư hỏng, đèn/phanh bình thường
          </label>
        )}
        <label>
          <input type="checkbox" checked={itemsTaken} onChange={(e) => setItemsTaken(e.target.checked)} />
          Đã tháo đồ cá nhân
        </label>
      </div>
    ),
  }

  return (
    <div className="re-layout">
      <section className="card re-main">
        <span className="eyebrow">Trả xe</span>
        <h1 className="re-h1">
          Trả {trip.vehicleCode} tại Hub {hub?.name ?? '…'}
        </h1>

        <div className="re-chips" role="radiogroup" aria-label="Hub trả xe">
          {hubs.data?.map((h) => (
            <button
              key={h.id}
              role="radio"
              aria-checked={hubId === h.id}
              className={`re-chip${hubId === h.id ? ' is-active' : ''}`}
              onClick={() => chooseHub(h.id)}
              disabled={busy || pendingOffline}
            >
              {h.name}
            </button>
          ))}
        </div>

        <StepList steps={[step1, step2, step3]} numbered />

        {hubId != null && !slotConfirmed && (
          <div className="re-manual">
            <p className="muted re-small">
              Không nhận được xác nhận vị trí đỗ? Điều chỉnh xe trong ô đỗ hoặc xác nhận thủ công bằng ảnh chụp / mã OTP
              tại chỗ.
            </p>
            {!manualOpen ? (
              <button className="btn btn-secondary" onClick={() => setManualOpen(true)}>
                Xác nhận thủ công
              </button>
            ) : (
              <div className="re-manual-form">
                <fieldset className="re-segment">
                  <legend className="sr-only">Cách xác nhận</legend>
                  <label className={manualMethod === 'OTP' ? 'is-active' : ''}>
                    <input type="radio" checked={manualMethod === 'OTP'} onChange={() => setManualMethod('OTP')} />
                    Mã OTP tại chỗ
                  </label>
                  <label className={manualMethod === 'PHOTO' ? 'is-active' : ''}>
                    <input type="radio" checked={manualMethod === 'PHOTO'} onChange={() => setManualMethod('PHOTO')} />
                    Ảnh chụp xe trong ô đỗ
                  </label>
                </fieldset>
                {manualMethod === 'OTP' ? (
                  <label className="re-field">
                    <span>Mã OTP hiển thị trên thiết bị tại Hub (6 số)</span>
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={manualOtp}
                      onChange={(e) => setManualOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                ) : (
                  <label className="re-field">
                    <span>Ảnh chụp xe trong ô đỗ</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setManualPhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {err && (
          <div className="alert alert-error" role="alert">
            {returnErrorText(err)}
          </div>
        )}

        <div className="re-actions">
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit || pendingOffline}>
            {busy ? 'Đang khóa xe & tính phí…' : 'Xác nhận trả xe'}
          </button>
        </div>
        {!damage && (
          <button className="re-link-button text-danger" onClick={() => setReportingDamage(true)}>
            Xe có hư hỏng? Lập biên bản sự cố kèm ảnh
          </button>
        )}

        <div className="alert alert-warning">
          Mất kết nối mạng? Bạn vẫn trả xe được bằng mã OTP offline – dữ liệu chuyến đi tự đồng bộ trong vòng 1 phút
          khi có kết nối trở lại.
          {!offlineOpen && !pendingOffline && (
            <>
              {' '}
              <button className="re-link-button" onClick={() => setOfflineOpen(true)}>
                Trả xe bằng OTP offline
              </button>
            </>
          )}
        </div>

        {offline.rejected && (
          <div className="alert alert-error" role="alert">
            Không đồng bộ được trả xe offline: {errorText(offline.rejected.code, offline.rejected.message)} Vui lòng
            thử lại.
          </div>
        )}

        {pendingOffline ? (
          <div className="alert alert-success" role="status">
            Đã ghi nhận trả xe offline lúc {formatTime(offline.pending!.body.clientEndedAt)}.{' '}
            {offline.syncing ? 'Đang đồng bộ…' : 'Đang chờ kết nối để đồng bộ dữ liệu chuyến đi.'}
          </div>
        ) : (
          offlineOpen && (
            <div className="re-manual-form">
              <label className="re-field">
                <span>Mã OTP offline hiển thị trên thiết bị tại Hub (6 số)</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={offlineOtp}
                  onChange={(e) => setOfflineOtp(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              {(hubId == null || !checklistOk) && (
                <p className="re-hint">Chọn Hub và hoàn tất bước 3 trước khi trả bằng OTP.</p>
              )}
              <button
                className="btn btn-secondary"
                onClick={submitOffline}
                disabled={hubId == null || !checklistOk || !OTP_RE.test(offlineOtp)}
              >
                Trả xe bằng OTP offline
              </button>
            </div>
          )
        )}
      </section>

      <aside className="re-side">
        <section className="card">
          <h3>Tóm tắt tạm tính</h3>
          <dl className="re-info re-info-compact">
            <dt>Bắt đầu</dt>
            <dd>
              {formatTime(trip.startedAt)} · {startHub?.name ?? '…'}
            </dd>
            <dt>Thời gian</dt>
            <dd>{rideMinutes} phút</dd>
            <dt>Quãng đường</dt>
            <dd>{formatKm(trip.distanceKm)}</dd>
            <dt>Pin hiện tại</dt>
            <dd>{trip.currentBattery} %</dd>
            <dt>Chi phí tạm tính</dt>
            <dd>{formatMoney(trip.cost)}</dd>
          </dl>
        </section>
        <HubDirections hub={hub} title="Đường tới Hub trả xe" />
      </aside>

      {reportingDamage && (
        <IncidentReportModal
          mode="damage"
          vehicleId={trip.vehicleId}
          vehicleCode={trip.vehicleCode}
          tripId={trip.id}
          hubId={hubId ?? undefined}
          onClose={() => setReportingDamage(false)}
          onReported={(incident) => {
            setReportingDamage(false)
            setDamage(incident)
            setNoDamage(false)
          }}
        />
      )}
    </div>
  )
}
