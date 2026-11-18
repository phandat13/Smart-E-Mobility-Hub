export type ReservationStatus = 'RESERVED' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'

export interface Reservation {
  id: number
  code: string
  vehicleId: number
  hubId: number
  status: ReservationStatus
  reservedAt: string
  expiresAt: string
  extensionCount: number
}

export interface ReservationSummary extends Reservation {
  vehicleCode: string
  vehicleType: VehicleType
  hubName: string
  pickedUpAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  returnHubId: number | null
  returnHubName: string | null
  tripId: number | null
}

export type ReservationEventType = 'CREATED' | 'EXTENDED' | 'PICKED_UP' | 'RETURNED' | 'CANCELLED' | 'EXPIRED'

export interface ReservationEvent {
  type: ReservationEventType
  at: string
  note: string | null
}

export interface ReservationDetail extends ReservationSummary {
  events: ReservationEvent[]
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export type VehicleType = 'E_BIKE' | 'E_SCOOTER'

export type VehicleStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'PICKUP_PENDING'
  | 'IN_USE'
  | 'PENDING_CHECK'
  | 'NEEDS_CHARGE'
  | 'CHARGING'
  | 'TRANSFER_LOCKED'
  | 'FAULTY'
  | 'MAINTENANCE_LOCKED'
  | 'OUT_OF_SERVICE'

export interface Vehicle {
  id: number
  code: string
  type: VehicleType
  hubId: number | null
  status: VehicleStatus
  batteryPercent: number
  rangeKm: number
}

export interface Hub {
  id: number
  code: string
  name: string
  latitude: number
  longitude: number
}

export type TripStatus = 'IN_PROGRESS' | 'COMPLETED'

export interface Trip {
  id: number
  code: string
  reservationId: number | null
  vehicleId: number
  vehicleCode: string
  vehicleType: VehicleType
  startHubId: number
  startSlotCode: string | null
  endHubId: number | null
  endSlotCode: string | null
  startedAt: string
  endedAt: string | null
  startBattery: number
  currentBattery: number
  endBattery: number | null
  distanceKm: number
  cost: number
  status: TripStatus
  vehicleStatusAfterReturn: VehicleStatus | null
  rated: boolean
}

export interface PickupRequest {
  vehicleCode: string
  reservationId?: number
}

export interface ReturnCheck {
  tripId: number
  hubId: number
  slotConfirmed: boolean
  slotCode: string | null
  confirmedAt: string | null
  chargingConnected: boolean
  chargingPortCode: string | null
}

export type ManualProof = { method: 'OTP'; otp: string } | { method: 'PHOTO'; proofId: string }

export interface ReturnRequest {
  hubId: number
  checklistConfirmed: true
  damageIncidentId?: number
  manualProof?: ManualProof
}

export interface OfflineReturnRequest {
  hubId: number
  otp: string
  clientEndedAt: string
  checklistConfirmed: true
  damageIncidentId?: number
}

export type IncidentTarget = 'VEHICLE' | 'CHARGING_PORT'
export type IncidentCategory = 'DAMAGE' | 'BRAKE_LIGHT' | 'BATTERY' | 'LOCK' | 'CHARGING_PORT' | 'OTHER'

export interface Incident {
  id: number
  code: string
  status: 'OPEN'
}

export interface RatingRequest {
  vehicleStars: number
  hubStars: number
  comment?: string
}

export const RESERVATION_RULES = {
  holdMinutes: 15,
  extendMinutes: 10,
  maxExtensions: 2,
  minBatteryPercent: 20,
} as const

export const POLL_MS = {
  reservation: 10_000,
  trip: 5_000,
  returnCheck: 5_000,
  offlineSync: 15_000,
} as const
