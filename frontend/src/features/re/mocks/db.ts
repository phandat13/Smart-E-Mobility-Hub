import type { Hub, Reservation, Vehicle } from '../types'

/**
 * Dữ liệu giả trong bộ nhớ (reload trang là về lại từ đầu).
 * Hub lấy theo seed backend (2__seed.sql); xe có pin khác nhau để thử được lỗi LOW_BATTERY.
 */

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
      // Vài xe không khả dụng để danh sách "Sẵn sàng" giống thực tế.
      status: i === 5 ? 'CHARGING' : i === 8 ? 'TRANSFER_LOCKED' : 'AVAILABLE',
      batteryPercent: battery,
      rangeKm: Math.round(battery * 0.4),
    } satisfies Vehicle
  }),
)

/** Bản ghi trong DB có studentId; response API thì không. */
export type MockReservation = Reservation & { studentId: number }

export const reservations: MockReservation[] = []

let nextReservationId = 1

export function newReservationId(): number {
  return nextReservationId++
}
