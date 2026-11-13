import { http, USE_MOCK } from '../../../api/client';
import {
  mockGetImbalanceAlerts,
  mockGetTransferOrders,
  mockGetTransferOrderDetail,
  mockCreateTransferOrder,
  mockRemoveVehicleFromOrder,
  mockCancelTransferOrder,
  mockGetDriverCurrentTransfer,
  mockGetDriverOrders,
  mockGetDriverHistory,
  TRANSFER_HUBS,
  DRIVER_TEAMS,
  MOCK_TRANSFER_VEHICLES,
  mockLoadVehicle,
  mockCompleteTransfer,
  type TransferOrderResponse,
  type CreateTransferRequest,
  type ImbalanceAlert,
  type PageResponse,
} from '../../../mocks/transfersMock';

export type {
  TransferOrderResponse,
  CreateTransferRequest,
  ImbalanceAlert,
  PageResponse,
  TransferItemStatus,
  TransferOrderStatus,
} from '../../../mocks/transfersMock';

// Operator APIs
export async function getImbalanceAlertsApi(): Promise<ImbalanceAlert[]> {
  if (USE_MOCK) return mockGetImbalanceAlerts();
  return http<ImbalanceAlert[]>('/api/v1/ops/alerts/imbalance');
}

export async function getTransferOrdersApi(params: { status?: string; page?: number; size?: number } = {}): Promise<PageResponse<TransferOrderResponse>> {
  const { status, page = 0, size = 20 } = params;
  if (USE_MOCK) return mockGetTransferOrders({ status, page, size });
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.append('status', status);
  return http<PageResponse<TransferOrderResponse>>(`/api/v1/ops/transfers?${query.toString()}`);
}

export async function getTransferOrderDetailApi(orderId: number): Promise<TransferOrderResponse> {
  if (USE_MOCK) {
    const order = await mockGetTransferOrderDetail(orderId);
    if (!order) {
      const err = new Error('Không tìm thấy lệnh') as Error & { code: string; status: number };
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }
    return order;
  }
  return http<TransferOrderResponse>(`/api/v1/ops/transfers/${orderId}`);
}

export async function createTransferOrderApi(data: CreateTransferRequest): Promise<{ status: 201 | 202; order: TransferOrderResponse; message?: string }> {
  if (USE_MOCK) return mockCreateTransferOrder(data);
  const response = await http<{ status: 201 | 202; order: TransferOrderResponse; message?: string }>('/api/v1/ops/transfers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

export async function removeVehicleFromOrderApi(orderId: number, vehicleId: number): Promise<void> {
  if (USE_MOCK) return mockRemoveVehicleFromOrder(orderId, vehicleId);
  await http(`/api/v1/ops/transfers/${orderId}/items/${vehicleId}/remove`, { method: 'POST' });
}

export async function cancelTransferOrderApi(orderId: number): Promise<void> {
  if (USE_MOCK) return mockCancelTransferOrder(orderId);
  await http(`/api/v1/ops/transfers/${orderId}/cancel`, { method: 'POST' });
}

// Driver APIs
export async function getDriverCurrentTransferApi(): Promise<TransferOrderResponse | null> {
  if (USE_MOCK) return mockGetDriverCurrentTransfer();
  try {
    return await http<TransferOrderResponse>('/api/v1/driver/transfers/current');
  } catch (err: unknown) {
    const apiErr = err as { status?: number };
    if (apiErr.status === 204) return null;
    throw err;
  }
}

/** Danh sách lệnh đang giao cho tài xế. Backend thật chỉ có /current nên bọc thành mảng 0..1 phần tử. */
export async function getDriverOrdersApi(): Promise<TransferOrderResponse[]> {
  if (USE_MOCK) return mockGetDriverOrders();
  const current = await getDriverCurrentTransferApi();
  return current ? [current] : [];
}

/** Lịch sử lệnh của tài xế. Backend chưa có endpoint nên bản thật trả null (UI hiển thị thông báo). */
export async function getDriverHistoryApi(): Promise<TransferOrderResponse[] | null> {
  if (USE_MOCK) return mockGetDriverHistory();
  return null;
}

export async function loadVehicleApi(orderId: number, vehicleId: number): Promise<void> {
  if (USE_MOCK) return mockLoadVehicle(orderId, vehicleId);
  await http(`/api/v1/driver/transfers/${orderId}/load`, {
    method: 'POST',
    body: JSON.stringify({ vehicleId }),
  });
}

export async function completeTransferApi(orderId: number): Promise<void> {
  if (USE_MOCK) return mockCompleteTransfer(orderId);
  await http(`/api/v1/driver/transfers/${orderId}/complete`, { method: 'POST' });
}

// Hub data for modals (mock only for now)
export async function getHubsForTransferApi(): Promise<Array<{ id: number; name: string; detail?: string }>> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 100));
    return TRANSFER_HUBS.map(({ id, name, detail }) => ({ id, name, detail }));
  }
  return http<Array<{ id: number; name: string; detail?: string }>>('/api/v1/hubs');
}

export async function getVehiclesAtHubApi(hubId: number): Promise<Array<{
  id: number;
  code: string;
  type: string;
  batteryPercent: number;
  location: string;
  status: string;
}>> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 150));
    // Return mock vehicles based on hub
    return [...MOCK_TRANSFER_VEHICLES].filter((v) => v.status === 'AVAILABLE').sort((x, y) => y.batteryPercent - x.batteryPercent).map((v) => ({
      id: v.id,
      code: v.code,
      type: v.type,
      batteryPercent: v.batteryPercent,
      location: v.location,
      status: v.status,
    }));
  }
  return http<Array<{ id: number; code: string; type: string; batteryPercent: number; location: string; status: string }>>(`/api/v1/hubs/${hubId}/vehicles/available`);
}

export async function getDriverTeamsApi(): Promise<Array<{ id: number; name: string }>> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 100));
    return DRIVER_TEAMS;
  }
  return http<Array<{ id: number; name: string }>>('/api/v1/ops/teams');
}
