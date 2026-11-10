import { http, USE_MOCK } from './client';
import { mockNetworkOverview, mockSyncStatus } from '../mocks/networkOverview';
import type { NetworkOverview, OverviewFilters, SyncStatus } from '../features/mo/types';

/** GET /api/network/overview?region=&hubType=&load=  (MO01) */
export async function getNetworkOverview(f: OverviewFilters, signal?: AbortSignal): Promise<NetworkOverview> {
  if (USE_MOCK) return mockNetworkOverview(f);
  const q = new URLSearchParams();
  if (f.region !== 'all') q.set('region', f.region);
  if (f.hubType !== 'all') q.set('hubType', f.hubType);
  if (f.load !== 'all') q.set('load', f.load);
  return http<NetworkOverview>(`/api/network/overview?${q.toString()}`, { signal });
}

/** GET /api/network/sync-status  (khối "Dữ liệu IoT đồng bộ" ở sidebar) */
export async function getSyncStatus(signal?: AbortSignal): Promise<SyncStatus> {
  if (USE_MOCK) return mockSyncStatus();
  return http<SyncStatus>('/api/network/sync-status', { signal });
}
