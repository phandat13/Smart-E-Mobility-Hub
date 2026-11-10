import { useEffect, useState } from 'react';
import { getNetworkOverview } from '../../../api/networkApi';
import { REFRESH_INTERVAL_MS } from '../constants';
import type { NetworkOverview, OverviewFilters } from '../types';

/** Tải tổng quan mạng lưới và tự làm mới mỗi 30 giây (MO01 bước 5). Giữ dữ liệu cũ khi đổi bộ lọc để không nháy màn hình. */
export function useNetworkOverview(filters: OverviewFilters) {
  const [data, setData] = useState<NetworkOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const { region, hubType, load } = filters;

  useEffect(() => {
    const ctrl = new AbortController();
    const run = async () => {
      try {
        const res = await getNetworkOverview({ region, hubType, load }, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setData(res);
        setError(null);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Không tải được dữ liệu');
      }
    };
    run();
    const id = setInterval(run, REFRESH_INTERVAL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [region, hubType, load, version]);

  return { data, error, loading: data === null && error === null, retry: () => setVersion((v) => v + 1) };
}
