import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useServerNow } from '../../../shared/hooks/useServerNow'
import { formatElapsed, formatKm, formatMoney, formatTime } from '../../../shared/i18n/format'
import { useCurrentTrip, useHubs } from '../api'
import { IncidentReportModal } from '../components/IncidentReportModal'
import { useOfflineReturnSync } from '../offlineReturn'
import type { Incident } from '../types'
import '../re.css'

export function ActiveTripPage() {
  const navigate = useNavigate()
  const trip = useCurrentTrip()
  const hubs = useHubs()
  const now = useServerNow()
  const [reporting, setReporting] = useState(false)
  const [reported, setReported] = useState<Incident | null>(null)
  const [showHubs, setShowHubs] = useState(false)
  const offline = useOfflineReturnSync((t) => navigate(`/trips/${t.id}/summary`, { replace: true }))

  if (trip.isPending) return <p className="muted">Đang tải chuyến đi…</p>
  if (trip.isError) return <div className="alert alert-error">Không tải được chuyến đi.</div>
  if (!trip.data) {
    return (
      <div className="card re-empty">
        <h2>Bạn không có chuyến đi nào đang diễn ra</h2>
        <div className="re-actions">
          <Link className="btn btn-primary" to="/pickup">
            Nhận xe tại Hub
          </Link>
          <Link className="btn btn-secondary" to="/trips/history">
            Xem lịch sử đặt xe
          </Link>
        </div>
      </div>
    )
  }

  const t = trip.data
  const startHub = hubs.data?.find((h) => h.id === t.startHubId)
  const pendingOffline = offline.pending?.tripId === t.id

  return (
    <div className="re-narrow">
      <section className="card re-main">
        <span className="eyebrow">
          Hành trình đang diễn ra – xe {t.vehicleCode} · xuất phát {startHub?.name ?? '…'} lúc {formatTime(t.startedAt)}
        </span>

        {pendingOffline && (
          <div className="alert alert-warning" role="status">
            Đã ghi nhận trả xe bằng OTP offline. Dữ liệu chuyến đi sẽ tự đồng bộ khi có kết nối trở lại
            {offline.syncing ? ' (đang đồng bộ…)' : ''}.
          </div>
        )}

        <div className="re-map re-map-live" aria-hidden="true">
          <span>Bản đồ trực tiếp · {formatKm(t.distanceKm)}</span>
        </div>

        <div className="re-stats">
          <div className="re-stat">
            <span className="muted">Chi phí tạm tính</span>
            <strong>{formatMoney(t.cost)}</strong>
          </div>
          <div className="re-stat">
            <span className="muted">Thời gian đã đi</span>
            <strong>{formatElapsed(now - Date.parse(t.startedAt))}</strong>
          </div>
          <div className="re-stat">
            <span className="muted">Pin hiện tại</span>
            <strong className={t.currentBattery < 20 ? 'text-danger' : ''}>{t.currentBattery} %</strong>
          </div>
        </div>

        <div className="re-actions">
          <button className="btn btn-primary" onClick={() => navigate('/trips/current/return')} disabled={pendingOffline}>
            Trả xe tại Hub
          </button>
          <button className="btn btn-secondary" onClick={() => setShowHubs((s) => !s)} aria-expanded={showHubs}>
            Tìm Hub trả xe gần nhất
          </button>
        </div>

        {showHubs && (
          <ul className="re-hub-list">
            {hubs.data?.map((h) => (
              <li key={h.id}>
                <span>{h.name}</span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chỉ đường
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="muted re-footnote">Chi phí cuối cùng do dịch vụ thanh toán mô phỏng tính khi kết thúc chuyến đi.</p>

        {reported && (
          <div className="alert alert-success" role="status">
            Đã gửi báo cáo sự cố #{reported.code}. Đơn vị vận hành sẽ liên hệ nếu cần.
          </div>
        )}
        <button className="btn btn-danger re-self-start" onClick={() => setReporting(true)}>
          Báo cáo sự cố (xe / cổng sạc)
        </button>
      </section>

      {reporting && (
        <IncidentReportModal
          vehicleId={t.vehicleId}
          vehicleCode={t.vehicleCode}
          tripId={t.id}
          onClose={() => setReporting(false)}
          onReported={(incident) => {
            setReporting(false)
            setReported(incident)
          }}
        />
      )}
    </div>
  )
}
