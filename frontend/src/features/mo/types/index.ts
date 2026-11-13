export type Tone = 'danger' | 'warning' | 'success' | 'info' | 'muted';

export interface HubBadge {
  label: string;
  tone: Tone;
}

export interface HubRow {
  id: string;
  name: string;
  typeLabel: string; // "Khu ký túc xá", "Hub cửa ngõ"...
  region: string;
  online: boolean;
  lastUpdate: string | null; // "09:31" - chỉ có ý nghĩa khi online = false
  occupancyPct: number | null; // null khi mất kết nối
  chargersUsed: number | null;
  chargersTotal: number | null;
  vehiclesReady: number | null;
  badges: HubBadge[];
}

export interface VehicleStatusCounts {
  ready: number;
  inUse: number;
  charging: number;
  pendingCheck: number;
  faulty: number;
}

export interface NetworkSummary {
  hubsOnline: number;
  hubsTotal: number;
  vehiclesTotal: number;
  vehiclesReady: number;
  avgOccupancyPct: number;
  hubsOverThreshold: number;
  chargersInUse: number;
  chargersTotal: number;
  chargersFaulty: number;
}

export type AlertKind = 'overload' | 'imbalance' | 'vehicleFault' | 'disconnected';

export interface AlertItem {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  action: { label: string; to: string; variant: 'primary' | 'soft' };
}

export interface NetworkOverview {
  updatedAt: string; // ISO-8601
  summary: NetworkSummary;
  vehiclesByStatus: VehicleStatusCounts;
  hubs: HubRow[];
  alerts: AlertItem[];
}

export type LoadFilter = 'all' | 'overload' | 'high' | 'normal' | 'offline';

export interface OverviewFilters {
  region: string; // 'all' hoặc tên khu vực
  hubType: string; // 'all' hoặc typeLabel
  load: LoadFilter;
}

export interface SyncStatus {
  hubsOnline: number;
  hubsTotal: number;
}
