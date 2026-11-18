import type { Hub, IncidentCategory, Reservation, ReservationEvent, Trip, Vehicle } from '../types'

export const MOCK_STUDENT_ID = 1

export const hubs: Hub[] = [
  { id: 1, code: 'HUB_METRO', name: 'Ga Metro ĐHQG', latitude: 10.8752, longitude: 106.8005 },
  { id: 2, code: 'HUB_KTXA', name: 'KTX khu A', latitude: 10.8785, longitude: 106.8062 },
  { id: 3, code: 'HUB_KTXB', name: 'KTX khu B', latitude: 10.8821, longitude: 106.7824 },
  { id: 4, code: 'HUB_HCMUT', name: 'ĐH Bách khoa', latitude: 10.8801, longitude: 106.8054 },
  { id: 5, code: 'HUB_NVHSV', name: 'Nhà Văn hóa Sinh viên', latitude: 10.8763, longitude: 106.8021 },
]

const batteries = [92, 81, 64, 15, 100, 47, 33, 88, 72, 18]

export const vehicles: Vehicle[] = hubs.flatMap((hub, h) =>
  batteries.map((battery, i) => {
    const id = h * batteries.length + i + 1
    return {
      id,
      code: `UG-${String(id).padStart(3, '0')}`,
      type: i % 3 === 2 ? 'E_SCOOTER' : 'E_BIKE',
      hubId: hub.id,
      status: i === 5 ? 'CHARGING' : i === 8 ? 'TRANSFER_LOCKED' : 'AVAILABLE',
      batteryPercent: battery,
      rangeKm: Math.round(battery * 0.4),
    } satisfies Vehicle
  }),
)

export type VehicleScenario = 'UNLOCK_TIMEOUT' | 'UNLOCK_FAILED' | 'NOT_AT_HUB' | 'OPEN_INCIDENT' | 'PRIORITIZED'

export const vehicleScenarios: Record<string, VehicleScenario> = {
  'UG-012': 'UNLOCK_TIMEOUT',
  'UG-023': 'UNLOCK_FAILED',
  'UG-037': 'NOT_AT_HUB',
  'UG-048': 'OPEN_INCIDENT',
  'UG-005': 'PRIORITIZED',
}

export const HUB_WITHOUT_SLOT_SENSOR = 4

export const HUBS_WITH_CHARGER = new Set([1, 3, 5])

export const SLOT_CONFIRM_DELAY_MS = 4_000

export const PENDING_CHECK_MS = 30_000

export const PRICE_PER_MINUTE = 500

export const REJECTED_OTP = '000000'

export type MockReservation = Reservation & {
  studentId: number
  pickedUpAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  returnHubId: number | null
  tripId: number | null
  events: ReservationEvent[]
}

export type MockTrip = Trip & { studentId: number }

export interface MockIncident {
  id: number
  code: string
  vehicleId: number | null
  tripId: number | null
  hubId: number | null
  targetType: string
  category: IncidentCategory | string
  description: string
  photoCount: number
  createdAt: string
}

export const pendingCheckSince = new Map<number, number>()

export const returnCheckStartedAt = new Map<string, number>()

export const returnProofs = new Set<string>()

const DAY = 86_400_000
const MIN = 60_000
const iso = (ms: number) => new Date(ms).toISOString()
const at = (daysAgo: number, minutes = 0) => Date.now() - daysAgo * DAY + minutes * MIN

function seedCompleted(opts: {
  id: number
  code: string
  tripCode: string
  vehicleId: number
  hubId: number
  returnHubId: number
  daysAgo: number
  extensions: number
  rideMinutes: number
  startBattery: number
  rated: boolean
}): [MockReservation, MockTrip] {
  const v = vehicles.find((x) => x.id === opts.vehicleId)!
  const reservedAt = at(opts.daysAgo)
  const pickedUpAt = reservedAt + 10 * MIN
  const endedAt = pickedUpAt + opts.rideMinutes * MIN
  const events: ReservationEvent[] = [
    { type: 'CREATED', at: iso(reservedAt), note: null },
    ...Array.from({ length: opts.extensions }, (_, i) => ({
      type: 'EXTENDED' as const,
      at: iso(reservedAt + (5 + i) * MIN),
      note: null,
    })),
    { type: 'PICKED_UP', at: iso(pickedUpAt), note: null },
    { type: 'RETURNED', at: iso(endedAt), note: null },
  ]
  const r: MockReservation = {
    id: opts.id,
    code: opts.code,
    studentId: MOCK_STUDENT_ID,
    vehicleId: v.id,
    hubId: opts.hubId,
    status: 'COMPLETED',
    reservedAt: iso(reservedAt),
    expiresAt: iso(reservedAt + (15 + 10 * opts.extensions) * MIN),
    extensionCount: opts.extensions,
    pickedUpAt: iso(pickedUpAt),
    completedAt: iso(endedAt),
    cancelledAt: null,
    returnHubId: opts.returnHubId,
    tripId: opts.id,
    events,
  }
  const t: MockTrip = {
    id: opts.id,
    code: opts.tripCode,
    studentId: MOCK_STUDENT_ID,
    reservationId: r.id,
    vehicleId: v.id,
    vehicleCode: v.code,
    vehicleType: v.type,
    startHubId: opts.hubId,
    startSlotCode: 'P-07',
    endHubId: opts.returnHubId,
    endSlotCode: 'P-03',
    startedAt: iso(pickedUpAt),
    endedAt: iso(endedAt),
    startBattery: opts.startBattery,
    currentBattery: opts.startBattery - Math.round(opts.rideMinutes * 0.6),
    endBattery: opts.startBattery - Math.round(opts.rideMinutes * 0.6),
    distanceKm: Math.round(opts.rideMinutes * 0.12 * 10) / 10,
    cost: opts.rideMinutes * PRICE_PER_MINUTE,
    status: 'COMPLETED',
    vehicleStatusAfterReturn: 'CHARGING',
    rated: opts.rated,
  }
  return [r, t]
}

const [r1, t1] = seedCompleted({
  id: 1,
  code: 'RS3F9A1C0B2E',
  tripCode: 'TP3F9A1C0B2E',
  vehicleId: 18,
  hubId: 2,
  returnHubId: 5,
  daysAgo: 2,
  extensions: 1,
  rideMinutes: 24,
  startBattery: 92,
  rated: false,
})
const [r4, t4] = seedCompleted({
  id: 4,
  code: 'RS71D04E9AC3',
  tripCode: 'TP71D04E9AC3',
  vehicleId: 45,
  hubId: 5,
  returnHubId: 1,
  daysAgo: 9,
  extensions: 0,
  rideMinutes: 12,
  startBattery: 100,
  rated: true,
})

const cancelledAt = at(4, 6)
const r2: MockReservation = {
  id: 2,
  code: 'RS0B8E22F6D1',
  studentId: MOCK_STUDENT_ID,
  vehicleId: 31,
  hubId: 4,
  status: 'CANCELLED',
  reservedAt: iso(at(4)),
  expiresAt: iso(at(4, 15)),
  extensionCount: 0,
  pickedUpAt: null,
  completedAt: null,
  cancelledAt: iso(cancelledAt),
  returnHubId: null,
  tripId: null,
  events: [
    { type: 'CREATED', at: iso(at(4)), note: null },
    { type: 'CANCELLED', at: iso(cancelledAt), note: null },
  ],
}

const r3: MockReservation = {
  id: 3,
  code: 'RS9C6A5B4D17',
  studentId: MOCK_STUDENT_ID,
  vehicleId: 2,
  hubId: 1,
  status: 'EXPIRED',
  reservedAt: iso(at(6)),
  expiresAt: iso(at(6, 15)),
  extensionCount: 0,
  pickedUpAt: null,
  completedAt: null,
  cancelledAt: null,
  returnHubId: null,
  tripId: null,
  events: [
    { type: 'CREATED', at: iso(at(6)), note: null },
    { type: 'EXPIRED', at: iso(at(6, 15)), note: null },
  ],
}

export const reservations: MockReservation[] = [r1, r2, r3, r4]
export const trips: MockTrip[] = [t1, t4]
export const incidents: MockIncident[] = []

let nextReservationId = 100
let nextTripId = 100
let nextIncidentId = 1

export function newReservationId(): number {
  return nextReservationId++
}

export function newTripId(): number {
  return nextTripId++
}

export function newIncidentId(): number {
  return nextIncidentId++
}
