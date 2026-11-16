import type { Booking, DemoState, ServiceType } from '../../shared/types';
import { duration } from '../../shared/format';

export const isActiveBooking = (booking: Booking) => booking.status === 'BOOKED' || booking.status === 'IN_USE';
export function expireBookings(state: DemoState) {
  for (const booking of state.bookings) {
    if (booking.status === 'BOOKED' && Date.parse(state.now) > Date.parse(booking.startAt) + 15 * 60000) {
      booking.status = 'EXPIRED'; booking.resourcePending = true;
      booking.timeline.push({ at: state.now, message: 'Quá hạn check-in · tài nguyên chờ kiểm tra' });
    }
  }
}
export function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return Date.parse(start) < Date.parse(otherEnd) && Date.parse(end) > Date.parse(otherStart);
}
export function resourceAvailable(state: DemoState, hubId: string, kind: 'slot' | 'port', id: string, start: string, end: string, excludeId?: string) {
  return !state.bookings.some(booking => booking.id !== excludeId && booking.hubId === hubId &&
    (kind === 'slot' ? booking.slotId === id : booking.portId === id) &&
    (booking.resourcePending || (booking.status === 'IN_USE' && Date.parse(end) > Date.parse(booking.startAt)) ||
      (booking.status === 'BOOKED' && overlaps(start, end, booking.startAt, booking.endAt))));
}
// Booking estimate (PV01): 2 h "Đỗ xe + Sạc" = 18.000 đ.
const BOOKING_RATE_PER_HOUR: Record<ServiceType, number> = { PARK: 3000, CHARGE: 6000, BOTH: 9000 };
// Extension estimate (PV04): +30 phút "Đỗ xe + Sạc" = +4.000 đ. Rate confirmed by the team; differs from the booking rate.
const EXTENSION_RATE_PER_30_MIN: Record<ServiceType, number> = { PARK: 1500, CHARGE: 2500, BOTH: 4000 };
// Parking is billed for the booked window (or the actual stay if longer), in 30-minute blocks: 15:00–17:00 = 6.000 đ.
const PARKING_PER_30_MIN = 1500;
const CHARGING_PER_KWH = 7500;

export function estimate(service: ServiceType, start: string, end: string) {
  return Math.ceil(duration(start, end) / 30) * BOOKING_RATE_PER_HOUR[service] / 2;
}
export function extensionEstimate(service: ServiceType, minutes: number) {
  return Math.ceil(minutes / 30) * EXTENSION_RATE_PER_30_MIN[service];
}
export function invoice(booking: Booking, now: string) {
  const leftAt = booking.checkedOutAt ?? now;
  const minutes = duration(booking.checkedInAt ?? booking.startAt, leftAt);
  const billedEnd = Date.parse(leftAt) > Date.parse(booking.endAt) ? leftAt : booking.endAt;
  const park = booking.service === 'CHARGE' ? 0 : Math.ceil(duration(booking.startAt, billedEnd) / 30) * PARKING_PER_30_MIN;
  const charge = booking.service === 'PARK' ? 0 : Math.ceil(booking.energy * CHARGING_PER_KWH / 500) * 500;
  return { minutes, park, charge, total: park + charge };
}
