import { delay, http, HttpResponse } from 'msw'
import { RESERVATION_RULES } from '../types'
import type {
  OfflineReturnRequest,
  PickupRequest,
  RatingRequest,
  Reservation,
  ReservationDetail,
  ReservationEventType,
  ReservationStatus,
  ReservationSummary,
  ReturnCheck,
  ReturnRequest,
  Trip,
  Vehicle,
} from '../types'
import {
  HUB_WITHOUT_SLOT_SENSOR,
  HUBS_WITH_CHARGER,
  hubs,
  incidents,
  MOCK_STUDENT_ID,
  newIncidentId,
  newReservationId,
  newTripId,
  PENDING_CHECK_MS,
  pendingCheckSince,
  PRICE_PER_MINUTE,
  REJECTED_OTP,
  reservations,
  returnCheckStartedAt,
  returnProofs,
  SLOT_CONFIRM_DELAY_MS,
  trips,
  vehicleScenarios,
  vehicles,
} from './db'
import type { MockReservation, MockTrip } from './db'

const API = '/api/v1'
const ACTIVE: ReservationStatus[] = ['RESERVED', 'PICKED_UP']
const MIN = 60_000

function headers() {
  return { Date: new Date().toUTCString() }
}

function json<T extends object>(body: T, status = 200) {
  return HttpResponse.json(body, { status, headers: headers() })
}

function noContent() {
  return new HttpResponse(null, { status: 204, headers: headers() })
}

function error(status: number, code: string, message: string, path: string, details: object = {}) {
  return json({ code, message, details, path, timestamp: new Date().toISOString() }, status)
}

const pathOf = (request: Request) => new URL(request.url).pathname
const nowIso = () => new Date().toISOString()

function randomHex(n: number) {
  return crypto.randomUUID().replace(/-/g, '').slice(0, n).toUpperCase()
}

function addEvent(r: MockReservation, type: ReservationEventType, note: string | null = null) {
  r.events.push({ type, at: nowIso(), note })
}

function release(v: Vehicle) {
  v.status = v.batteryPercent < RESERVATION_RULES.minBatteryPercent ? 'NEEDS_CHARGE' : 'AVAILABLE'
}

function toPendingCheck(v: Vehicle) {
  v.status = 'PENDING_CHECK'
  pendingCheckSince.set(v.id, Date.now())
}

function runBackgroundJobs() {
  const now = Date.now()
  for (const r of reservations) {
    if (r.status === 'RESERVED' && now >= Date.parse(r.expiresAt)) {
      r.status = 'EXPIRED'
      r.events.push({ type: 'EXPIRED', at: r.expiresAt, note: null })
      const v = vehicles.find((x) => x.id === r.vehicleId)
      if (v && v.status === 'RESERVED') release(v)
    }
  }
  for (const [vehicleId, since] of pendingCheckSince) {
    if (now - since < PENDING_CHECK_MS) continue
    pendingCheckSince.delete(vehicleId)
    const v = vehicles.find((x) => x.id === vehicleId)
    if (v && v.status === 'PENDING_CHECK') release(v)
  }
}

function myReservations() {
  return reservations.filter((r) => r.studentId === MOCK_STUDENT_ID)
}

function myActiveReservation() {
  return myReservations()
    .filter((r) => ACTIVE.includes(r.status))
    .sort((a, b) => b.reservedAt.localeCompare(a.reservedAt))[0]
}

function myActiveTrip() {
  return trips.find((t) => t.studentId === MOCK_STUDENT_ID && t.status === 'IN_PROGRESS')
}

function findMyReservation(id: number) {
  return myReservations().find((r) => r.id === id)
}

function findMyTrip(id: number) {
  return trips.find((t) => t.studentId === MOCK_STUDENT_ID && t.id === id)
}

function rideMinutes(t: MockTrip, endMs = Date.now()) {
  return Math.max(0, (endMs - Date.parse(t.startedAt)) / MIN)
}

function refreshLiveTrip(t: MockTrip) {
  if (t.status !== 'IN_PROGRESS') return
  const minutes = rideMinutes(t)
  t.currentBattery = Math.max(0, Math.round(t.startBattery - minutes * 0.6))
  t.distanceKm = Math.round(minutes * 0.12 * 10) / 10
  t.cost = Math.max(1, Math.ceil(minutes)) * PRICE_PER_MINUTE
}

function finishTrip(t: MockTrip, hubId: number, endedAtMs: number, slotCode: string | null, damaged: boolean) {
  const minutes = rideMinutes(t, endedAtMs)
  const endBattery = Math.max(0, Math.round(t.startBattery - minutes * 0.6))
  const charging = HUBS_WITH_CHARGER.has(hubId)

  t.status = 'COMPLETED'
  t.endedAt = new Date(endedAtMs).toISOString()
  t.endHubId = hubId
  t.endSlotCode = slotCode
  t.endBattery = endBattery
  t.currentBattery = endBattery
  t.distanceKm = Math.round(minutes * 0.12 * 10) / 10
  t.cost = Math.max(1, Math.ceil(minutes)) * PRICE_PER_MINUTE

  const v = vehicles.find((x) => x.id === t.vehicleId)
  if (v) {
    v.hubId = hubId
    v.batteryPercent = endBattery
    v.rangeKm = Math.round(endBattery * 0.4)
    if (damaged) v.status = 'MAINTENANCE_LOCKED'
    else if (charging) v.status = 'CHARGING'
    else if (endBattery < RESERVATION_RULES.minBatteryPercent) v.status = 'NEEDS_CHARGE'
    else v.status = 'AVAILABLE'
    t.vehicleStatusAfterReturn = v.status
  }

  if (t.reservationId != null) {
    const r = reservations.find((x) => x.id === t.reservationId)
    if (r) {
      r.status = 'COMPLETED'
      r.completedAt = t.endedAt
      r.returnHubId = hubId
      r.events.push({ type: 'RETURNED', at: t.endedAt, note: damaged ? 'Có biên bản hư hỏng' : null })
    }
  }
}

function slotCodeFor(hubId: number, tripId: number) {
  return `P-${String(((hubId * 7 + tripId) % 20) + 1).padStart(2, '0')}`
}

function returnCheck(t: MockTrip, hubId: number): ReturnCheck {
  const key = `${t.id}:${hubId}`
  if (!returnCheckStartedAt.has(key)) returnCheckStartedAt.set(key, Date.now())
  const startedAt = returnCheckStartedAt.get(key)!
  const confirmed = hubId !== HUB_WITHOUT_SLOT_SENSOR && Date.now() - startedAt >= SLOT_CONFIRM_DELAY_MS
  const charging = confirmed && HUBS_WITH_CHARGER.has(hubId)
  return {
    tripId: t.id,
    hubId,
    slotConfirmed: confirmed,
    slotCode: confirmed ? slotCodeFor(hubId, t.id) : null,
    confirmedAt: confirmed ? new Date(startedAt + SLOT_CONFIRM_DELAY_MS).toISOString() : null,
    chargingConnected: charging,
    chargingPortCode: charging ? `#0${(hubId % 3) + 1}` : null,
  }
}

function createIncident(fields: {
  vehicleId: number | null
  tripId: number | null
  hubId: number | null
  targetType: string
  category: string
  description: string
  photoCount: number
}) {
  const incident = { id: newIncidentId(), code: `SC${randomHex(8)}`, createdAt: nowIso(), ...fields }
  incidents.push(incident)
  return incident
}

export const reHandlers = [
  http.get(`${API}/hubs`, () => json(hubs)),

  http.get(`${API}/vehicles`, ({ request }) => {
    runBackgroundJobs()
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
    if (!v) return error(404, 'NOT_FOUND', 'Không tìm thấy Phương tiện', pathOf(request))
    return json(v)
  }),

  http.post(`${API}/reservations`, async ({ request }) => {
    runBackgroundJobs()
    const path = pathOf(request)
    const body = (await request.json().catch(() => null)) as { vehicleId?: number } | null
    if (body?.vehicleId == null) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, { vehicleId: 'must not be null' })
    }

    if (myActiveReservation()) {
      return error(409, 'ACTIVE_RESERVATION_EXISTS', 'Bạn đang có một đơn đặt xe còn hiệu lực', path)
    }
    if (myActiveTrip()) {
      return error(409, 'ACTIVE_TRIP_EXISTS', 'Bạn đang có một chuyến đi chưa kết thúc', path)
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
      code: `RS${randomHex(10)}`,
      studentId: MOCK_STUDENT_ID,
      vehicleId: v.id,
      hubId: v.hubId,
      status: 'RESERVED',
      reservedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RESERVATION_RULES.holdMinutes * MIN).toISOString(),
      extensionCount: 0,
      pickedUpAt: null,
      completedAt: null,
      cancelledAt: null,
      returnHubId: null,
      tripId: null,
      events: [{ type: 'CREATED', at: new Date(now).toISOString(), note: null }],
    }
    reservations.push(r)
    return json(toResponse(r), 201)
  }),

  http.get(`${API}/reservations/current`, () => {
    runBackgroundJobs()
    const r = myActiveReservation()
    return r ? json(toResponse(r)) : noContent()
  }),

  http.get(`${API}/reservations`, ({ request }) => {
    runBackgroundJobs()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const page = Math.max(0, Number(url.searchParams.get('page') ?? 0))
    const size = Math.min(50, Math.max(1, Number(url.searchParams.get('size') ?? 10)))
    const all = myReservations()
      .filter((r) => status == null || r.status === status)
      .sort((a, b) => b.reservedAt.localeCompare(a.reservedAt))
    return json({
      items: all.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalItems: all.length,
      totalPages: Math.ceil(all.length / size),
    })
  }),

  http.get(`${API}/reservations/:id`, ({ params, request }) => {
    runBackgroundJobs()
    const r = findMyReservation(Number(params.id))
    if (!r) return error(404, 'NOT_FOUND', `Không tìm thấy Đơn đặt xe ${params.id}`, pathOf(request))
    return json(toDetail(r))
  }),

  http.post(`${API}/reservations/:id/cancel`, ({ params, request }) => {
    runBackgroundJobs()
    const path = pathOf(request)
    const r = findMyReservation(Number(params.id))
    if (!r) return error(404, 'NOT_FOUND', `Không tìm thấy Đơn đặt xe ${params.id}`, path)
    if (r.status !== 'RESERVED') {
      return error(409, 'RESERVATION_NOT_ACTIVE', 'Đơn đặt xe không còn ở trạng thái giữ chỗ', path, {
        status: r.status,
      })
    }
    r.status = 'CANCELLED'
    r.cancelledAt = nowIso()
    addEvent(r, 'CANCELLED')
    const v = vehicles.find((x) => x.id === r.vehicleId)
    if (v && v.status === 'RESERVED') toPendingCheck(v)
    return json(toResponse(r))
  }),

  http.post(`${API}/reservations/:id/extend`, ({ params, request }) => {
    runBackgroundJobs()
    const path = pathOf(request)
    const r = findMyReservation(Number(params.id))
    if (!r) return error(404, 'NOT_FOUND', `Không tìm thấy Đơn đặt xe ${params.id}`, path)
    if (r.status !== 'RESERVED') {
      return error(409, 'RESERVATION_NOT_ACTIVE', 'Đơn đặt xe không còn ở trạng thái giữ chỗ', path)
    }
    if (Date.now() >= Date.parse(r.expiresAt)) {
      return error(410, 'RESERVATION_EXPIRED', 'Đơn đặt xe đã hết hạn', path)
    }
    if (r.extensionCount >= RESERVATION_RULES.maxExtensions) {
      return error(422, 'MAX_EXTENSIONS_REACHED', 'Đã đạt số lần gia hạn tối đa', path, {
        maxExtensions: RESERVATION_RULES.maxExtensions,
      })
    }
    const v = vehicles.find((x) => x.id === r.vehicleId)
    if (v && vehicleScenarios[v.code] === 'PRIORITIZED') {
      return error(409, 'VEHICLE_HAS_OPERATION', 'Phương tiện đã được lên kế hoạch vận hành', path)
    }
    r.expiresAt = new Date(Date.parse(r.expiresAt) + RESERVATION_RULES.extendMinutes * MIN).toISOString()
    r.extensionCount++
    addEvent(r, 'EXTENDED')
    return json(toResponse(r))
  }),

  http.post(`${API}/rentals/pickup`, async ({ request }) => {
    runBackgroundJobs()
    const path = pathOf(request)
    const body = (await request.json().catch(() => null)) as PickupRequest | null
    const code = body?.vehicleCode?.trim().toUpperCase()
    if (!code) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, { vehicleCode: 'must not be blank' })
    }
    if (myActiveTrip()) {
      return error(409, 'ACTIVE_TRIP_EXISTS', 'Bạn đang có một chuyến đi chưa kết thúc', path)
    }
    const v = vehicles.find((x) => x.code === code)
    if (!v) return error(404, 'NOT_FOUND', `Không tìm thấy Phương tiện ${code}`, path)
    const hubDetails = { hubId: v.hubId, vehicleId: v.id }

    let reservation: MockReservation | undefined
    if (body?.reservationId != null) {
      reservation = findMyReservation(body.reservationId)
      if (!reservation) return error(404, 'NOT_FOUND', `Không tìm thấy Đơn đặt xe ${body.reservationId}`, path)
      if (reservation.status !== 'RESERVED') {
        return error(409, 'RESERVATION_NOT_ACTIVE', 'Đơn đặt xe không còn ở trạng thái giữ chỗ', path)
      }
      if (Date.now() >= Date.parse(reservation.expiresAt)) {
        return error(410, 'RESERVATION_EXPIRED', 'Đơn đặt xe đã hết hạn', path)
      }
      if (reservation.vehicleId !== v.id) {
        return error(422, 'WRONG_VEHICLE', 'Mã xe không khớp với đơn đặt trước', path, {
          expectedVehicleId: reservation.vehicleId,
        })
      }
    } else {
      if (myActiveReservation()) {
        return error(409, 'ACTIVE_RESERVATION_EXISTS', 'Bạn đang có một đơn đặt xe còn hiệu lực', path)
      }
      if (v.status === 'TRANSFER_LOCKED' || v.status === 'MAINTENANCE_LOCKED') {
        return error(409, 'VEHICLE_HAS_OPERATION', 'Phương tiện đã được lên kế hoạch vận hành', path, hubDetails)
      }
      if (v.status !== 'AVAILABLE' || v.hubId == null) {
        return error(409, 'VEHICLE_UNAVAILABLE', 'Phương tiện không còn khả dụng', path, hubDetails)
      }
    }

    const scenario = vehicleScenarios[v.code]
    if (scenario === 'NOT_AT_HUB') {
      return error(422, 'VEHICLE_NOT_AT_HUB', 'Cảm biến chưa xác nhận xe đứng yên tại Hub', path, hubDetails)
    }
    const minBattery = RESERVATION_RULES.minBatteryPercent
    if (v.batteryPercent < minBattery) {
      return error(422, 'LOW_BATTERY', 'Pin phương tiện dưới mức tối thiểu', path, {
        ...hubDetails,
        batteryPercent: v.batteryPercent,
        minBatteryPercent: minBattery,
      })
    }
    if (scenario === 'OPEN_INCIDENT') {
      return error(409, 'INCIDENT_ALREADY_OPEN', 'Tài nguyên đã có phiếu sự cố đang mở', path, hubDetails)
    }

    v.status = 'PICKUP_PENDING'
    await delay(scenario === 'UNLOCK_TIMEOUT' ? 5_000 : 1_800)

    if (scenario === 'UNLOCK_TIMEOUT' || scenario === 'UNLOCK_FAILED') {
      v.status = 'FAULTY'
      createIncident({
        vehicleId: v.id,
        tripId: null,
        hubId: v.hubId,
        targetType: 'VEHICLE',
        category: 'LOCK',
        description: scenario === 'UNLOCK_TIMEOUT' ? 'UNLOCK_TIMEOUT' : 'UNLOCK_FAILED',
        photoCount: 0,
      })
      if (reservation) {
        reservation.status = 'CANCELLED'
        reservation.cancelledAt = nowIso()
        addEvent(reservation, 'CANCELLED', 'Mở khóa thất bại – xe chuyển "Báo lỗi"')
      }
      return scenario === 'UNLOCK_TIMEOUT'
        ? error(504, 'IOT_TIMEOUT', 'Thiết bị không phản hồi', path, hubDetails)
        : error(502, 'IOT_COMMAND_FAILED', 'Thiết bị báo lỗi khi thực hiện lệnh', path, hubDetails)
    }

    v.status = 'IN_USE'
    const startedAt = nowIso()
    const id = newTripId()
    const trip: MockTrip = {
      id,
      code: `TP${randomHex(10)}`,
      studentId: MOCK_STUDENT_ID,
      reservationId: reservation?.id ?? null,
      vehicleId: v.id,
      vehicleCode: v.code,
      vehicleType: v.type,
      startHubId: v.hubId!,
      startSlotCode: slotCodeFor(v.hubId!, v.id),
      endHubId: null,
      endSlotCode: null,
      startedAt,
      endedAt: null,
      startBattery: v.batteryPercent,
      currentBattery: v.batteryPercent,
      endBattery: null,
      distanceKm: 0,
      cost: 0,
      status: 'IN_PROGRESS',
      vehicleStatusAfterReturn: null,
      rated: false,
    }
    trips.push(trip)
    if (reservation) {
      reservation.status = 'PICKED_UP'
      reservation.pickedUpAt = startedAt
      reservation.tripId = id
      addEvent(reservation, 'PICKED_UP')
    }
    refreshLiveTrip(trip)
    return json(toTrip(trip), 201)
  }),

  http.get(`${API}/trips/current`, () => {
    const t = myActiveTrip()
    if (!t) return noContent()
    refreshLiveTrip(t)
    return json(toTrip(t))
  }),

  http.get(`${API}/trips/:id`, ({ params, request }) => {
    const t = findMyTrip(Number(params.id))
    if (!t) return error(404, 'NOT_FOUND', `Không tìm thấy Chuyến đi ${params.id}`, pathOf(request))
    refreshLiveTrip(t)
    return json(toTrip(t))
  }),

  http.post(`${API}/trips/:id/return/check`, async ({ params, request }) => {
    const path = pathOf(request)
    const t = findMyTrip(Number(params.id))
    if (!t) return error(404, 'NOT_FOUND', `Không tìm thấy Chuyến đi ${params.id}`, path)
    if (t.status !== 'IN_PROGRESS') return error(409, 'CONFLICT', 'Chuyến đi đã kết thúc', path)
    const body = (await request.json().catch(() => null)) as { hubId?: number } | null
    const hub = hubs.find((h) => h.id === body?.hubId)
    if (!hub) return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, { hubId: 'must not be null' })
    return json(returnCheck(t, hub.id))
  }),

  http.post(`${API}/trips/:id/return/photo`, async ({ params, request }) => {
    const path = pathOf(request)
    const t = findMyTrip(Number(params.id))
    if (!t) return error(404, 'NOT_FOUND', `Không tìm thấy Chuyến đi ${params.id}`, path)
    const form = await request.formData().catch(() => null)
    const photo = form?.get('photo')
    if (!(photo instanceof File) || photo.size === 0) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, { photo: 'required' })
    }
    const proofId = `PF${randomHex(8)}`
    returnProofs.add(proofId)
    return json({ proofId }, 201)
  }),

  http.post(`${API}/trips/:id/return`, async ({ params, request }) => {
    const path = pathOf(request)
    const t = findMyTrip(Number(params.id))
    if (!t) return error(404, 'NOT_FOUND', `Không tìm thấy Chuyến đi ${params.id}`, path)
    if (t.status === 'COMPLETED') return json(toTrip(t))
    const body = (await request.json().catch(() => null)) as ReturnRequest | null
    const hub = hubs.find((h) => h.id === body?.hubId)
    if (!body || !hub || body.checklistConfirmed !== true) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, {
        hubId: hub ? undefined : 'must not be null',
        checklistConfirmed: 'must be true',
      })
    }

    const check = returnCheck(t, hub.id)
    let slotCode = check.slotCode
    if (!check.slotConfirmed) {
      const proof = body.manualProof
      if (!proof) {
        return error(422, 'INVALID_RETURN_LOCATION', 'Phương tiện chưa ở vị trí đỗ hợp lệ', path, {
          manualProofAllowed: true,
        })
      }
      if (proof.method === 'OTP' && (!/^\d{6}$/.test(proof.otp) || proof.otp === REJECTED_OTP)) {
        return error(422, 'OTP_INVALID', 'Mã OTP không đúng hoặc đã hết hạn', path)
      }
      if (proof.method === 'PHOTO' && !returnProofs.has(proof.proofId)) {
        return error(400, 'VALIDATION_FAILED', 'Ảnh xác nhận không hợp lệ', path)
      }
      slotCode = null
    }

    await delay(1_200)
    finishTrip(t, hub.id, Date.now(), slotCode, body.damageIncidentId != null)
    return json(toTrip(t))
  }),

  http.post(`${API}/trips/:id/return/offline`, async ({ params, request }) => {
    const path = pathOf(request)
    const t = findMyTrip(Number(params.id))
    if (!t) return error(404, 'NOT_FOUND', `Không tìm thấy Chuyến đi ${params.id}`, path)
    if (t.status === 'COMPLETED') return json(toTrip(t))
    const body = (await request.json().catch(() => null)) as OfflineReturnRequest | null
    const hub = hubs.find((h) => h.id === body?.hubId)
    if (!body || !hub || body.checklistConfirmed !== true || !body.clientEndedAt) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path)
    }
    if (!/^\d{6}$/.test(body.otp) || body.otp === REJECTED_OTP) {
      return error(422, 'OTP_INVALID', 'Mã OTP không đúng hoặc đã hết hạn', path)
    }
    const endedAt = Math.min(Date.now(), Math.max(Date.parse(t.startedAt), Date.parse(body.clientEndedAt)))
    finishTrip(t, hub.id, endedAt, null, body.damageIncidentId != null)
    return json(toTrip(t))
  }),

  http.post(`${API}/trips/:id/rating`, async ({ params, request }) => {
    const path = pathOf(request)
    const t = findMyTrip(Number(params.id))
    if (!t) return error(404, 'NOT_FOUND', `Không tìm thấy Chuyến đi ${params.id}`, path)
    if (t.status !== 'COMPLETED') return error(409, 'CONFLICT', 'Chuyến đi chưa kết thúc', path)
    if (t.rated) return error(409, 'TRIP_ALREADY_RATED', 'Chuyến đi đã được đánh giá', path)
    const body = (await request.json().catch(() => null)) as RatingRequest | null
    const valid = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5
    if (!body || !valid(body.vehicleStars) || !valid(body.hubStars)) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, { stars: 'must be between 1 and 5' })
    }
    t.rated = true
    return noContent()
  }),

  http.post(`${API}/incidents`, async ({ request }) => {
    const path = pathOf(request)
    const form = await request.formData().catch(() => null)
    const description = String(form?.get('description') ?? '').trim()
    const category = String(form?.get('category') ?? '')
    const targetType = String(form?.get('targetType') ?? '')
    if (!form || !description || !category || !targetType) {
      return error(400, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ', path, { description: 'must not be blank' })
    }
    const num = (k: string) => (form.get(k) ? Number(form.get(k)) : null)
    const incident = createIncident({
      vehicleId: num('vehicleId'),
      tripId: num('tripId'),
      hubId: num('hubId'),
      targetType,
      category,
      description,
      photoCount: form.getAll('photos').filter((p) => p instanceof File && p.size > 0).length,
    })
    return json({ id: incident.id, code: incident.code, status: 'OPEN' }, 201)
  }),
]

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

function toSummary(r: MockReservation): ReservationSummary {
  const v = vehicles.find((x) => x.id === r.vehicleId)
  const hubName = (id: number | null) => hubs.find((h) => h.id === id)?.name ?? null
  return {
    ...toResponse(r),
    vehicleCode: v?.code ?? `#${r.vehicleId}`,
    vehicleType: v?.type ?? 'E_BIKE',
    hubName: hubName(r.hubId) ?? '',
    pickedUpAt: r.pickedUpAt,
    completedAt: r.completedAt,
    cancelledAt: r.cancelledAt,
    returnHubId: r.returnHubId,
    returnHubName: hubName(r.returnHubId),
    tripId: r.tripId,
  }
}

function toDetail(r: MockReservation): ReservationDetail {
  return { ...toSummary(r), events: [...r.events].sort((a, b) => a.at.localeCompare(b.at)) }
}

function toTrip(t: MockTrip): Trip {
  const copy: Partial<MockTrip> = { ...t }
  delete copy.studentId
  return copy as Trip
}
