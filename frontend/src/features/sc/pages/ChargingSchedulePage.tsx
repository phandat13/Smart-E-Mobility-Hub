import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ChargingScheduleHeader from '../components/ChargingScheduleHeader';
import '../styles/charging-schedule.css';
import ChargingBattery from '../components/ChargingBattery';
import ChargingSchedulePill from '../components/ChargingSchedulePill';
import { mockChargingSchedules } from '../../../mocks/sc/chargingSchedules';
export function ChargingSchedulePage() {
  const [chargingSchedules] = useState(mockChargingSchedules);
  const [selectedHub, setSelectedHub] = useState('Tất cả Hub');
  const [selectedTimeRange, setSelectedTimeRange] = useState('10:00 – 14:00');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScheduleConfirmed, setIsScheduleConfirmed] = useState(false);
  const [draftHub, setDraftHub] = useState('Tất cả Hub');
  const unansweredRequestCount = chargingSchedules.filter(
    (schedule) => schedule.charger === '—',
  ).length;
  const scheduledVehicles = chargingSchedules.filter((schedule) => schedule.charger !== '—');
  const filteredSchedules = chargingSchedules.filter(
    (schedule) => selectedHub === 'Tất cả Hub' || schedule.hub === selectedHub,
  );
  const handleCreateSchedule = () => {
    setIsCreateModalOpen(false);
    setIsScheduleConfirmed(false);
  };
  return (
    <div className="charging-schedule">
      <ChargingScheduleHeader
        title="Lập lịch sạc thông minh"
        sub="Ưu tiên theo mức pin, nhu cầu sử dụng sắp tới và năng lực cổng sạc khả dụng"
      >
        <select value={selectedHub} onChange={(e) => setSelectedHub(e.target.value)}>
          <option>Tất cả Hub</option>
          <option>KTX Khu A</option>
          <option>KTX Khu B</option>
          <option>Ga Metro ĐHQG</option>
        </select>
        <select value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)}>
          <option>10:00 – 14:00</option>
          <option>14:00 – 18:00</option>
          <option>18:00 – 22:00</option>
        </select>
        <button className="charging-schedule__primary" onClick={() => setIsCreateModalOpen(true)}>
          {icons.charging} Tạo lịch
        </button>
      </ChargingScheduleHeader>
      <div className="charging-schedule__kpis">
        <article>
          <span>Xe có nhu cầu sạc</span>
          <b>18 xe</b>
          <small>Pin &lt; 40% hoặc có đặt sẵn tới</small>
        </article>
        <article>
          <span>Cổng sạc khả dụng</span>
          <b>22 cổng</b>
          <small>6 Hub · 3 cổng lỗi đã loại</small>
        </article>
        <article>
          <span>Đã xếp lịch</span>
          <b>{scheduledVehicles.length + 9} xe</b>
          <small className="charging-schedule__success-text">Hoàn tất trước cao điểm 17:00</small>
        </article>
        <article>
          <span>Chưa đáp ứng</span>
          <b className="charging-schedule__warning-text">{unansweredRequestCount} yêu cầu</b>
          <small className="charging-schedule__warning-text">Không đủ cổng trong khung giờ</small>
        </article>
      </div>
      <section className="charging-schedule__panel">
        <div className="charging-schedule__panel-title">
          <div>
            <h2>Lịch sạc đề xuất</h2>
            <p>Bản nháp do hệ thống tính toán · chờ Đơn vị vận hành xác nhận</p>
          </div>
          {isScheduleConfirmed && (
            <ChargingSchedulePill tone="green">Đã xác nhận lịch sạc</ChargingSchedulePill>
          )}
        </div>
        <div className="charging-schedule__table-scroll">
          <table className="charging-schedule__table">
            <thead>
              <tr>
                <th>ƯU TIÊN</th>
                <th>XE</th>
                <th>HUB</th>
                <th>PIN HIỆN TẠI</th>
                <th>NHU CẦU SẮP TỚI</th>
                <th>CỔNG</th>
                <th>KHUNG GIỜ</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((schedule) => (
                <tr key={schedule.vehicle}>
                  <td>
                    <ChargingSchedulePill
                      tone={
                        schedule.priority < 3 ? 'red' : schedule.priority < 5 ? 'yellow' : 'blue'
                      }
                    >
                      {schedule.charger === '—' ? '—' : schedule.priority}
                    </ChargingSchedulePill>
                  </td>
                  <td>{schedule.vehicle}</td>
                  <td>{schedule.hub}</td>
                  <td>
                    <ChargingBattery value={schedule.battery} />
                  </td>
                  <td>{schedule.demand}</td>
                  <td className={schedule.charger === '—' ? 'charging-schedule__danger-text' : ''}>
                    {schedule.charger}
                  </td>
                  <td>
                    {schedule.charger === '—' ? (
                      <ChargingSchedulePill tone="yellow">Chưa đáp ứng</ChargingSchedulePill>
                    ) : (
                      schedule.start + ' – ' + schedule.end
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="charging-schedule__panel-footer">
          <div className="charging-schedule__warning">
            {' '}
            {unansweredRequestCount
              ? icons.warning +
                ' ' +
                chargingSchedules
                  .filter((schedule) => schedule.charger === '—')
                  .map((schedule) => schedule.vehicle + ' (' + schedule.hub + ')')
                  .join(' và ') +
                ' chưa được đáp ứng: hết cổng tương thích trong khung giờ.'
              : '✓ Tất cả yêu cầu đã được xếp lịch.'}
          </div>
          <div className="charging-schedule__footer-actions">
            <Link className="charging-schedule__secondary" to="/charging-schedules/adjust">
              Điều chỉnh (SC02)
            </Link>
            <button
              className="charging-schedule__primary"
              onClick={() => setIsScheduleConfirmed(true)}
              disabled={isScheduleConfirmed}
            >
              {isScheduleConfirmed ? 'Đã xác nhận' : 'Xác nhận lịch sạc'}
            </button>
          </div>
        </div>
      </section>
      {isCreateModalOpen && (
        <div className="charging-schedule__modal-backdrop">
          <section className="charging-schedule__modal">
            <h2>Tạo lịch sạc thông minh</h2>
            <p>Hệ thống sẽ tính toán lịch dựa trên mức pin, nhu cầu và công suất cổng sạc.</p>
            <label>
              Phạm vi Hub
              <select value={draftHub} onChange={(e) => setDraftHub(e.target.value)}>
                <option>Tất cả Hub</option>
                <option>KTX Khu A</option>
                <option>KTX Khu B</option>
              </select>
            </label>
            <label>
              Khung giờ
              <select>
                <option>10:00 – 14:00</option>
                <option>14:00 – 18:00</option>
              </select>
            </label>
            <div className="charging-schedule__modal-actions">
              <button
                className="charging-schedule__secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Hủy
              </button>
              <button className="charging-schedule__primary" onClick={handleCreateSchedule}>
                Tính toán lịch
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
