import { icons } from '../../../assets/icons';
import { useState } from 'react';
import AlertPanel from '../components/AlertPanel';
import FilterSelect from '../components/FilterSelect';
import HubTable from '../components/HubTable';
import StatCard from '../components/StatCard';
import VehicleStatusBar from '../components/VehicleStatusBar';
import { HUB_TYPE_OPTIONS, LOAD_OPTIONS, REGION_OPTIONS, loadTone } from '../constants';
import { useNetworkOverview } from '../hooks/useNetworkOverview';
import type { LoadFilter, OverviewFilters } from '../types';
import '../styles/network-overview.css';

const toFilterOptions = (labels: string[]) =>
  labels.map((label) => ({ value: label, label: label }));
const formatUpdatedTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour12: false });

/** MO01 · Xem tổng quan mạng lưới Hub */
export default function NetworkOverviewPage() {
  const [filters, setFilters] = useState<OverviewFilters>({
    region: 'all',
    hubType: 'all',
    load: 'all',
  });
  const { data, error, loading, retry } = useNetworkOverview(filters);

  if (loading) return <div className="hub-panel">Đang tải dữ liệu mạng lưới…</div>;
  if (error && !data) {
    return (
      <div className="hub-panel">
        <p>Không tải được dữ liệu mạng lưới ({error}).</p>
        <button className="hub-action hub-action--primary" onClick={retry}>
          Thử lại
        </button>
      </div>
    );
  }
  if (!data) return null;

  const { summary: s } = data;
  const offlineHubCount = s.hubsTotal - s.hubsOnline;

  return (
    <div className="network-overview">
      <div className="hub-page-header">
        <div>
          <h1 className="hub-page-header__title">Tổng quan mạng lưới Hub</h1>
          <p className="hub-page-header__subtitle">
            {icons.refresh} Tự làm mới mỗi 30 giây · cập nhật lúc{' '}
            {formatUpdatedTime(data.updatedAt)}
            {error && (
              <span className="hub-text--danger"> · Lỗi làm mới, đang hiển thị dữ liệu cũ</span>
            )}
          </p>
        </div>
        <div className="network-overview__filters">
          <FilterSelect
            label="Khu vực"
            value={filters.region}
            options={toFilterOptions(REGION_OPTIONS)}
            onChange={(v) => setFilters({ ...filters, region: v })}
          />
          <FilterSelect
            label="Loại Hub"
            value={filters.hubType}
            options={toFilterOptions(HUB_TYPE_OPTIONS)}
            onChange={(v) => setFilters({ ...filters, hubType: v })}
          />
          <FilterSelect
            label="Mức tải"
            value={filters.load}
            options={LOAD_OPTIONS}
            onChange={(v) => setFilters({ ...filters, load: v as LoadFilter })}
          />
        </div>
      </div>

      <div className="network-overview__statistics">
        <StatCard
          label="Hub đang hoạt động"
          value={`${s.hubsOnline} / ${s.hubsTotal}`}
          valueTone={offlineHubCount > 0 ? 'danger' : 'default'}
          hint={
            offlineHubCount > 0 ? `● ${offlineHubCount} Hub mất kết nối` : 'Tất cả Hub trực tuyến'
          }
          hintTone={offlineHubCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Tổng phương tiện"
          value={`${s.vehiclesTotal} xe`}
          hint={`${s.vehiclesReady} xe sẵn sàng phục vụ`}
          hintTone="success"
        />
        <StatCard
          label="Tỉ lệ lấp đầy chỗ đỗ (TB)"
          value={`${s.avgOccupancyPct}%`}
          valueTone={loadTone(s.avgOccupancyPct)}
          hint={
            s.hubsOverThreshold > 0
              ? `${s.hubsOverThreshold} Hub vượt ngưỡng 90%`
              : 'Không có Hub vượt ngưỡng'
          }
          hintTone={s.hubsOverThreshold > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Cổng sạc đang sử dụng"
          value={`${s.chargersInUse} / ${s.chargersTotal}`}
          hint={`${s.chargersFaulty} cổng báo lỗi`}
          hintTone="info"
        />
      </div>

      <VehicleStatusBar counts={data.vehiclesByStatus} />

      <div className="network-overview__content">
        <HubTable hubs={data.hubs} />
        <AlertPanel alerts={data.alerts} />
      </div>
    </div>
  );
}
