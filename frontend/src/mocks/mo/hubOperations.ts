import type { Hub, Charger, Vehicle } from '../../features/mo/types/hubOperations';
export const mockHubs: Hub[] = [
  {
    id: 'ktx-a',
    name: 'KTX Khu A',
    type: 'Ký túc xá',
    area: 'Khu Đông',
    address: 'Đường Tạ Quang Bửu, TP. Thủ Đức',
    capacity: 40,
    vehicles: 24,
    chargers: 6,
    activeChargers: 5,
    status: 'Hoạt động',
  },
  {
    id: 'ktx-b',
    name: 'KTX Khu B',
    type: 'Ký túc xá',
    area: 'Khu Đông',
    address: 'Đường Mạc Đĩnh Chi, TP. Thủ Đức',
    capacity: 32,
    vehicles: 29,
    chargers: 6,
    activeChargers: 6,
    status: 'Hoạt động',
  },
  {
    id: 'dhbk',
    name: 'Cơ sở Lý Thường Kiệt',
    type: 'Trường học',
    area: 'Khu Trung tâm',
    address: '268 Lý Thường Kiệt, Quận 10',
    capacity: 48,
    vehicles: 31,
    chargers: 8,
    activeChargers: 8,
    status: 'Hoạt động',
  },
  {
    id: 'dhqg',
    name: 'Khu Công nghệ phần mềm',
    type: 'Trường học',
    area: 'Khu Đông',
    address: 'Khu phố 6, TP. Thủ Đức',
    capacity: 28,
    vehicles: 0,
    chargers: 4,
    activeChargers: 0,
    status: 'Bảo trì',
  },
];
export const mockChargers: Charger[] = [
  { id: '01', connector: 'Type 2', power: '7.4 kW', status: 'Khả dụng', session: '—' },
  {
    id: '02',
    connector: 'Type 2',
    power: '7.4 kW',
    status: 'Đang sạc',
    session: 'UG-018 · 42 phút',
  },
  { id: '03', connector: 'Type 2', power: '11 kW', status: 'Đã đặt', session: 'UG-027 · 10:30' },
  { id: '04', connector: 'Type 2', power: '7.4 kW', status: 'Báo lỗi', session: 'Lỗi E-CHG-02' },
  { id: '05', connector: 'Type 2', power: '11 kW', status: 'Khả dụng', session: '—' },
  { id: '06', connector: 'Type 2', power: '7.4 kW', status: 'Khả dụng', session: '—' },
];
export const mockVehicles: Vehicle[] = [
  { id: 'UG-018', type: 'Xe đạp điện', battery: 86, hub: 'KTX Khu A', status: 'Sẵn sàng' },
  { id: 'UG-027', type: 'Xe máy điện', battery: 62, hub: 'KTX Khu A', status: 'Đang sạc' },
  { id: 'UG-040', type: 'Xe đạp điện', battery: 16, hub: 'KTX Khu A', status: 'Cần kiểm tra' },
  { id: 'UG-052', type: 'Xe máy điện', battery: 74, hub: 'KTX Khu B', status: 'Đang sử dụng' },
  { id: 'UG-063', type: 'Xe đạp điện', battery: 91, hub: 'KTX Khu B', status: 'Sẵn sàng' },
  {
    id: 'UG-071',
    type: 'Xe máy điện',
    battery: 38,
    hub: 'Cơ sở Lý Thường Kiệt',
    status: 'Bảo trì',
  },
  {
    id: 'UG-084',
    type: 'Xe đạp điện',
    battery: 55,
    hub: 'Cơ sở Lý Thường Kiệt',
    status: 'Sẵn sàng',
  },
];
export function createMockParkingSlots(capacity: number) {
  return Array.from({ length: capacity }, (_, i) => {
    const n = i + 1;
    const empty = [2, 6, 10, 13, 17, 21, 25, 28, 30, 34, 37, 39].includes(n);
    const fault = [12, 29].includes(n);
    const reserved = [3, 7, 15, 19, 23, 31].includes(n);
    return {
      id: 'P-' + String(n).padStart(2, '0'),
      state: fault ? 'fault' : empty ? 'empty' : reserved ? 'reserved' : 'occupied',
    };
  });
}
