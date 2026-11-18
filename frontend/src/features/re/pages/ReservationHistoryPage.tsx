import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { formatDate, formatDateTime, formatTime } from '../../../shared/i18n/format'
import { reservationTabLabel, vehicleTypeLabel } from '../../../shared/i18n/vi'
import { useCurrentReservation, useReservationDetail, useReservationHistory } from '../api'
import { ReservationStatusChip } from '../components/StatusChip'
import { RESERVATION_RULES } from '../types'
import type { ReservationDetail, ReservationEvent, ReservationStatus, ReservationSummary } from '../types'
import '../re.css'

const TABS: (ReservationStatus | null)[] = [null, 'RESERVED', 'PICKED_UP', 'COMPLETED', 'CANCELLED', 'EXPIRED']
const PAGE_SIZE = 10

export function ReservationHistoryPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as ReservationStatus | null) ?? null
  const page = Math.max(0, Number(params.get('page') ?? 0))
  const selectedId = params.get('id') ? Number(params.get('id')) : null
  const [view, setView] = useState<'reservations' | 'trips'>('reservations')

  const history = useReservationHistory(status, page, PAGE_SIZE)
  const current = useCurrentReservation()
  const holdingCount = current.data?.status === 'RESERVED' ? 1 : 0

  function update(next: { status?: ReservationStatus | null; page?: number; id?: number | null }) {
    const p = new URLSearchParams(params)
    const set = (k: string, v: string | null) => (v == null ? p.delete(k) : p.set(k, v))
    if ('status' in next) set('status', next.status ?? null)
    if ('page' in next) set('page', next.page ? String(next.page) : null)
    if ('id' in next) set('id', next.id != null ? String(next.id) : null)
    setParams(p, { replace: true })
  }

  const data = history.data
  const selected = selectedId ?? data?.items[0]?.id ?? null

  return (
    <div className="re-page">
      <header className="re-page-head re-history-head">
        <div>
          <span className="eyebrow">Chuyến đi của tôi</span>
          <h1>{view === 'reservations' ? 'Lịch sử đặt xe' : 'Lịch sử chuyến đi'}</h1>
        </div>
        <div className="re-toggle" role="group" aria-label="Chọn loại lịch sử">
          <button className={view === 'trips' ? 'is-active' : ''} onClick={() => setView('trips')}>
            Lịch sử chuyến đi
          </button>
          <button className={view === 'reservations' ? 'is-active' : ''} onClick={() => setView('reservations')}>
            Lịch sử đặt xe
          </button>
        </div>
      </header>

      {view === 'trips' ? (
        <div className="card">
          <p className="muted">
            Lịch sử chuyến đi chưa làm: cần nhóm chốt API danh sách chuyến đi (<code>GET /trips</code>) và module phụ
            trách. Chi tiết từng chuyến đã có ở đơn tương ứng bên tab "Lịch sử đặt xe".
          </p>
        </div>
      ) : (
        <>
          <div className="re-chips" role="tablist" aria-label="Lọc theo trạng thái">
            {TABS.map((t) => (
              <button
                key={t ?? 'ALL'}
                role="tab"
                aria-selected={status === t}
                className={`re-chip${status === t ? ' is-active' : ''}`}
                onClick={() => update({ status: t, page: 0, id: null })}
              >
                {reservationTabLabel[t ?? 'ALL']}
                {t === 'RESERVED' && holdingCount > 0 ? ` (${holdingCount})` : ''}
              </button>
            ))}
          </div>

          <div className="re-layout">
            <section className="card re-table-card">
              {history.isPending && <p className="muted">Đang tải lịch sử…</p>}
              {history.isError && <div className="alert alert-error">Không tải được lịch sử đặt xe.</div>}
              {data && data.items.length === 0 && <p className="muted">Không có đơn nào ở mục này.</p>}
              {data && data.items.length > 0 && (
                <div className="re-table-wrap">
                  <table className="re-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Phương tiện</th>
                        <th>Hub</th>
                        <th>Đặt / Nhận / Trả</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((r) => (
                        <tr
                          key={r.id}
                          className={r.id === selected ? 'is-selected' : ''}
                          onClick={() => update({ id: r.id })}
                        >
                          <td>
                            <button className="re-link-button" onClick={() => update({ id: r.id })}>
                              #{r.code}
                            </button>
                          </td>
                          <td>
                            {r.vehicleCode}
                            <div className="muted re-small">{vehicleTypeLabel[r.vehicleType] ?? r.vehicleType}</div>
                          </td>
                          <td>{r.hubName}</td>
                          <td>
                            {formatDateTime(r.reservedAt)}
                            <div className="muted re-small">{timeNote(r)}</div>
                          </td>
                          <td>
                            <ReservationStatusChip status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data && data.totalPages > 1 && (
                <div className="re-pager">
                  <button className="btn btn-secondary" disabled={page === 0} onClick={() => update({ page: page - 1, id: null })}>
                    Trang trước
                  </button>
                  <span className="muted">
                    Trang {page + 1}/{data.totalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    disabled={page + 1 >= data.totalPages}
                    onClick={() => update({ page: page + 1, id: null })}
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </section>

            <aside className="re-side">
              <DetailPanel id={selected} />
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

function timeNote(r: ReservationSummary): string {
  switch (r.status) {
    case 'RESERVED':
      return `hạn giữ chỗ ${formatTime(r.expiresAt)}`
    case 'PICKED_UP':
      return r.pickedUpAt ? `nhận ${formatTime(r.pickedUpAt)}` : ''
    case 'COMPLETED':
      return [r.pickedUpAt && `nhận ${formatTime(r.pickedUpAt)}`, r.completedAt && `trả ${formatTime(r.completedAt)}`]
        .filter(Boolean)
        .join(' · ')
    case 'CANCELLED':
      return r.cancelledAt ? `hủy lúc ${formatTime(r.cancelledAt)}` : ''
    case 'EXPIRED':
      return `quá ${holdMinutes(r)} phút giữ chỗ`
  }
}

function holdMinutes(r: ReservationSummary) {
  return Math.round((Date.parse(r.expiresAt) - Date.parse(r.reservedAt)) / 60_000)
}

function DetailPanel({ id }: { id: number | null }) {
  const detail = useReservationDetail(id)

  if (id == null) {
    return (
      <section className="card">
        <p className="muted">Chọn một đơn để xem chi tiết.</p>
      </section>
    )
  }
  if (detail.isPending) return <section className="card muted">Đang tải chi tiết…</section>
  if (detail.isError || !detail.data) return <div className="alert alert-error">Không tải được chi tiết đơn.</div>

  const r = detail.data
  return (
    <section className="card re-detail">
      <div className="re-title">
        <h3>Chi tiết đơn #{r.code}</h3>
        <ReservationStatusChip status={r.status} />
      </div>
      <dl className="re-info re-info-compact">
        <dt>Phương tiện</dt>
        <dd>
          {r.vehicleCode} · {vehicleTypeLabel[r.vehicleType] ?? r.vehicleType}
        </dd>
        <dt>Hub</dt>
        <dd>{r.hubName}</dd>
        <dt>Thời điểm đặt</dt>
        <dd>{formatDateTime(r.reservedAt)}</dd>
        <dt>Nhận xe</dt>
        <dd>{r.pickedUpAt ? formatDateTime(r.pickedUpAt) : '—'}</dd>
        <dt>Trả xe</dt>
        <dd>
          {r.completedAt
            ? `${formatTime(r.completedAt)} · ${formatDate(r.completedAt)}${r.returnHubName ? ` tại ${r.returnHubName}` : ''}`
            : '—'}
        </dd>
      </dl>

      <h4 className="re-subtitle">Lịch sử trạng thái & gia hạn</h4>
      <Timeline detail={r} />

      <div className="re-actions">
        {r.status === 'RESERVED' && (
          <Link className="btn btn-primary" to="/reserve/current">
            Mở đơn đang giữ chỗ
          </Link>
        )}
        {r.status === 'PICKED_UP' && (
          <Link className="btn btn-primary" to="/trips/current">
            Xem chuyến đi đang diễn ra
          </Link>
        )}
        {r.status === 'COMPLETED' && r.tripId != null && (
          <Link className="btn btn-secondary" to={`/trips/${r.tripId}/summary`}>
            Xem tóm tắt chuyến đi
          </Link>
        )}
      </div>
    </section>
  )
}

function eventLabel(e: ReservationEvent, extensionIndex: number): string {
  switch (e.type) {
    case 'CREATED':
      return `Tạo đơn – giữ chỗ ${RESERVATION_RULES.holdMinutes} phút`
    case 'EXTENDED':
      return `Gia hạn lần ${extensionIndex}: +${RESERVATION_RULES.extendMinutes} phút`
    case 'PICKED_UP':
      return 'Nhận xe – bắt đầu chuyến đi'
    case 'RETURNED':
      return 'Trả xe – đơn hoàn tất'
    case 'CANCELLED':
      return 'Hủy đặt trước'
    case 'EXPIRED':
      return 'Hết hạn giữ chỗ'
  }
}

function Timeline({ detail }: { detail: ReservationDetail }) {
  return (
    <ol className="re-timeline">
      {detail.events.map((e, i) => {
        const extensionIndex = detail.events.slice(0, i + 1).filter((x) => x.type === 'EXTENDED').length
        return (
          <li key={i} className={`is-${e.type.toLowerCase()}`}>
            <strong>{eventLabel(e, extensionIndex)}</strong>
            <span className="muted re-small">
              {formatDateTime(e.at)}
              {e.note ? ` · ${e.note}` : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
