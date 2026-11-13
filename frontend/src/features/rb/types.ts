// RB Feature Types

export type TransferOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TransferItemStatus = 'LOCKED' | 'LOADED' | 'DELIVERED' | 'REMOVED';

export interface TransferItem {
  vehicleId: number;
  status: TransferItemStatus;
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

export interface ImbalanceAlert {
  id: number;
  hubId: number;
  hubName: string;
  type: 'SHORTAGE' | 'SURPLUS' | 'STABLE';
  vehicleCount: number;
  availableDocks: number;
  totalDocks: number;
  message: string;
  detail?: string;
  detectedAt?: string;
  recommendation: {
    fromHubId: number;
    fromHubName: string;
    toHubId: number;
    toHubName: string;
    suggestedVehicleCount: number;
  } | null;
}

export interface TransferVehicle {
  id: number;
  code: string;
  type: string;
  batteryPercent: number;
  location: string;
  status: 'AVAILABLE' | 'IN_USE' | 'CHARGING' | 'MAINTENANCE';
}

/** Mã xe hiển thị: ưu tiên mã từ mock, nếu không thì dựng từ id (backend thật chỉ trả vehicleId). */
export const vehicleLabel = (item: TransferItem): string => item.vehicleCode ?? `UG-${String(item.vehicleId).padStart(3, '0')}`;

export interface DriverTeam {
  id: number;
  name: string;
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  teamId: number;
  teamName: string;
}

export interface HubInfo {
  id: number;
  code: string;
  name: string;
  detail?: string;
}

// Status display helpers
export const TRANSFER_STATUS_LABELS: Record<TransferOrderStatus, string> = {
  PENDING: 'Chờ thực hiện',
  ASSIGNED: 'Đã giao',
  IN_PROGRESS: 'Đang vận chuyển',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

export const TRANSFER_STATUS_COLORS: Record<TransferOrderStatus, string> = {
  PENDING: 'var(--amber)',
  ASSIGNED: 'var(--primary)',
  IN_PROGRESS: 'var(--primary)',
  COMPLETED: 'var(--green)',
  CANCELLED: 'var(--red)',
};

export const ITEM_STATUS_LABELS: Record<TransferItemStatus, string> = {
  LOCKED: 'Đã khóa',
  LOADED: 'Đã quét (Hub nguồn)',
  DELIVERED: 'Đã bàn giao (Hub đích)',
  REMOVED: 'Đã gỡ',
};

export const ALERT_TYPE_LABELS: Record<ImbalanceAlert['type'], string> = {
  SHORTAGE: 'Thiếu xe',
  SURPLUS: 'Thừa xe',
  STABLE: 'Ổn định',
};

export const ALERT_TYPE_COLORS: Record<ImbalanceAlert['type'], string> = {
  SHORTAGE: 'var(--red)',
  SURPLUS: 'var(--amber)',
  STABLE: 'var(--green)',
};

export const ALERT_TYPE_ICONS: Record<ImbalanceAlert['type'], string> = {
  SHORTAGE: '⚠️',
  SURPLUS: '📦',
  STABLE: '✅',
};

export type DriverTab = 'current' | 'history' | 'incidents';

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}