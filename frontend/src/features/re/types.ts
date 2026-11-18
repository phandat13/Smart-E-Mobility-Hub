/**
 * Kiểu dữ liệu của module RE.
 * - `Reservation`: bám đúng RentalDto.ReservationResponse ở backend.
 * - `Hub`, `Vehicle`: backend CHƯA có API (xem features/re/CONTRACT.md), đây là contract đề xuất,
 *   lấy tên trường từ entity module/hub/Hub.java, Vehicle.java.
 */

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

/**
 * Luật lấy từ backend application.yml (app.reservation.*, app.vehicle.*).
 * Response chưa trả các giá trị này nên FE giữ một bản sao; đổi ở BE thì phải đổi ở đây.
 */
export const RESERVATION_RULES = {
  holdMinutes: 15,
  extendMinutes: 10,
  maxExtensions: 2,
  minBatteryPercent: 20,
} as const
