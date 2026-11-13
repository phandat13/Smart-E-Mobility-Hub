import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mockHubs, mockChargers, createMockParkingSlots } from '../../../mocks/mo/hubOperations';
import HubStatusBadge from '../components/HubStatusBadge';
import HubPageHeader from '../components/HubPageHeader';
import '../styles/network-overview.css';
import '../styles/hub-operations.css';
export function HubDetailPage() {
  const { hubId = 'ktx-a' } = useParams();
  const hub = mockHubs.find((h) => h.id === hubId) || mockHubs[0];
  const [selectedParkingSlotId, setSelectedParkingSlotId] = useState('');
  const parkingSlots = createMockParkingSlots(hub.capacity);
  return (
    <div className="hub-operations__page">
      <HubPageHeader
        title={'Chi tiết Hub · ' + hub.name}
        sub={
          <>
            <Link to="/hubs/manage">Hub & hạ tầng</Link>　{icons.next}　Trạng thái chi tiết · Cập
            nhật lúc 09:42:10
          </>
        }
        action={
          <div className="hub-operations__actions">
            <Link className="hub-action hub-action--soft" to="/hubs/manage">
              Quản lý Hub
            </Link>
            <Link className="hub-action hub-action--primary" to={'/hubs/' + hub.id + '/chargers'}>
              Quản lý cổng sạc
            </Link>
          </div>
        }
      />
      <div className="hub-operations__detail-grid">
        <aside className="hub-panel hub-operations__summary">
          <div className="hub-operations__summary-title">
            <h2>{hub.name}</h2>
            <HubStatusBadge value={hub.status} />
          </div>
          <div className="hub-operations__map-placeholder">
            <span>{icons.location}</span>
            <b>{hub.name}</b>
            <small>{hub.address}</small>
          </div>
          {[
            ['Loại Hub', hub.type],
            ['Xe tại Hub', hub.vehicles + ' xe'],
            ['Chỗ đỗ', Math.min(hub.vehicles + 4, hub.capacity) + ' / ' + hub.capacity + ' có xe'],
            ['Cổng sạc', hub.activeChargers + ' / ' + hub.chargers + ' hoạt động'],
            ['Cập nhật', '09:42:10'],
          ].map(([label, value]) => (
            <div className="hub-operations__summary-row" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <h3 className="hub-operations__section-label">Cảnh báo đang mở</h3>
          <div className="hub-operations__alert hub-operations__alert--danger">
            {icons.warning} Cổng #04 báo lỗi E-CHG-02 – ngừng nhận phiên sạc.
          </div>
          <div className="hub-operations__alert hub-operations__alert--warning">
            {icons.battery} UG-040 pin 16% – cần sạc.
          </div>
        </aside>
        <section className="hub-panel hub-operations__parking">
          <div className="hub-operations__card-heading">
            <div>
              <h2>Sơ đồ chỗ đỗ · {hub.capacity} vị trí</h2>
              <p>Chọn một vị trí để xem trạng thái tài nguyên</p>
            </div>
            <div className="hub-operations__legend">
              <span>
                <i className="hub-operations__legend--occupied" />
                Có xe
              </span>
              <span>
                <i className="hub-operations__legend--empty" />
                Trống
              </span>
              <span>
                <i className="hub-operations__legend--reserved" />
                Đã đặt
              </span>
              <span>
                <i className="hub-operations__legend--fault" />
                Lỗi
              </span>
            </div>
          </div>
          <div className="hub-operations__slot-grid">
            {parkingSlots.map((parkingSlot) => (
              <button
                key={parkingSlot.id}
                onClick={() => setSelectedParkingSlotId(parkingSlot.id)}
                className={
                  'hub-operations__slot hub-operations__slot--' +
                  parkingSlot.state +
                  (selectedParkingSlotId === parkingSlot.id
                    ? ' hub-operations__slot--selected'
                    : '')
                }
              >
                <b>{parkingSlot.id}</b>
                <small>
                  {parkingSlot.state === 'empty'
                    ? 'Trống'
                    : parkingSlot.state === 'fault'
                      ? 'Lỗi'
                      : parkingSlot.state === 'reserved'
                        ? 'Đã đặt'
                        : 'Có xe'}
                </small>
              </button>
            ))}
          </div>
          {selectedParkingSlotId && (
            <div className="hub-operations__selected">
              <b>{selectedParkingSlotId}</b>
              <span>Trạng thái vị trí được cập nhật theo dữ liệu IoT mới nhất.</span>
              <button
                className="hub-operations__text-btn"
                onClick={() => setSelectedParkingSlotId('')}
              >
                Bỏ chọn
              </button>
            </div>
          )}
          <div className="hub-operations__card-heading hub-operations__charger-heading">
            <div>
              <h2>Trạng thái cổng sạc</h2>
              <p>
                {hub.activeChargers} cổng đang hoạt động · {hub.chargers - hub.activeChargers} cổng
                cần kiểm tra
              </p>
            </div>
            <Link className="hub-operations__text-btn" to={'/hubs/' + hub.id + '/chargers'}>
              Xem tất cả {icons.forward}
            </Link>
          </div>
          <div className="hub-operations__mini-chargers">
            {mockChargers.slice(0, 4).map((charger) => (
              <div key={charger.id}>
                <b>Cổng #{charger.id}</b>
                <HubStatusBadge value={charger.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
