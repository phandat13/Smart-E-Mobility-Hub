import { USE_MOCK } from './client';
import { backendPending } from './backendPending';
import { mtMock } from '../mocks/pv-mt/mtMock';
import type { Incident, MaintenanceTicket, Priority, RepairProgress } from '../features/mt/types';

/** MT01–05: báo cáo sự cố, phân công, lệnh / phiếu bảo trì, xác minh sau sửa chữa. */
export const mtApi = {
  /** MT01 · gửi báo cáo sự cố */
  report(
    input: Pick<Incident, 'resourceId' | 'hubId' | 'category' | 'description' | 'photos'>,
  ): Promise<string> {
    if (USE_MOCK) return mtMock.report(input);
    return backendPending('MT01 · báo cáo sự cố');
  },
  /** MT02–03 · tạo lệnh bảo trì và phân công kỹ thuật viên */
  createOrder(
    resourceIds: string[],
    technicianId: string,
    priority: Priority,
    dueAt: string,
    incidentId?: string,
  ): Promise<string> {
    if (USE_MOCK) return mtMock.createOrder(resourceIds, technicianId, priority, dueAt, incidentId);
    return backendPending('MT03 · tạo lệnh bảo trì');
  },
  /** MT04 · lưu phiếu bảo trì */
  saveTicket(
    input: Pick<
      MaintenanceTicket,
      'orderId' | 'resourceId' | 'diagnosis' | 'repairItems' | 'parts' | 'photos'
    >,
  ): Promise<string> {
    if (USE_MOCK) return mtMock.saveTicket(input);
    return backendPending('MT04 · lưu phiếu bảo trì');
  },
  /** MT05 · cập nhật tình trạng bảo trì */
  updateProgress(id: string, progress: RepairProgress, notes: string): Promise<void> {
    if (USE_MOCK) return mtMock.updateProgress(id, progress, notes);
    return backendPending('MT05 · cập nhật tình trạng');
  },
  /** MT05 · xác minh tài nguyên sau bảo trì (dữ liệu cảm biến) */
  verifyResource(id: string): Promise<void> {
    if (USE_MOCK) return mtMock.verifyResource(id);
    return backendPending('MT05 · xác minh tài nguyên');
  },
  /** MT02 · lưu ghi chú xử lý */
  saveIncidentNotes(id: string, notes: string): Promise<void> {
    if (USE_MOCK) return mtMock.saveIncidentNotes(id, notes);
    return backendPending('MT02 · lưu ghi chú');
  },
  /** MT02 · nghiệm thu & đóng phiếu */
  acceptIncident(id: string): Promise<void> {
    if (USE_MOCK) return mtMock.acceptIncident(id);
    return backendPending('MT02 · nghiệm thu');
  },
};
