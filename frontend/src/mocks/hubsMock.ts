// Mock Hub cho AC01 (Tìm kiếm & tra cứu tài nguyên Hub).
// Backend chưa có Hub API nên toàn bộ dữ liệu là mock, lấy theo Figma AC01.
// mapX / mapY: vị trí marker trên bản đồ minh hoạ (phần trăm), không phải toạ độ thật.

export type VehicleStatus = 'AVAILABLE' | 'RESERVED' | 'NEEDS_CHARGE' | 'IN_USE' | 'CHARGING' | 'MAINTENANCE';

export interface VehicleSummary {
  id: number;
  code: string;
  type: string;
  batteryPercent: number;
  rangeKm: number;
  status: VehicleStatus;
  hubId: number;
}

export interface Hub {
  id: number;
  code: string;
  name: string;
  /** Hậu tố hiển thị sau tên, ví dụ "(Cổng chính)". */
  note?: string;
  address: string;
  distanceM: number;
  area: 'ktx' | 'campus' | 'metro';
  active: boolean;
  /** Số xe sẵn sàng của cả Hub (danh sách vehicles chỉ là các xe tiêu biểu). */
  availableVehicles: number;
  latitude: number;
  longitude: number;
  mapX: number;
  mapY: number;
  totalDocks: number;
  availableDocks: number;
  chargingPorts: number;
  availableChargingPorts: number;
  avgBatteryPercent: number;
  vehicles: VehicleSummary[];
}

export interface HubFilters {
  area?: string;
  query?: string;
  hasAvailableVehicle?: boolean;
  hasChargingPort?: boolean;
}

let vid = 0;
const v = (hubId: number, code: string, type: string, batteryPercent: number, rangeKm: number, status: VehicleStatus): VehicleSummary => ({
  id: ++vid, code, type, batteryPercent, rangeKm, status, hubId,
});

const BIKE = 'Xe đạp điện';
const MOTO = 'Xe máy điện';

const MOCK_HUBS: Hub[] = [
  {
    id: 1, code: 'UG-HUB-A', name: 'KTX Khu A', note: '(Cổng chính)',
    address: 'Đg Tạ Quang Bửu, KĐT ĐHQG', distanceM: 350, area: 'ktx', active: true, availableVehicles: 8,
    latitude: 10.8806, longitude: 106.8059, mapX: 49, mapY: 52,
    totalDocks: 40, availableDocks: 12, chargingPorts: 6, availableChargingPorts: 5, avgBatteryPercent: 78,
    vehicles: [
      v(1, 'UG-018', BIKE, 92, 36, 'AVAILABLE'),
      v(1, 'UG-022', MOTO, 81, 58, 'AVAILABLE'),
      v(1, 'UG-031', BIKE, 64, 24, 'AVAILABLE'),
      v(1, 'UG-047', MOTO, 70, 52, 'RESERVED'),
      v(1, 'UG-040', MOTO, 16, 6, 'NEEDS_CHARGE'),
    ],
  },
  {
    id: 2, code: 'UG-HUB-B', name: 'KTX Khu B',
    address: 'Đg Tạ Quang Bửu, KĐT ĐHQG', distanceM: 520, area: 'ktx', active: true, availableVehicles: 2,
    latitude: 10.8821, longitude: 106.8048, mapX: 21, mapY: 30,
    totalDocks: 20, availableDocks: 3, chargingPorts: 4, availableChargingPorts: 0, avgBatteryPercent: 42,
    vehicles: [
      v(2, 'UG-015', BIKE, 88, 33, 'AVAILABLE'),
      v(2, 'UG-027', MOTO, 58, 42, 'AVAILABLE'),
      v(2, 'UG-044', BIKE, 28, 10, 'NEEDS_CHARGE'),
    ],
  },
  {
    id: 4, code: 'UG-HUB-D', name: 'Thư viện Trung tâm', note: '(TT)',
    address: 'Đại lộ Lê Quý Đôn, ĐHQG', distanceM: 640, area: 'campus', active: true, availableVehicles: 6,
    latitude: 10.8788, longitude: 106.8055, mapX: 35, mapY: 74,
    totalDocks: 24, availableDocks: 9, chargingPorts: 6, availableChargingPorts: 2, avgBatteryPercent: 68,
    vehicles: [
      v(4, 'UG-050', BIKE, 74, 28, 'AVAILABLE'),
      v(4, 'UG-051', BIKE, 62, 23, 'AVAILABLE'),
      v(4, 'UG-033', BIKE, 91, 34, 'AVAILABLE'),
      v(4, 'UG-053', MOTO, 77, 56, 'AVAILABLE'),
      v(4, 'UG-054', MOTO, 66, 48, 'AVAILABLE'),
      v(4, 'UG-012', MOTO, 60, 44, 'AVAILABLE'),
    ],
  },
  {
    id: 5, code: 'UG-HUB-E', name: 'Nhà văn hóa SV',
    address: 'Đg Thống Nhất, KĐT ĐHQG', distanceM: 780, area: 'campus', active: true, availableVehicles: 5,
    latitude: 10.8832, longitude: 106.8072, mapX: 72, mapY: 28,
    totalDocks: 28, availableDocks: 14, chargingPorts: 6, availableChargingPorts: 3, avgBatteryPercent: 73,
    vehicles: [
      v(5, 'UG-060', MOTO, 89, 64, 'AVAILABLE'),
      v(5, 'UG-061', BIKE, 77, 29, 'AVAILABLE'),
      v(5, 'UG-062', MOTO, 68, 49, 'AVAILABLE'),
      v(5, 'UG-063', BIKE, 52, 19, 'AVAILABLE'),
      v(5, 'UG-064', MOTO, 71, 51, 'CHARGING'),
    ],
  },
  {
    id: 6, code: 'UG-HUB-M', name: 'Ga Metro',
    address: 'Ga Metro số 1, Làng ĐH Thủ Đức', distanceM: 1100, area: 'metro', active: true, availableVehicles: 7,
    latitude: 10.8695, longitude: 106.8038, mapX: 85, mapY: 62,
    totalDocks: 30, availableDocks: 14, chargingPorts: 8, availableChargingPorts: 5, avgBatteryPercent: 71,
    vehicles: [
      v(6, 'UG-070', MOTO, 83, 60, 'AVAILABLE'),
      v(6, 'UG-071', BIKE, 69, 25, 'AVAILABLE'),
      v(6, 'UG-072', BIKE, 58, 21, 'CHARGING'),
    ],
  },
];

const AREAS = [
  { value: 'all', label: 'Khu vực: Tất cả' },
  { value: 'ktx', label: 'Khu KTX' },
  { value: 'campus', label: 'Khu cơ sở chính' },
  { value: 'metro', label: 'Khu vực Metro' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

const countReady = (h: Hub) => h.availableVehicles;
export { countReady as countAvailableVehicles };

export async function mockGetHubs(filters?: HubFilters): Promise<Hub[]> {
  await new Promise((r) => setTimeout(r, 250));
  let list = [...MOCK_HUBS];
  if (filters?.area && filters.area !== 'all') list = list.filter((h) => h.area === filters.area);
  if (filters?.query?.trim()) {
    const q = norm(filters.query.trim());
    list = list.filter((h) => norm(`${h.name} ${h.code} ${h.address}`).includes(q));
  }
  if (filters?.hasAvailableVehicle) list = list.filter((h) => countReady(h) > 0);
  if (filters?.hasChargingPort) list = list.filter((h) => h.availableChargingPorts > 0);
  return list.sort((a, b) => a.distanceM - b.distanceM);
}

export async function mockGetHubDetail(hubId: number): Promise<Hub | null> {
  await new Promise((r) => setTimeout(r, 150));
  return MOCK_HUBS.find((h) => h.id === hubId) ?? null;
}

export function getAreas() {
  return AREAS;
}
