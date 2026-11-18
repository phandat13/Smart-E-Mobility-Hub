import { reservationStatusLabel, vehicleStatusLabel } from '../../../shared/i18n/vi'
import type { ReservationStatus } from '../types'

const reservationTone: Record<ReservationStatus, string> = {
  RESERVED: 'info',
  PICKED_UP: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  EXPIRED: 'warning',
}

export function ReservationStatusChip({ status }: { status: ReservationStatus }) {
  return <span className={`re-chip-status is-${reservationTone[status]}`}>{reservationStatusLabel[status] ?? status}</span>
}

const vehicleTone: Record<string, string> = {
  AVAILABLE: 'success',
  CHARGING: 'info',
  NEEDS_CHARGE: 'warning',
  MAINTENANCE_LOCKED: 'danger',
  FAULTY: 'danger',
}

export function VehicleStatusChip({ status }: { status: string }) {
  return <span className={`re-chip-status is-${vehicleTone[status] ?? 'neutral'}`}>{vehicleStatusLabel[status] ?? status}</span>
}
