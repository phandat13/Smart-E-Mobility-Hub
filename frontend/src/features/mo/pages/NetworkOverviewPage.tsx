import { useState } from 'react';
import AlertPanel from '../components/AlertPanel';
import FilterSelect from '../components/FilterSelect';
import HubTable from '../components/HubTable';
import StatCard from '../components/StatCard';
import VehicleStatusBar from '../components/VehicleStatusBar';
import { HUB_TYPE_OPTIONS, LOAD_OPTIONS, REGION_OPTIONS, loadTone } from '../constants';
import { useNetworkOverview } from '../hooks/useNetworkOverview';
import type { LoadFilter, OverviewFilters } from '../types';
import '../mo.css';

const asOptions = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour12: false });

/** MO01 · Xem tổng quan mạng lưới Hub */
export default function NetworkOverviewPage() {
  const [filters, setFilters] = useState<OverviewFilters>({ region: 'all', hubType: 'all', load: 'all' });
  const { data, error, loading, retry } = useNetworkOverview(filters);

  if (loading) return <div className="card">Đang tải dữ liệu mạng lưới…</div>;
  if (error && !data) {
    return (
      <div className="card">
        <p>Không tải được dữ liệu mạng lưới ({error}).</p>
        <button className="btn btn--primary" onClick={retry}>Thử lại</button>
      </div>
    );
  }
  if (!data) return null;

  const { summary: s } = data;
  const offline = s.hubsTotal - s.hubsOnline;

  return (
    <div className="mo01">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tổng quan mạng lưới Hub</h1>
          <p className="page-sub">
            ⟳ Tự làm mới mỗi 30 giây · cập nhật lúc {fmtTime(data.updatedAt)}
            {error && <span className="tone-danger"> · Lỗi làm mới, đang hiển thị dữ liệu cũ</span>}
          </p>
        </div>
        <div className="filters">
          <FilterSelect label="Khu vực" value={filters.region} options={asOptions(REGION_OPTIONS)} onChange={(v) => setFilters({ ...filters, region: v })} />
          <FilterSelect label="Loại Hub" value={filters.hubType} options={asOptions(HUB_TYPE_OPTIONS)} onChange={(v) => setFilters({ ...filters, hubType: v })} />
          <FilterSelect label="Mức tải" value={filters.load} options={LOAD_OPTIONS} onChange={(v) => setFilters({ ...filters, load: v as LoadFilter })} />
        </div>
      </div>

      <div className="stats">
        <StatCard label="Hub đang hoạt động" value={`${s.hubsOnline} / ${s.hubsTotal}`}
          valueTone={offline > 0 ? 'danger' : 'default'}
          hint={offline > 0 ? `● ${offline} Hub mất kết nối` : 'Tất cả Hub trực tuyến'} hintTone={offline > 0 ? 'danger' : 'success'} />
        <StatCard label="Tổng phương tiện" value={`${s.vehiclesTotal} xe`}
          hint={`${s.vehiclesReady} xe sẵn sàng phục vụ`} hintTone="success" />
        <StatCard label="Tỉ lệ lấp đầy chỗ đỗ (TB)" value={`${s.avgOccupancyPct}%`}
          valueTone={loadTone(s.avgOccupancyPct)}
          hint={s.hubsOverThreshold > 0 ? `${s.hubsOverThreshold} Hub vượt ngưỡng 90%` : 'Không có Hub vượt ngưỡng'}
          hintTone={s.hubsOverThreshold > 0 ? 'warning' : 'success'} />
        <StatCard label="Cổng sạc đang sử dụng" value={`${s.chargersInUse} / ${s.chargersTotal}`}
          hint={`${s.chargersFaulty} cổng báo lỗi`} hintTone="info" />
      </div>

      <VehicleStatusBar counts={data.vehiclesByStatus} />

      <div className="main-grid">
        <HubTable hubs={data.hubs} />
        <AlertPanel alerts={data.alerts} />
      </div>
    </div>
  );
}
