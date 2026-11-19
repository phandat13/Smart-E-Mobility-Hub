import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { AlertView, Overview } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { Empty, Loading, Pill, Updated, errorText, useToast } from '../../components/ui';
import { hubTypeLabel, shortDateTime } from '../../lib/format';
import { useLoad } from '../../lib/hooks';
import { subscribe } from '../../lib/realtime';
import { alertTypeLabel } from '../../lib/status';

/** MO01 – Tổng quan mạng lưới Hub: tự làm mới 30 giây + cảnh báo realtime qua WebSocket. */
export function DashboardPage() {
  const nav = useNavigate();
  const toast = useToast();
  const { data, reload, loading } = useLoad(() => api<Overview>('/api/v1/ops/dashboard'), [], 30000);
  const [area, setArea] = useState('');
  const [type, setType] = useState('');
  const [load, setLoad] = useState('');
  useEffect(() => subscribe('/topic/alerts', (b) => { const a = b as { message?: string }; if (a?.message) toast('🚨 ' + a.message); reload(); }), [reload, toast]);
  const rows = useMemo(() => (data?.hubs ?? []).filter((r) => (!area || r.hub.area === area) && (!type || r.hub.type === type) && (!load || r.loadLevel === load))
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent), [data, area, type, load]);
  if (loading && !data) return <Loading />;
  if (!data) return null;
  const t = data.totals;
  const seg = [['Sẵn sàng', t.availableVehicles, 'var(--green)'], ['Đang dùng', t.inUse, 'var(--primary)'], ['Đang sạc', t.charging, 'var(--purple)'], ['Chờ kiểm tra/Cần sạc', t.pendingCheck, 'var(--orange)'], ['Hỏng/bảo trì', t.faulty, 'var(--red)'], ['Khác', t.other, 'var(--teal)']] as const;
  const areas = Array.from(new Set(data.hubs.map((r) => r.hub.area).filter(Boolean))) as string[];

  const ack = async (a: AlertView) => { try { await api(`/api/v1/ops/alerts/${a.id}/ack`, { body: {} }); reload(); } catch (e) { toast(errorText(e), 'error'); } };
  return (
    <div className="page">
      <PageHead title="Tổng quan mạng lưới Hub" sub={<Updated at={data.servedAt} refreshSeconds={data.refreshSeconds} />}
        right={<>
          <select className="select" value={area} onChange={(e) => setArea(e.target.value)}><option value="">Khu vực: Tất cả</option>{areas.map((a) => <option key={a}>{a}</option>)}</select>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}><option value="">Loại Hub: Tất cả</option>{Object.entries(hubTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="select" value={load} onChange={(e) => setLoad(e.target.value)}><option value="">Mức tải: Tất cả</option><option value="HIGH">Cao (&gt;90%)</option><option value="MEDIUM">Trung bình</option><option value="LOW">Thấp</option></select>
        </>} />
      <div className="grid cols-4 mb-16">
        <div className="card kpi"><div className="label">Hub đang hoạt động</div><div className="value">{t.activeHubs - t.disconnectedHubs} / {t.totalHubs}</div><div className="note" style={{ color: t.disconnectedHubs ? 'var(--red)' : 'var(--green)' }}>{t.disconnectedHubs ? `● ${t.disconnectedHubs} Hub mất kết nối` : '● Tất cả Hub trực tuyến'}</div></div>
        <div className="card kpi"><div className="label">Tổng phương tiện</div><div className="value">{t.totalVehicles} xe</div><div className="note" style={{ color: 'var(--primary)' }}>{t.availableVehicles} xe sẵn sàng phục vụ</div></div>
        <div className="card kpi"><div className="label">Tỉ lệ lấp đầy chỗ đỗ (TB)</div><div className="value" style={{ color: 'var(--orange)' }}>{t.avgOccupancyPercent}%</div><div className="note" style={{ color: t.hubsOverThreshold ? 'var(--red)' : 'var(--muted)' }}>{t.hubsOverThreshold} Hub vượt ngưỡng 90%</div></div>
        <div className="card kpi"><div className="label">Cổng sạc đang sử dụng</div><div className="value">{t.portsInUse} / {t.portsTotal}</div><div className="note" style={{ color: 'var(--primary)' }}>{t.portsFaulty} cổng báo lỗi/bảo trì</div></div>
      </div>
      <div className="card mb-16">
        <div className="row between mb-8"><b>Phương tiện theo trạng thái</b><div className="legend">{seg.map(([n, v, c]) => <span key={n} style={{ ['--c' as string]: c }}>{n} {v}</span>)}</div></div>
        <div className="stack-bar">{seg.map(([n, v, c]) => <span key={n} style={{ width: `${(Number(v) / Math.max(1, t.totalVehicles)) * 100}%`, background: c }} />)}</div>
      </div>
      <div className="grid side-wide">
        <div className="card">
          <div className="card-head"><div><h3>Danh sách Hub</h3><div className="sub">Mã màu theo mức tải · chọn một Hub để xem chi tiết (MO02)</div></div></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Hub</th><th>Lấp đầy chỗ đỗ</th><th>Cổng sạc</th><th>Xe sẵn sàng</th><th>Cảnh báo</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.hub.id} className="clickable" onClick={() => nav(`/ops/hubs/${r.hub.id}`)}>
                <td><b>{r.hub.name}</b><div className="tiny muted">{hubTypeLabel[r.hub.type]}{r.hub.status === 'INACTIVE' ? ' · ngưng hoạt động' : ''}</div></td>
                <td style={{ minWidth: 160 }}>{r.disconnected ? <span className="small muted">Mất kết nối · {shortDateTime(r.hub.dataUpdatedAt)}</span> :
                  <div className="battery"><div className={`bar ${r.loadLevel === 'HIGH' ? 'red' : r.loadLevel === 'MEDIUM' ? 'orange' : 'green'}`}><span style={{ width: `${r.occupancyPercent}%` }} /></div><span className="small bold">{r.occupancyPercent}%</span></div>}</td>
                <td>{r.hub.freePorts}/{r.hub.totalPorts} trống{r.hub.faultyPorts > 0 && <div className="tiny" style={{ color: 'var(--red)' }}>{r.hub.faultyPorts} lỗi</div>}</td>
                <td>{r.hub.availableVehicles}</td>
                <td>{r.disconnected ? <Pill tone="gray" label="Mất kết nối" /> : r.loadLevel === 'HIGH' ? <Pill tone="red" label="Quá tải" /> : r.openAlerts > 0 ? <Pill tone="orange" label={`${r.openAlerts} cảnh báo`} /> : <span className="muted">—</span>}</td>
              </tr>))}</tbody>
          </table></div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Cảnh báo đang mở ({data.alerts.length})</h3><div className="sub">Do hệ thống tự động sinh ra</div></div></div>
          {data.alerts.length === 0 ? <Empty icon="✅" title="Không có cảnh báo" /> : data.alerts.map((a) => (
            <div key={a.id} className="list-item" style={{ alignItems: 'flex-start', cursor: 'default' }}>
              <div className="vehicle-ico" style={{ background: a.severity === 'CRITICAL' ? 'var(--red-50)' : 'var(--orange-50)' }}>{a.type === 'IMBALANCE' ? '⇄' : a.type === 'OFFLINE' ? '⦸' : a.type === 'OVERLOAD' ? '▲' : '!'}</div>
              <div style={{ flex: 1 }}>
                <div className="row between"><b className="small">{alertTypeLabel[a.type] ?? a.type}{a.hubName ? ` · ${a.hubName}` : ''}</b><Pill status={a.status} /></div>
                <div className="small muted">{a.message}</div>
                <div className="row wrap mt-8">
                  {a.type === 'IMBALANCE' && <button className="btn sm" onClick={() => nav(`/ops/transfers?target=${a.hubId}&alert=${a.id}`)}>Tạo lệnh điều chuyển</button>}
                  {a.type === 'DEVICE_ERROR' && a.resourceType === 'VEHICLE' && <button className="btn sm" onClick={() => nav(`/ops/incidents?vehicle=${a.resourceId}&alert=${a.id}`)}>Tạo lệnh bảo trì</button>}
                  {a.type === 'RECONCILIATION' && <button className="btn sm" onClick={() => nav('/ops/reconciliation')}>Đối soát</button>}
                  {a.hubId && <button className="btn sm ghost" onClick={() => nav(`/ops/hubs/${a.hubId}`)}>Xem Hub</button>}
                  {a.status === 'OPEN' && <button className="btn sm ghost" onClick={() => ack(a)}>Đã tiếp nhận</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
