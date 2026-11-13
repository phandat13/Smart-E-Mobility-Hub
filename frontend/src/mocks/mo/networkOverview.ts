import type { HubRow, NetworkOverview, OverviewFilters, SyncStatus } from '../../features/mo/types';
import { HIGH_PCT, OVERLOAD_PCT } from '../../features/mo/constants';

const HUBS: HubRow[] = [
  {
    id: 'ktx-b',
    name: 'KTX Khu B',
    typeLabel: 'Khu ký túc xá',
    region: 'Khu Đông',
    online: true,
    lastUpdate: null,
    occupancyPct: 94,
    chargersUsed: 6,
    chargersTotal: 6,
    vehiclesReady: 2,
    badges: [{ label: 'Quá tải', tone: 'danger' }],
  },
  {
    id: 'ga-metro',
    name: 'Ga Metro ĐHQG',
    typeLabel: 'Hub cửa ngõ',
    region: 'Khu cửa ngõ',
    online: true,
    lastUpdate: null,
    occupancyPct: 91,
    chargersUsed: 7,
    chargersTotal: 8,
    vehiclesReady: 4,
    badges: [{ label: 'Quá tải', tone: 'danger' }],
  },
  {
    id: 'ktx-a',
    name: 'KTX Khu A',
    typeLabel: 'Khu ký túc xá',
    region: 'Khu Đông',
    online: true,
    lastUpdate: null,
    occupancyPct: 72,
    chargersUsed: 5,
    chargersTotal: 6,
    vehiclesReady: 8,
    badges: [{ label: 'Cổng #04 lỗi', tone: 'warning' }],
  },
  {
    id: 'thu-vien',
    name: 'Thư viện Trung tâm',
    typeLabel: 'Khu học tập',
    region: 'Khu Trung tâm',
    online: true,
    lastUpdate: null,
    occupancyPct: 66,
    chargersUsed: 4,
    chargersTotal: 6,
    vehiclesReady: 6,
    badges: [],
  },
  {
    id: 'toa-vnu',
    name: 'Tòa VNU',
    typeLabel: 'Khu hành chính',
    region: 'Khu Trung tâm',
    online: true,
    lastUpdate: null,
    occupancyPct: 38,
    chargersUsed: 2,
    chargersTotal: 8,
    vehiclesReady: 20,
    badges: [{ label: 'Thừa xe', tone: 'warning' }],
  },
  {
    id: 'nvh-sv',
    name: 'Nhà văn hóa SV',
    typeLabel: 'Khu dịch vụ',
    region: 'Khu Trung tâm',
    online: true,
    lastUpdate: null,
    occupancyPct: 55,
    chargersUsed: 3,
    chargersTotal: 6,
    vehiclesReady: 5,
    badges: [],
  },
  {
    id: 'h6',
    name: 'Khu học tập H6',
    typeLabel: 'Khu học tập',
    region: 'Khu Tây',
    online: false,
    lastUpdate: '09:31',
    occupancyPct: null,
    chargersUsed: null,
    chargersTotal: null,
    vehiclesReady: null,
    badges: [{ label: 'Mất kết nối', tone: 'muted' }],
  },
];

function matchesLoad(h: HubRow, load: OverviewFilters['load']): boolean {
  if (load === 'all') return true;
  if (load === 'offline') return !h.online;
  if (!h.online || h.occupancyPct === null) return false;
  if (load === 'overload') return h.occupancyPct >= OVERLOAD_PCT;
  if (load === 'high') return h.occupancyPct >= HIGH_PCT && h.occupancyPct < OVERLOAD_PCT;
  return h.occupancyPct < HIGH_PCT;
}

export async function mockNetworkOverview(f: OverviewFilters): Promise<NetworkOverview> {
  await new Promise((r) => setTimeout(r, 250));
  const hubs = HUBS.filter(
    (h) =>
      (f.region === 'all' || h.region === f.region) &&
      (f.hubType === 'all' || h.typeLabel === f.hubType) &&
      matchesLoad(h, f.load),
  );
  return {
    updatedAt: new Date().toISOString(),
    summary: {
      hubsOnline: 12,
      hubsTotal: 13,
      vehiclesTotal: 452,
      vehiclesReady: 248,
      avgOccupancyPct: 68,
      hubsOverThreshold: 2,
      chargersInUse: 41,
      chargersTotal: 60,
      chargersFaulty: 3,
    },
    vehiclesByStatus: { ready: 248, inUse: 112, charging: 54, pendingCheck: 21, faulty: 17 },
    hubs,
    alerts: [
      {
        id: 'a1',
        kind: 'overload',
        title: 'Quá tải · KTX Khu B',
        detail: 'Lấp đầy 94% · còn 0 cổng sạc trống',
        action: { label: 'Xem Hub', to: '/hubs/ktx-b', variant: 'soft' },
      },
      {
        id: 'a2',
        kind: 'imbalance',
        title: 'Mất cân đối xe',
        detail: 'Tòa VNU thừa 20 · KTX Khu B thiếu 15',
        action: { label: 'Tạo lệnh điều chuyển', to: '/rebalance/new', variant: 'primary' },
      },
      {
        id: 'a3',
        kind: 'vehicleFault',
        title: 'Xe lỗi · UG-040',
        detail: 'Mã lỗi E-BAT-07 · pin bất thường',
        action: { label: 'Tạo lệnh bảo trì', to: '/maintenance/new', variant: 'primary' },
      },
      {
        id: 'a4',
        kind: 'disconnected',
        title: 'Mất kết nối · H6',
        detail: 'Không nhận dữ liệu từ 09:31',
        action: { label: 'Xem chi tiết', to: '/hubs/h6', variant: 'soft' },
      },
    ],
  };
}

export async function mockSyncStatus(): Promise<SyncStatus> {
  return { hubsOnline: 12, hubsTotal: 13 };
}
