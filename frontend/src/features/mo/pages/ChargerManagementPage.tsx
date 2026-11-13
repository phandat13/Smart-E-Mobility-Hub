import { icons } from '../../../assets/icons';
import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mockHubs, mockChargers } from '../../../mocks/mo/hubOperations';
import type { Charger } from '../types/hubOperations';
import HubStatusBadge from '../components/HubStatusBadge';
import HubPageHeader from '../components/HubPageHeader';
import HubOperationModal from '../components/HubOperationModal';
import HubFormField from '../components/HubFormField';
import '../styles/network-overview.css';
import '../styles/hub-operations.css';
export function ChargerManagementPage() {
  const { hubId = 'ktx-a' } = useParams();
  const hub = mockHubs.find((h) => h.id === hubId) || mockHubs[0];
  const [chargers, setChargers] = useState(mockChargers);
  const [chargerStatusFilter, setChargerStatusFilter] = useState('Tất cả');
  const [chargerDraft, setChargerDraft] = useState<Charger>(mockChargers[0]);
  const [isChargerEditorOpen, setIsChargerEditorOpen] = useState(false);
  const [chargerPendingStatusChange, setChargerPendingStatusChange] = useState<Charger | null>(
    null,
  );
  const chargerStatusCounts = useMemo(
    () => ({
      available: chargers.filter((charger) => charger.status === 'Khả dụng').length,
      charging: chargers.filter((charger) => charger.status === 'Đang sạc').length,
      booked: chargers.filter((charger) => charger.status === 'Đã đặt').length,
      faulty: chargers.filter((charger) => charger.status === 'Báo lỗi').length,
    }),
    [chargers],
  );
  const handleSaveCharger = () => {
    setChargers((previousChargers) =>
      chargerDraft.id
        ? previousChargers.map((charger) =>
            charger.id === chargerDraft.id ? chargerDraft : charger,
          )
        : [
            ...previousChargers,
            { ...chargerDraft, id: String(previousChargers.length + 1).padStart(2, '0') },
          ],
    );
    setIsChargerEditorOpen(false);
  };
  return (
    <div className="hub-operations__page">
      <HubPageHeader
        title={'Quản lý cổng sạc · ' + hub.name}
        sub={
          <>
            <Link to="/hubs/manage">Hub & hạ tầng</Link>　{icons.next}　{hub.name}　{icons.next}
            　Cổng sạc
          </>
        }
        action={
          <button
            className="hub-action hub-action--primary"
            onClick={() => {
              setChargerDraft({
                id: '',
                connector: 'Type 2',
                power: '7.4 kW',
                status: 'Khả dụng',
                session: '—',
              });
              setIsChargerEditorOpen(true);
            }}
          >
            {icons.add} Thêm cổng sạc
          </button>
        }
      />
      <div className="hub-operations__kpi-row">
        <div className="hub-operations__kpi">
          <span>Tổng số cổng</span>
          <b>{chargers.length}</b>
        </div>
        <div className="hub-operations__kpi">
          <span>Khả dụng</span>
          <b className="hub-text--success">{chargerStatusCounts.available}</b>
        </div>
        <div className="hub-operations__kpi">
          <span>Đang sạc</span>
          <b className="hub-text--info">{chargerStatusCounts.charging}</b>
        </div>
        <div className="hub-operations__kpi">
          <span>Đã đặt</span>
          <b>{chargerStatusCounts.booked}</b>
        </div>
        <div className="hub-operations__kpi">
          <span>Báo lỗi</span>
          <b className="hub-text--danger">{chargerStatusCounts.faulty}</b>
        </div>
      </div>
      <section className="hub-panel hub-operations__table-card">
        <div className="hub-operations__toolbar">
          <div>
            <h2 className="hub-panel__title">Danh sách cổng sạc</h2>
            <p className="hub-page-header__subtitle">
              Theo dõi đầu sạc, công suất và phiên sử dụng hiện tại
            </p>
          </div>
          <select
            value={chargerStatusFilter}
            onChange={(e) => setChargerStatusFilter(e.target.value)}
          >
            <option>Tất cả</option>
            <option>Khả dụng</option>
            <option>Đang sạc</option>
            <option>Đã đặt</option>
            <option>Báo lỗi</option>
          </select>
        </div>
        <div className="hub-operations__table-wrap">
          <table className="hub-operations__table">
            <thead>
              <tr>
                <th>CỔNG</th>
                <th>ĐẦU SẠC</th>
                <th>CÔNG SUẤT</th>
                <th>TRẠNG THÁI</th>
                <th>PHIÊN HIỆN TẠI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {chargers
                .filter(
                  (charger) =>
                    chargerStatusFilter === 'Tất cả' || charger.status === chargerStatusFilter,
                )
                .map((charger) => (
                  <tr key={charger.id}>
                    <td>
                      <b>#{charger.id}</b>
                    </td>
                    <td>{charger.connector}</td>
                    <td>{charger.power}</td>
                    <td>
                      <HubStatusBadge value={charger.status} />
                    </td>
                    <td>{charger.session}</td>
                    <td>
                      <div className="hub-operations__row-actions">
                        <button
                          onClick={() => {
                            setChargerDraft(charger);
                            setIsChargerEditorOpen(true);
                          }}
                        >
                          Cấu hình
                        </button>
                        <button
                          className="hub-operations__danger-text"
                          onClick={() => setChargerPendingStatusChange(charger)}
                        >
                          {charger.status === 'Báo lỗi' ? 'Đã sửa' : 'Bảo trì'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      {isChargerEditorOpen && (
        <HubOperationModal
          title={chargerDraft.id ? 'Cấu hình cổng #' + chargerDraft.id : 'Thêm cổng sạc'}
          close={() => setIsChargerEditorOpen(false)}
        >
          <div className="hub-operations__form-grid">
            <HubFormField label="Loại đầu sạc">
              <select
                value={chargerDraft.connector}
                onChange={(e) => setChargerDraft({ ...chargerDraft, connector: e.target.value })}
              >
                <option>Type 2</option>
                <option>GB/T</option>
                <option>CCS2</option>
              </select>
            </HubFormField>
            <HubFormField label="Công suất">
              <select
                value={chargerDraft.power}
                onChange={(e) => setChargerDraft({ ...chargerDraft, power: e.target.value })}
              >
                <option>3.5 kW</option>
                <option>7.4 kW</option>
                <option>11 kW</option>
                <option>22 kW</option>
              </select>
            </HubFormField>
            <HubFormField label="Trạng thái">
              <select
                value={chargerDraft.status}
                onChange={(e) => setChargerDraft({ ...chargerDraft, status: e.target.value })}
              >
                <option>Khả dụng</option>
                <option>Đang sạc</option>
                <option>Đã đặt</option>
                <option>Báo lỗi</option>
              </select>
            </HubFormField>
          </div>
          <div className="hub-operations__modal-actions">
            <button
              className="hub-action hub-action--soft"
              onClick={() => setIsChargerEditorOpen(false)}
            >
              Hủy
            </button>
            <button className="hub-action hub-action--primary" onClick={handleSaveCharger}>
              Lưu cấu hình
            </button>
          </div>
        </HubOperationModal>
      )}
      {chargerPendingStatusChange && (
        <HubOperationModal
          title="Cập nhật trạng thái cổng sạc"
          close={() => setChargerPendingStatusChange(null)}
        >
          <p className="hub-operations__confirm-copy">
            Cổng #{chargerPendingStatusChange.id} sẽ được chuyển sang trạng thái{' '}
            {chargerPendingStatusChange.status === 'Báo lỗi' ? 'Khả dụng' : 'Báo lỗi'}.
          </p>
          <div className="hub-operations__modal-actions">
            <button
              className="hub-action hub-action--soft"
              onClick={() => setChargerPendingStatusChange(null)}
            >
              Hủy
            </button>
            <button
              className="hub-action hub-action--primary"
              onClick={() => {
                setChargers((previousChargers) =>
                  previousChargers.map((charger) =>
                    charger.id === chargerPendingStatusChange.id
                      ? {
                          ...charger,
                          status: charger.status === 'Báo lỗi' ? 'Khả dụng' : 'Báo lỗi',
                          session: '—',
                        }
                      : charger,
                  ),
                );
                setChargerPendingStatusChange(null);
              }}
            >
              Xác nhận
            </button>
          </div>
        </HubOperationModal>
      )}
    </div>
  );
}
