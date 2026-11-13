import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockHubs } from '../../../mocks/mo/hubOperations';
import type { Hub } from '../types/hubOperations';
import HubStatusBadge from '../components/HubStatusBadge';
import HubPageHeader from '../components/HubPageHeader';
import HubOperationModal from '../components/HubOperationModal';
import HubFormField from '../components/HubFormField';
import '../styles/network-overview.css';
import '../styles/hub-operations.css';
export function HubManagementPage() {
  const [hubs, setHubs] = useState(mockHubs);
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [hubStatusFilter, setHubStatusFilter] = useState('Tất cả');
  const [hubDraft, setHubDraft] = useState<Hub>(mockHubs[0]);
  const [hubEditorMode, setHubEditorMode] = useState('');
  const [hubPendingStatusChange, setHubPendingStatusChange] = useState<Hub | null>(null);
  const filteredHubs = hubs.filter(
    (hub) =>
      (hubStatusFilter === 'Tất cả' || hub.status === hubStatusFilter) &&
      [hub.name, hub.area, hub.id].join(' ').toLowerCase().includes(hubSearchQuery.toLowerCase()),
  );
  const handleCreateHub = () => {
    setHubDraft({
      id: 'hub-' + Date.now(),
      name: '',
      type: 'Ký túc xá',
      area: 'Khu Đông',
      address: '',
      capacity: 30,
      vehicles: 0,
      chargers: 4,
      activeChargers: 4,
      status: 'Hoạt động',
    });
    setHubEditorMode('create');
  };
  const handleSaveHub = () => {
    if (!hubDraft.name.trim() || !hubDraft.address.trim()) return;
    setHubs((previousHubs) =>
      hubEditorMode === 'create'
        ? [...previousHubs, hubDraft]
        : previousHubs.map((hub) => (hub.id === hubDraft.id ? hubDraft : hub)),
    );
    setHubEditorMode('');
  };
  const handleToggleHubStatus = () => {
    if (!hubPendingStatusChange) return;
    setHubs((previousHubs) =>
      previousHubs.map((hub) =>
        hub.id === hubPendingStatusChange.id
          ? { ...hub, status: hub.status === 'Ngưng hoạt động' ? 'Hoạt động' : 'Ngưng hoạt động' }
          : hub,
      ),
    );
    setHubPendingStatusChange(null);
  };
  return (
    <div className="hub-operations__page">
      <HubPageHeader
        title="Quản lý thông tin Hub"
        sub={hubs.length + ' Hub trong hệ thống · Thêm mới, cập nhật hoặc ngưng hoạt động'}
        action={
          <button className="hub-action hub-action--primary" onClick={handleCreateHub}>
            {icons.add} Thêm Hub mới
          </button>
        }
      />
      <section className="hub-panel hub-operations__table-card">
        <div className="hub-operations__toolbar">
          <input
            className="hub-operations__search"
            placeholder="⌕  Tìm theo tên, mã Hub..."
            value={hubSearchQuery}
            onChange={(e) => setHubSearchQuery(e.target.value)}
          />
          <select value={hubStatusFilter} onChange={(e) => setHubStatusFilter(e.target.value)}>
            <option>Tất cả</option>
            <option>Hoạt động</option>
            <option>Bảo trì</option>
            <option>Ngưng hoạt động</option>
          </select>
        </div>
        <div className="hub-operations__table-wrap">
          <table className="hub-operations__table">
            <thead>
              <tr>
                <th>MÃ HUB / TÊN HUB</th>
                <th>KHU VỰC</th>
                <th>LOẠI HUB</th>
                <th>CHỖ ĐỖ</th>
                <th>CỔNG SẠC</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredHubs.map((hub) => (
                <tr key={hub.id}>
                  <td>
                    <Link className="hub-operations__primary-link" to={'/hubs/' + hub.id}>
                      {hub.name}
                    </Link>
                    <small>{hub.id.toUpperCase()}</small>
                  </td>
                  <td>{hub.area}</td>
                  <td>{hub.type}</td>
                  <td>
                    {hub.vehicles} / {hub.capacity}
                  </td>
                  <td>
                    {hub.activeChargers} / {hub.chargers}
                  </td>
                  <td>
                    <HubStatusBadge value={hub.status} />
                  </td>
                  <td>
                    <div className="hub-operations__row-actions">
                      <button
                        onClick={() => {
                          setHubDraft(hub);
                          setHubEditorMode('edit');
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        className="hub-operations__danger-text"
                        onClick={() => setHubPendingStatusChange(hub)}
                      >
                        {hub.status === 'Ngưng hoạt động' ? 'Kích hoạt' : 'Ngưng'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredHubs.length && (
            <div className="hub-empty-state">Không tìm thấy Hub phù hợp.</div>
          )}
        </div>
      </section>
      {(hubEditorMode === 'create' || hubEditorMode === 'edit') && (
        <HubOperationModal
          title={hubEditorMode === 'create' ? 'Thêm Hub mới' : 'Chỉnh sửa thông tin Hub'}
          close={() => setHubEditorMode('')}
        >
          <div className="hub-operations__form-grid">
            <HubFormField label="Tên Hub">
              <input
                value={hubDraft.name}
                onChange={(e) => setHubDraft({ ...hubDraft, name: e.target.value })}
                placeholder="VD: KTX Khu C"
              />
            </HubFormField>
            <HubFormField label="Loại Hub">
              <select
                value={hubDraft.type}
                onChange={(e) => setHubDraft({ ...hubDraft, type: e.target.value })}
              >
                <option>Ký túc xá</option>
                <option>Trường học</option>
                <option>Khu dịch vụ</option>
              </select>
            </HubFormField>
            <HubFormField label="Khu vực">
              <select
                value={hubDraft.area}
                onChange={(e) => setHubDraft({ ...hubDraft, area: e.target.value })}
              >
                <option>Khu Đông</option>
                <option>Khu Trung tâm</option>
                <option>Khu Tây</option>
              </select>
            </HubFormField>
            <HubFormField label="Địa chỉ">
              <input
                value={hubDraft.address}
                onChange={(e) => setHubDraft({ ...hubDraft, address: e.target.value })}
                placeholder="Địa chỉ Hub"
              />
            </HubFormField>
            <HubFormField label="Sức chứa chỗ đỗ">
              <input
                type="number"
                min="1"
                value={hubDraft.capacity}
                onChange={(e) => setHubDraft({ ...hubDraft, capacity: Number(e.target.value) })}
              />
            </HubFormField>
            <HubFormField label="Số cổng sạc">
              <input
                type="number"
                min="0"
                value={hubDraft.chargers}
                onChange={(e) =>
                  setHubDraft({
                    ...hubDraft,
                    chargers: Number(e.target.value),
                    activeChargers: Number(e.target.value),
                  })
                }
              />
            </HubFormField>
          </div>
          <div className="hub-operations__modal-actions">
            <button className="hub-action hub-action--soft" onClick={() => setHubEditorMode('')}>
              Hủy
            </button>
            <button
              className="hub-action hub-action--primary"
              disabled={!hubDraft.name.trim() || !hubDraft.address.trim()}
              onClick={handleSaveHub}
            >
              Lưu thông tin
            </button>
          </div>
        </HubOperationModal>
      )}
      {hubPendingStatusChange && (
        <HubOperationModal
          title={
            hubPendingStatusChange.status === 'Ngưng hoạt động'
              ? 'Kích hoạt lại Hub?'
              : 'Ngưng hoạt động Hub?'
          }
          close={() => setHubPendingStatusChange(null)}
        >
          <p className="hub-operations__confirm-copy">
            Bạn có chắc muốn thay đổi trạng thái của <b>{hubPendingStatusChange.name}</b>?
          </p>
          <div className="hub-operations__modal-actions">
            <button
              className="hub-action hub-action--soft"
              onClick={() => setHubPendingStatusChange(null)}
            >
              Quay lại
            </button>
            <button className="hub-action hub-action--primary" onClick={handleToggleHubStatus}>
              Xác nhận
            </button>
          </div>
        </HubOperationModal>
      )}
    </div>
  );
}
