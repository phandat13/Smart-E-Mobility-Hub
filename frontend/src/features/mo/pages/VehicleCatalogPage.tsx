import { icons } from '../../../assets/icons';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { mockHubs, mockVehicles } from '../../../mocks/mo/hubOperations';
import type { Vehicle } from '../types/hubOperations';
import HubStatusBadge from '../components/HubStatusBadge';
import HubPageHeader from '../components/HubPageHeader';
import HubOperationModal from '../components/HubOperationModal';
import HubFormField from '../components/HubFormField';
import '../styles/network-overview.css';
import '../styles/hub-operations.css';
export function VehicleCatalogPage() {
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [vehicleHubFilter, setVehicleHubFilter] = useState('Tất cả');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('Tất cả');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('Tất cả');
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [isVehicleEditorOpen, setIsVehicleEditorOpen] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState<Vehicle>(mockVehicles[0]);
  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      (vehicleHubFilter === 'Tất cả' || vehicle.hub === vehicleHubFilter) &&
      (vehicleTypeFilter === 'Tất cả' || vehicle.type === vehicleTypeFilter) &&
      (vehicleStatusFilter === 'Tất cả' || vehicle.status === vehicleStatusFilter) &&
      (vehicle.id + ' ' + vehicle.hub).toLowerCase().includes(vehicleSearchQuery.toLowerCase()),
  );
  const handleSaveVehicle = () => {
    if (!vehicleDraft.id.trim()) return;
    setVehicles((previousVehicles) =>
      previousVehicles.some((vehicle) => vehicle.id === vehicleDraft.id)
        ? previousVehicles.map((vehicle) =>
            vehicle.id === vehicleDraft.id ? vehicleDraft : vehicle,
          )
        : [...previousVehicles, vehicleDraft],
    );
    setIsVehicleEditorOpen(false);
  };
  return (
    <div className="hub-operations__page">
      <HubPageHeader
        title="Danh mục phương tiện dùng chung"
        sub={vehicles.length + ' xe · lọc theo Hub / loại / trạng thái'}
        action={
          <button
            className="hub-action hub-action--primary"
            onClick={() => {
              setVehicleDraft({
                id: '',
                type: 'Xe đạp điện',
                battery: 100,
                hub: 'KTX Khu A',
                status: 'Sẵn sàng',
              });
              setIsVehicleEditorOpen(true);
            }}
          >
            {icons.add} Thêm xe mới
          </button>
        }
      />
      <section className="hub-panel hub-operations__table-card">
        <div className="hub-operations__toolbar hub-operations__toolbar--wrap">
          <input
            className="hub-operations__search"
            placeholder="⌕  Tìm mã xe..."
            value={vehicleSearchQuery}
            onChange={(e) => setVehicleSearchQuery(e.target.value)}
          />
          <select value={vehicleHubFilter} onChange={(e) => setVehicleHubFilter(e.target.value)}>
            <option>Tất cả</option>
            {mockHubs.map((hub) => (
              <option key={hub.id}>{hub.name}</option>
            ))}
          </select>
          <select value={vehicleTypeFilter} onChange={(e) => setVehicleTypeFilter(e.target.value)}>
            <option>Tất cả</option>
            <option>Xe đạp điện</option>
            <option>Xe máy điện</option>
          </select>
          <select
            value={vehicleStatusFilter}
            onChange={(e) => setVehicleStatusFilter(e.target.value)}
          >
            <option>Tất cả</option>
            <option>Sẵn sàng</option>
            <option>Đang sử dụng</option>
            <option>Đang sạc</option>
            <option>Cần kiểm tra</option>
            <option>Bảo trì</option>
          </select>
        </div>
        <div className="hub-operations__table-wrap">
          <table className="hub-operations__table">
            <thead>
              <tr>
                <th>MÃ XE</th>
                <th>LOẠI</th>
                <th>PIN</th>
                <th>HUB</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <b>{vehicle.id}</b>
                  </td>
                  <td>{vehicle.type}</td>
                  <td>
                    <div className="hub-operations__battery">
                      <div>
                        <i
                          style={
                            { '--vehicle-battery-width': `${vehicle.battery}%` } as CSSProperties
                          }
                        />
                      </div>
                      <b>{vehicle.battery}%</b>
                    </div>
                  </td>
                  <td>{vehicle.hub}</td>
                  <td>
                    <HubStatusBadge value={vehicle.status} />
                  </td>
                  <td>
                    <button
                      className="hub-operations__row-action"
                      onClick={() => {
                        setVehicleDraft(vehicle);
                        setIsVehicleEditorOpen(true);
                      }}
                    >
                      Chỉnh sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredVehicles.length && (
            <div className="hub-empty-state">Không có phương tiện phù hợp.</div>
          )}
        </div>
      </section>
      {isVehicleEditorOpen && (
        <HubOperationModal
          title={vehicleDraft.id ? 'Cập nhật ' + vehicleDraft.id : 'Thêm phương tiện'}
          close={() => setIsVehicleEditorOpen(false)}
        >
          <div className="hub-operations__form-grid">
            <HubFormField label="Mã xe">
              <input
                value={vehicleDraft.id}
                disabled={vehicles.some((vehicle) => vehicle.id === vehicleDraft.id)}
                onChange={(e) =>
                  setVehicleDraft({ ...vehicleDraft, id: e.target.value.toUpperCase() })
                }
                placeholder="UG-100"
              />
            </HubFormField>
            <HubFormField label="Loại phương tiện">
              <select
                value={vehicleDraft.type}
                onChange={(e) => setVehicleDraft({ ...vehicleDraft, type: e.target.value })}
              >
                <option>Xe đạp điện</option>
                <option>Xe máy điện</option>
              </select>
            </HubFormField>
            <HubFormField label="Dung lượng pin (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={vehicleDraft.battery}
                onChange={(e) =>
                  setVehicleDraft({
                    ...vehicleDraft,
                    battery: Math.max(0, Math.min(100, Number(e.target.value))),
                  })
                }
              />
            </HubFormField>
            <HubFormField label="Hub hiện tại">
              <select
                value={vehicleDraft.hub}
                onChange={(e) => setVehicleDraft({ ...vehicleDraft, hub: e.target.value })}
              >
                {mockHubs.map((hub) => (
                  <option key={hub.id}>{hub.name}</option>
                ))}
              </select>
            </HubFormField>
            <HubFormField label="Trạng thái">
              <select
                value={vehicleDraft.status}
                onChange={(e) => setVehicleDraft({ ...vehicleDraft, status: e.target.value })}
              >
                <option>Sẵn sàng</option>
                <option>Đang sử dụng</option>
                <option>Đang sạc</option>
                <option>Cần kiểm tra</option>
                <option>Bảo trì</option>
              </select>
            </HubFormField>
          </div>
          <div className="hub-operations__modal-actions">
            <button
              className="hub-action hub-action--soft"
              onClick={() => setIsVehicleEditorOpen(false)}
            >
              Hủy
            </button>
            <button
              className="hub-action hub-action--primary"
              disabled={!vehicleDraft.id.trim()}
              onClick={handleSaveVehicle}
            >
              Lưu phương tiện
            </button>
          </div>
        </HubOperationModal>
      )}
    </div>
  );
}
