import { useEffect, useState } from 'react';
import { getSyncStatus } from '../api/networkApi';
import { REFRESH_INTERVAL_MS } from '../features/mo/constants';
import type { SyncStatus } from '../features/mo/types';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const run = () =>
      getSyncStatus(ctrl.signal)
        .then(setStatus)
        .catch(() => {
          /* giữ trạng thái cũ */
        });
    run();
    const id = setInterval(run, REFRESH_INTERVAL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, []);
  return status;
}
