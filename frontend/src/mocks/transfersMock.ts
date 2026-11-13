// Mock cho RB01 (Bảng điều phối, vận hành) và RB02 (App tài xế). Dữ liệu lấy theo Figma, ngày "hôm nay" 07/10/2026.
// Quy tắc mock (để thử các nhánh lỗi/201/202 khi chạy VITE_USE_MOCK=true):
//   - Hub đích "Thư viện TT" nhận tối đa 8 xe, vượt thì HUB_FULL (409).
//   - Chọn xe UG-140 thì VEHICLE_HAS_OPERATION (409).
//   - Đội 01, 02 có tài xế rảnh nên 201 (ASSIGNED); Đội 03 hết tài xế nên 202 (PENDING, vào hàng chờ).
//   - Để trống đội thì tự gán Đội 01 (201).
//   - Tài xế mock là Trần Văn Bình (driverId 1).

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export type TransferOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TransferItemStatus = 'LOCKED' | 'LOADED' | 'DELIVERED' | 'REMOVED';

export interface TransferItem {
  vehicleId: number;
  status: TransferItemStatus;
  /** Chỉ có ở mock. Backend thật trả vehicleId, FE tự dựng mã "UG-xxx". */
  vehicleCode?: string;
  slot?: string;
}

export interface TransferOrderResponse {
  id: number;
  code: string;
  sourceHubId: number;
  sourceHubName: string;
  targetHubId: number;
  targetHubName: string;
  driverId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  teamName: string | null;
  status: TransferOrderStatus;
  alertId: number | null;
  recommendationId: number | null;
  createdAt: string;
  items: TransferItem[];
  note: string | null;
  /** Chỉ có ở mock (hiển thị giờ trên thẻ Kanban). */
  startedAt?: string | null;
  completedAt?: string | null;
  verified?: boolean;
}

export interface CreateTransferRequest {
  sourceHubId: number;
  targetHubId: number;
  vehicleIds: number[];
  alertId?: number;
  recommendationId?: number;
  teamId?: number;
  note?: string;
}

export const TRANSFER_HUBS = [
  { id: 1, code: 'UG-HUB-A', name: 'KTX Khu A', detail: 'trống 12 chỗ' },
  { id: 2, code: 'UG-HUB-B', name: 'KTX Khu B', detail: 'thiếu 15 · trống 30 chỗ' },
  { id: 3, code: 'UG-HUB-V', name: 'Tòa VNU', detail: 'thừa 20 xe sẵn sàng' },
  { id: 4, code: 'UG-HUB-D', name: 'Thư viện TT', detail: 'ổn định' },
  { id: 5, code: 'UG-HUB-E', name: 'NVH SV', detail: 'trống 14 chỗ' },
  { id: 6, code: 'UG-HUB-M', name: 'Ga Metro ĐHQG', detail: 'thiếu 6 xe' },
  { id: 7, code: 'UG-HUB-L', name: 'Khu học tập', detail: '' },
  { id: 8, code: 'UG-HUB-H6', name: 'Bãi xe H6', detail: '' },
];

export const DRIVER_TEAMS = [
  { id: 1, name: 'Đội 01 · Tài xế Trần Văn Bình (đang rảnh)' },
  { id: 2, name: 'Đội 02 · Tài xế Lê Văn Hải (đang rảnh)' },
  { id: 3, name: 'Đội 03 · Hết tài xế rảnh (vào hàng chờ)' },
];

export const MOCK_DRIVERS = [
  { id: 1, name: 'Trần Văn Bình', phone: '0901234569', teamId: 1, teamName: 'Đội 01' },
  { id: 2, name: 'Lê Văn Hải', phone: '0901234571', teamId: 2, teamName: 'Đội 02' },
];

export interface TransferVehicle {
  id: number;
  code: string;
  type: string;
  batteryPercent: number;
  location: string;
  status: 'AVAILABLE' | 'IN_USE' | 'CHARGING' | 'MAINTENANCE';
}

const BIKE = 'Xe đạp điện';
const MOTO = 'Xe máy điện';
// Xe sẵn sàng tại Tòa VNU (hub nguồn trong ví dụ Figma), sắp theo pin giảm dần.
const TV: Array<[number, string, number, string]> = [
  [101, BIKE, 98, 'P-03'], [117, BIKE, 96, 'P-11'], [124, MOTO, 93, 'P-02'], [109, BIKE, 91, 'P-15'], [131, MOTO, 88, 'P-07'],
  [102, BIKE, 86, 'P-04'], [118, BIKE, 84, 'P-12'], [125, MOTO, 82, 'P-08'], [110, BIKE, 80, 'P-16'], [132, MOTO, 78, 'P-09'],
  [103, BIKE, 75, 'P-05'], [119, BIKE, 72, 'P-13'], [126, MOTO, 70, 'P-10'], [111, BIKE, 66, 'P-17'], [133, MOTO, 62, 'P-14'],
  [104, BIKE, 58, 'P-06'], [120, BIKE, 55, 'P-18'], [127, MOTO, 49, 'P-19'], [112, BIKE, 44, 'P-01'], [140, BIKE, 41, 'P-20'],
];
export const MOCK_TRANSFER_VEHICLES: TransferVehicle[] = TV.map(([id, type, batteryPercent, location]) => ({
  id, code: `UG-${id}`, type, batteryPercent, location, status: 'AVAILABLE',
}));

export interface ImbalanceAlert {
  id: number;
  hubId: number;
  hubName: string;
  type: 'SHORTAGE' | 'SURPLUS' | 'STABLE';
  vehicleCount: number;
  availableDocks: number;
  totalDocks: number;
  /** Dòng nhấn mạnh, ví dụ "Thiếu 15 xe". */
  message: string;
  /** Dòng phụ, ví dụ "2 / 32 chỗ có xe sẵn sàng". */
  detail?: string;
  detectedAt?: string;
  /** Đề xuất điều chuyển: từ hub from sang hub to. */
  recommendation: {
    fromHubId: number;
    fromHubName: string;
    toHubId: number;
    toHubName: string;
    suggestedVehicleCount: number;
  } | null;
}

const MOCK_ALERTS: ImbalanceAlert[] = [
  {
    id: 1, hubId: 2, hubName: 'KTX Khu B', type: 'SHORTAGE', vehicleCount: 15, availableDocks: 2, totalDocks: 32,
    message: 'Thiếu 15 xe', detail: '2 / 32 chỗ có xe sẵn sàng', detectedAt: '2026-10-07T09:18:00+07:00',
    recommendation: { fromHubId: 3, fromHubName: 'Tòa VNU', toHubId: 2, toHubName: 'KTX Khu B', suggestedVehicleCount: 15 },
  },
  {
    id: 2, hubId: 3, hubName: 'Tòa VNU', type: 'SURPLUS', vehicleCount: 20, availableDocks: 20, totalDocks: 38,
    message: 'Thừa 20 xe', detail: '20 xe sẵn sàng · lấp đầy 38%', detectedAt: '2026-10-07T09:18:00+07:00',
    recommendation: { fromHubId: 3, fromHubName: 'Tòa VNU', toHubId: 2, toHubName: 'KTX Khu B', suggestedVehicleCount: 15 },
  },
  {
    id: 3, hubId: 6, hubName: 'Ga Metro ĐHQG', type: 'SHORTAGE', vehicleCount: 6, availableDocks: 14, totalDocks: 28,
    message: 'Thiếu 6 xe', detail: 'Giờ cao điểm 17:00', detectedAt: '2026-10-07T09:20:00+07:00',
    recommendation: { fromHubId: 4, fromHubName: 'Thư viện TT', toHubId: 6, toHubName: 'Ga Metro ĐHQG', suggestedVehicleCount: 6 },
  },
  {
    id: 4, hubId: 4, hubName: 'Thư viện TT', type: 'STABLE', vehicleCount: 0, availableDocks: 8, totalDocks: 24,
    message: 'Ổn định', detail: 'Trong ngưỡng', recommendation: null,
  },
];

const it = (id: number, status: TransferItemStatus, slot?: string): TransferItem => ({ vehicleId: id, vehicleCode: `UG-${id}`, status, slot });
const items = (ids: number[], status: TransferItemStatus) => ids.map((id) => it(id, status));

// Lệnh 021 (đang vận chuyển, 9/15 đã quét) theo Figma RB02.
const ORDER_021_ITEMS: TransferItem[] = [
  it(101, 'LOADED', 'P-10'), it(117, 'LOADED', 'P-11'), it(124, 'LOADED', 'P-12'), it(109, 'LOADED', 'P-13'), it(131, 'LOADED', 'P-14'),
  it(102, 'LOADED', 'P-15'), it(118, 'LOADED', 'P-16'), it(125, 'LOADED', 'P-17'), it(110, 'LOADED', 'P-18'), it(132, 'LOCKED'),
  it(103, 'LOCKED'), it(119, 'LOCKED'), it(126, 'LOCKED'), it(111, 'LOCKED'), it(133, 'LOCKED'),
];

const d = (hhmm: string) => `2026-10-07T${hhmm}:00+07:00`;

const MOCK_TRANSFER_ORDERS: TransferOrderResponse[] = [
  { id: 24, code: 'DC-0710-024', sourceHubId: 4, sourceHubName: 'Thư viện TT', targetHubId: 1, targetHubName: 'KTX Khu A',
    driverId: null, driverName: null, driverPhone: null, teamName: null, status: 'PENDING', alertId: null, recommendationId: null,
    createdAt: d('09:35'), items: items([201, 202, 203, 204, 205, 206, 207, 208], 'LOCKED'), note: null },
  { id: 23, code: 'DC-0710-023', sourceHubId: 3, sourceHubName: 'Tòa VNU', targetHubId: 6, targetHubName: 'Ga Metro',
    driverId: 2, driverName: 'Lê Văn Hải', driverPhone: '0901234571', teamName: 'Đội 02', status: 'ASSIGNED', alertId: null, recommendationId: null,
    createdAt: d('09:30'), items: items([211, 212, 213, 214, 215, 216], 'LOCKED'), note: null },
  { id: 21, code: 'DC-0710-021', sourceHubId: 3, sourceHubName: 'Tòa VNU', targetHubId: 2, targetHubName: 'KTX Khu B',
    driverId: 1, driverName: 'Trần Văn Bình', driverPhone: '0901234569', teamName: 'Đội 01', status: 'IN_PROGRESS', alertId: 1, recommendationId: null,
    createdAt: d('09:24'), startedAt: d('09:41'), items: ORDER_021_ITEMS, note: 'Phát lệnh 09:24 bởi Đơn vị vận hành (Lê Thu Trang)' },
  { id: 25, code: 'DC-0710-025', sourceHubId: 6, sourceHubName: 'Ga Metro', targetHubId: 4, targetHubName: 'Thư viện TT',
    driverId: 1, driverName: 'Trần Văn Bình', driverPhone: '0901234569', teamName: 'Đội 01', status: 'ASSIGNED', alertId: null, recommendationId: null,
    createdAt: d('09:45'), items: items([221, 222, 223, 224, 225, 226], 'LOCKED'), note: null },
  { id: 26, code: 'DC-0710-026', sourceHubId: 1, sourceHubName: 'KTX Khu A', targetHubId: 8, targetHubName: 'H6',
    driverId: 1, driverName: 'Trần Văn Bình', driverPhone: '0901234569', teamName: 'Đội 01', status: 'ASSIGNED', alertId: null, recommendationId: null,
    createdAt: d('09:50'), items: items([231, 232, 233, 234], 'LOCKED'), note: null },
  { id: 18, code: 'DC-0710-018', sourceHubId: 7, sourceHubName: 'Khu học tập', targetHubId: 8, targetHubName: 'Bãi xe H6',
    driverId: 1, driverName: 'Trần Văn Bình', driverPhone: '0901234569', teamName: 'Đội 01', status: 'COMPLETED', alertId: null, recommendationId: null,
    createdAt: d('08:40'), completedAt: d('09:20'), verified: false,
    items: items([241, 242, 243, 244, 245, 246, 247, 248, 249, 250], 'DELIVERED'), note: null },
  { id: 15, code: 'DC-0710-015', sourceHubId: 1, sourceHubName: 'KTX Khu A', targetHubId: 5, targetHubName: 'NVH SV',
    driverId: 1, driverName: 'Trần Văn Bình', driverPhone: '0901234569', teamName: 'Đội 01', status: 'COMPLETED', alertId: null, recommendationId: null,
    createdAt: d('08:20'), completedAt: d('08:52'), verified: true,
    items: items([251, 252, 253, 254, 255], 'DELIVERED'), note: null },
];

let alertsStore = MOCK_ALERTS.map((a) => ({ ...a }));
let ordersStore: TransferOrderResponse[] = MOCK_TRANSFER_ORDERS.map((o) => ({ ...o, items: o.items.map((x) => ({ ...x })) }));
let nextOrderId = 27;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = (code: string, status: number, message: string): never => {
  const err = new Error(message) as Error & { code: string; status: number };
  err.code = code;
  err.status = status;
  throw err;
};

export async function mockGetImbalanceAlerts(): Promise<ImbalanceAlert[]> {
  await wait(200);
  return alertsStore.map((a) => ({ ...a }));
}

export async function mockGetTransferOrders(params: { status?: string; page?: number; size?: number } = {}): Promise<PageResponse<TransferOrderResponse>> {
  await wait(200);
  const { status, page = 0, size = 20 } = params;
  let list = [...ordersStore];
  if (status) list = list.filter((o) => o.status === status);
  list.sort((a, b) => b.code.localeCompare(a.code));
  return {
    items: list.slice(page * size, page * size + size),
    totalItems: list.length,
    totalPages: Math.ceil(list.length / size),
    page,
    size,
  };
}

export async function mockGetTransferOrderDetail(orderId: number): Promise<TransferOrderResponse | null> {
  await wait(150);
  return ordersStore.find((o) => o.id === orderId) ?? null;
}

export async function mockCreateTransferOrder(data: CreateTransferRequest): Promise<{ status: 201 | 202; order: TransferOrderResponse; message?: string }> {
  await wait(500);

  if (data.sourceHubId === data.targetHubId) fail('VALIDATION_FAILED', 400, 'Hub nguồn và Hub đích không được trùng nhau');
  if (data.vehicleIds.length === 0) fail('VALIDATION_FAILED', 400, 'Cần chọn ít nhất 1 xe');

  const picked = MOCK_TRANSFER_VEHICLES.filter((v) => data.vehicleIds.includes(v.id));
  if (picked.length !== data.vehicleIds.length) fail('VEHICLE_UNAVAILABLE', 409, 'Một số xe không còn sẵn sàng');
  if (data.vehicleIds.includes(140)) fail('VEHICLE_HAS_OPERATION', 409, 'Xe UG-140 đang có hoạt động khác');
  if (data.targetHubId === 4 && data.vehicleIds.length > 8) fail('HUB_FULL', 409, 'Hub đích không đủ chỗ trống');

  const teamId = data.teamId ?? 1;
  const driver = MOCK_DRIVERS.find((x) => x.teamId === teamId) ?? null;
  const source = TRANSFER_HUBS.find((h) => h.id === data.sourceHubId);
  const target = TRANSFER_HUBS.find((h) => h.id === data.targetHubId);
  if (!source || !target) fail('NOT_FOUND', 404, 'Không tìm thấy Hub');

  const id = nextOrderId++;
  const order: TransferOrderResponse = {
    id,
    code: `DC-0710-${String(id).padStart(3, '0')}`,
    sourceHubId: data.sourceHubId,
    sourceHubName: source!.name,
    targetHubId: data.targetHubId,
    targetHubName: target!.name,
    driverId: driver?.id ?? null,
    driverName: driver?.name ?? null,
    driverPhone: driver?.phone ?? null,
    teamName: driver?.teamName ?? null,
    status: driver ? 'ASSIGNED' : 'PENDING',
    alertId: data.alertId ?? null,
    recommendationId: data.recommendationId ?? null,
    createdAt: new Date().toISOString(),
    items: picked.map((v) => ({ vehicleId: v.id, vehicleCode: v.code, slot: v.location, status: 'LOCKED' as const })),
    note: data.note ?? null,
  };
  ordersStore.unshift(order);

  return driver
    ? { status: 201, order, message: `Đã giao lệnh ${order.code} cho tài xế ${driver.name}` }
    : { status: 202, order, message: `Lệnh ${order.code} đã vào hàng chờ (chưa có tài xế rảnh)` };
}

export async function mockRemoveVehicleFromOrder(orderId: number, vehicleId: number): Promise<void> {
  await wait(200);
  const item = ordersStore.find((o) => o.id === orderId)?.items.find((i) => i.vehicleId === vehicleId);
  if (item) item.status = 'REMOVED';
}

export async function mockCancelTransferOrder(orderId: number): Promise<void> {
  await wait(200);
  const order = ordersStore.find((o) => o.id === orderId);
  if (order && (order.status === 'PENDING' || order.status === 'ASSIGNED')) {
    order.status = 'CANCELLED';
    order.items.forEach((i) => { if (i.status === 'LOCKED') i.status = 'REMOVED'; });
  }
}

// Driver (mock: tài xế driverId 1)
const MINE = (o: TransferOrderResponse) => o.driverId === 1;

export async function mockGetDriverOrders(): Promise<TransferOrderResponse[]> {
  await wait(200);
  const rank = (o: TransferOrderResponse) => (o.status === 'IN_PROGRESS' ? 0 : 1);
  return ordersStore
    .filter((o) => MINE(o) && (o.status === 'ASSIGNED' || o.status === 'IN_PROGRESS'))
    .sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code));
}

export async function mockGetDriverHistory(): Promise<TransferOrderResponse[]> {
  await wait(200);
  return ordersStore.filter((o) => MINE(o) && (o.status === 'COMPLETED' || o.status === 'CANCELLED')).sort((a, b) => b.code.localeCompare(a.code));
}

export async function mockGetDriverCurrentTransfer(): Promise<TransferOrderResponse | null> {
  return (await mockGetDriverOrders())[0] ?? null;
}

export async function mockLoadVehicle(orderId: number, vehicleId: number): Promise<void> {
  await wait(300);
  const order = ordersStore.find((o) => o.id === orderId);
  if (!order) fail('NOT_FOUND', 404, 'Không tìm thấy lệnh');
  const item = order!.items.find((i) => i.vehicleId === vehicleId);
  if (!item) fail('VEHICLE_NOT_IN_ORDER', 422, 'Xe không thuộc lệnh này');
  if (item!.status !== 'LOCKED') fail('CONFLICT', 409, 'Xe đã được quét hoặc không thể quét');
  item!.status = 'LOADED';
  if (order!.status === 'ASSIGNED') {
    order!.status = 'IN_PROGRESS';
    order!.startedAt = new Date().toISOString();
  }
}

export async function mockCompleteTransfer(orderId: number): Promise<void> {
  await wait(300);
  const order = ordersStore.find((o) => o.id === orderId);
  if (!order) fail('NOT_FOUND', 404, 'Không tìm thấy lệnh');
  const active = order!.items.filter((i) => i.status !== 'REMOVED');
  if (!active.every((i) => i.status === 'LOADED' || i.status === 'DELIVERED')) fail('CONFLICT', 409, 'Chưa quét đủ xe');
  order!.status = 'COMPLETED';
  order!.completedAt = new Date().toISOString();
  order!.verified = false;
  order!.items.forEach((i) => { if (i.status === 'LOADED') i.status = 'DELIVERED'; });
}

export function resetMockData() {
  alertsStore = MOCK_ALERTS.map((a) => ({ ...a }));
  ordersStore = MOCK_TRANSFER_ORDERS.map((o) => ({ ...o, items: o.items.map((x) => ({ ...x })) }));
  nextOrderId = 27;
}
