import { http, HttpResponse } from 'msw'
import { RESERVATION_RULES } from '../types'
import type { Reservation, ReservationStatus } from '../types'
import { hubs, MOCK_STUDENT_ID, newReservationId, reservations, vehicles } from './db'
import type { MockReservation } from './db'

/**
 * Mock RE theo đúng backend hiện tại (RentalController / RentalService):
 * cùng URL, cùng thứ tự kiểm tra luật, cùng mã lỗi và HTTP status.
 */

const API = '/api/v1'
const ACTIVE: ReservationStatus[] = ['RESERVED', 'PICKED_UP']

// Header Date để FE tính giờ server (shared/api/http.ts).
function headers() {
  return { Date: new Date().toUTCString() }
}

function json<T extends object>(body: T, status = 200) {
  return HttpResponse.json(body, { status, headers: headers() })
}

function error(status: number, code: string, message: string, path: string, details: object = {}) {
  return json({ code, message, details, path, timestamp: new Date().toISOString() }, status)
}

// Backend hết hạn đơn bằng job nền (30 s/lần); mock làm "lười" mỗi khi có request.
function expireOverdue() {
  const now = Date.now()
  for (const r of reservations) {
    if (r.status === 'RESERVED' && now >= Date.parse(r.expiresAt)) {
      r.status = 'EXPIRED'
      const v = vehicles.find((x) => x.id === r.vehicleId)
      if (v && v.status === 'RESERVED') {
        // Vehicle.release(): pin dưới ngưỡng thì chờ sạc.
        v.status = v.batteryPercent < RESERVATION_RULES.minBatteryPercent ? 'NEEDS_CHARGE' : 'AVAILABLE'
      }
    }
  }
}

function randomCode() {
  const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  return `RS${hex}`
}

export const reHandlers = [
  http.get(`${API}/hubs`, () => json(hubs)),

  http.get(`${API}/vehicles`, ({ request }) => {
    expireOverdue()
    const url = new URL(request.url)
    const hubId = url.searchParams.get('hubId')
    const status = url.searchParams.get('status')
    const result = vehicles.filter(
      (v) => (hubId == null || v.hubId === Number(hubId)) && (status == null || v.status === status),
    )
    return json(result)
  }),

  http.get(`${API}/vehicles/:id`, ({ params, request }) => {
    const v = vehicles.find((x) => x.id === Number(params.id))
    if (!v) return error(404, 'NOT_FOUND', 'Không tìm thấy Phương tiện', new URL(request.url).pathname)
    return json(v)
  }),

  /** RE01 */
  http.post(`${API}/reservations`, async ({ request }) => {
    expireOverdue()
    const path = new URL(request.url).pathname
    const body = (await request.json().catch(() => null)) as { vehicleId?: number } | null
    if (body?.vehicleId == null) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, { vehicleId: 'must not be null' })
    }

    if (reservations.some((r) => r.studentId === MOCK_STUDENT_ID && ACTIVE.includes(r.status))) {
      return error(409, 'ACTIVE_RESERVATION_EXISTS', 'Bạn đang có một đơn đặt xe còn hiệu lực', path)
    }
    const v = vehicles.find((x) => x.id === body.vehicleId)
    if (!v) return error(404, 'NOT_FOUND', `Không tìm thấy Phương tiện ${body.vehicleId}`, path)
    if (v.status === 'TRANSFER_LOCKED' || v.status === 'MAINTENANCE_LOCKED') {
      return error(409, 'VEHICLE_HAS_OPERATION', 'Phương tiện đã được lên kế hoạch vận hành', path)
    }
    if (v.status !== 'AVAILABLE' || v.hubId == null) {
      return error(409, 'VEHICLE_UNAVAILABLE', 'Phương tiện không còn khả dụng', path)
    }
    const minBattery = RESERVATION_RULES.minBatteryPercent
    if (v.batteryPercent < minBattery) {
      return error(422, 'LOW_BATTERY', 'Pin phương tiện dưới mức tối thiểu', path, {
        batteryPercent: v.batteryPercent,
        minBatteryPercent: minBattery,
      })
    }

    v.status = 'RESERVED'
    const now = Date.now()
    const r: MockReservation = {
      id: newReservationId(),
      code: randomCode(),
      studentId: MOCK_STUDENT_ID,
      vehicleId: v.id,
      hubId: v.hubId,
      status: 'RESERVED',
      reservedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RESERVATION_RULES.holdMinutes * 60_000).toISOString(),
      extensionCount: 0,
    }
    reservations.push(r)
    return json(toResponse(r), 201)
  }),

  http.get(`${API}/reservations/current`, () => {
    expireOverdue()
    const r = reservations
      .filter((x) => x.studentId === MOCK_STUDENT_ID && ACTIVE.includes(x.status))
      .sort((a, b) => b.reservedAt.localeCompare(a.reservedAt))[0]
    if (!r) return new HttpResponse(null, { status: 204, headers: headers() })
    return json(toResponse(r))
  }),
]

// Giống RentalDto.ReservationResponse.from(): không trả studentId.
function toResponse(r: MockReservation): Reservation {
  return {
    id: r.id,
    code: r.code,
    vehicleId: r.vehicleId,
    hubId: r.hubId,
    status: r.status,
    reservedAt: r.reservedAt,
    expiresAt: r.expiresAt,
    extensionCount: r.extensionCount,
  }
}
