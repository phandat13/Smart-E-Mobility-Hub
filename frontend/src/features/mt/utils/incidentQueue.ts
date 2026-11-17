import type { DemoState } from '../../../mocks/pv-mt/types';

export const PAGE_SIZE = 7;

export type Queued = DemoState['incidents'][number];

export function queueStatus(incident: Queued, state: DemoState) {
  if (incident.acceptedAt) return 'Đã đóng';
  if (incident.status === 'CLOSED') return 'Chờ xác nhận';
  if (incident.status === 'ASSIGNED') return 'Đang xử lý';
  return state.resources.find((r) => r.id === incident.resourceId)?.status === 'FAULTY'
    ? 'Đã tiếp nhận'
    : 'Chờ xác nhận';
}

export const priorityTone = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' } as const;

export const sourceShort = (incident: Queued) =>
  incident.source === 'SYSTEM' ? 'Hệ thống' : 'SV báo cáo';
