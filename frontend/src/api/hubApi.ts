import { mockGetHubs, mockGetHubDetail, type Hub, type HubFilters } from '../mocks/hubsMock';

export type { Hub, HubFilters, VehicleStatus, VehicleSummary } from '../mocks/hubsMock';

// Backend chưa có Hub API nên cả mock lẫn chế độ thật đều trả dữ liệu mock.
// Khi backend có endpoint, thay thân hàm bằng `http()` giống các file *Api khác.

export async function getHubsApi(filters?: HubFilters): Promise<Hub[]> {
  return mockGetHubs(filters);
}

export async function getHubDetailApi(hubId: number): Promise<Hub | null> {
  return mockGetHubDetail(hubId);
}
