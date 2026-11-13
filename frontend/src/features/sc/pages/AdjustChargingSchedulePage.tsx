import { icons } from '../../../assets/icons';
import { useState, useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import ChargingScheduleHeader from '../components/ChargingScheduleHeader';
import '../styles/charging-schedule.css';
import { mockChargerLanes, createMockChargingTimeline } from '../../../mocks/sc/chargingSchedules';
import { timeToMinutes } from '../utils/time';
export function AdjustChargingSchedulePage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState('UG-047');
  const [selectedCharger, setSelectedCharger] = useState('#05');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:15');
  const [chargingPriority, setChargingPriority] = useState('2');
  const [isScheduleSaved, setIsScheduleSaved] = useState(false);
  const timelineSessions = useMemo(
    () => createMockChargingTimeline(startTime, endTime),
    [startTime, endTime],
  );
  const chargerLanes = mockChargerLanes;
  const getTimelineOffset = (time: string) =>
    Math.max(0, Math.min(100, ((timeToMinutes(time) - 600) / 240) * 100));
  const getSessionWidth = (fromTime: string, toTime: string) =>
    Math.max(4, ((timeToMinutes(toTime) - timeToMinutes(fromTime)) / 240) * 100);
  const hasInvalidTimeRange =
    timeToMinutes(startTime) >= timeToMinutes(endTime) ||
    timeToMinutes(startTime) < 600 ||
    timeToMinutes(endTime) > 840;
  const handleSaveSchedule = () => {
    setIsScheduleSaved(true);
  };
  return (
    <div className="charging-schedule">
      <ChargingScheduleHeader
        title="Điều chỉnh lịch sạc · KTX Khu A"
        sub="Lịch #LS-0710-03 đang áp dụng · kéo thả hoặc sửa trực tiếp thời điểm / thứ tự ưu tiên"
      >
        <Link
          className="charging-schedule__secondary charging-schedule__back"
          to="/charging-schedules"
        >
          {icons.back} Quay lại lịch đề xuất
        </Link>
      </ChargingScheduleHeader>
      <div className="charging-schedule__adjust-layout">
        <section className="charging-schedule__timeline">
          <div className="charging-schedule__time-head">
            <span />
            <b>10:00</b>
            <b>11:00</b>
            <b>12:00</b>
            <b>13:00</b>
            <b>14:00</b>
          </div>
          <div className="charging-schedule__lanes">
            {chargerLanes.map((chargerLane) => (
              <div className="charging-schedule__lane" key={chargerLane}>
                <strong>Cổng {chargerLane}</strong>
                <div className="charging-schedule__lane-track">
                  {[0, 1, 2, 3, 4].map((hourIndex) => (
                    <i
                      className="charging-schedule__hour-line"
                      style={{ '--charging-hour-offset': hourIndex * 25 + '%' } as CSSProperties}
                      key={hourIndex}
                    />
                  ))}
                  {timelineSessions
                    .filter((session) => session.port === chargerLane)
                    .map((session, sessionIndex) => (
                      <button
                        key={sessionIndex}
                        className={
                          'charging-schedule__block charging-schedule__block--' + session.tone
                        }
                        style={
                          {
                            '--charging-block-offset': getTimelineOffset(session.from) + '%',
                            '--charging-block-width':
                              getSessionWidth(session.from, session.to) + '%',
                          } as CSSProperties
                        }
                        onClick={() => {
                          if (session.vehicle.startsWith('UG-'))
                            setSelectedVehicleId(session.vehicle);
                        }}
                      >
                        <b>{session.vehicle}</b>
                        {session.tone === 'selected' && (
                          <small>
                            {startTime} – {endTime} (mới)
                          </small>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="charging-schedule__editor">
          <h2>Điều chỉnh {selectedVehicleId}</h2>
          <p>Pin 27% · nhu cầu dự báo cao 13:00</p>
          <label>
            Cổng sạc
            <select value={selectedCharger} onChange={(e) => setSelectedCharger(e.target.value)}>
              <option>#05 · Type 2 · 3.3 kW</option>
              <option>#03 · Type 2 · 7.4 kW</option>
              <option>#06 · Type 2 · 7.4 kW</option>
            </select>
          </label>
          <div className="charging-schedule__two-fields">
            <label>
              Bắt đầu
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setIsScheduleSaved(false);
                }}
              />
            </label>
            <label>
              Kết thúc
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setIsScheduleSaved(false);
                }}
              />
            </label>
          </div>
          <label>
            Thứ tự ưu tiên
            <select value={chargingPriority} onChange={(e) => setChargingPriority(e.target.value)}>
              <option value="1">1 (trước: 2)</option>
              <option value="2">2 (trước: 3)</option>
              <option value="3">3 (trước: 4)</option>
              <option value="4">4 (trước: 5)</option>
            </select>
          </label>
          <h3>Kiểm tra với năng lực cổng sạc</h3>
          <div
            className={
              hasInvalidTimeRange
                ? 'charging-schedule__check charging-schedule__check--bad'
                : 'charging-schedule__check'
            }
          >
            {hasInvalidTimeRange
              ? '⚠ Khung giờ không hợp lệ. Vui lòng chọn thời gian trong 10:00–14:00.'
              : '✓ Không xung đột: cổng ' +
                selectedCharger +
                ' trống ' +
                startTime +
                ' – ' +
                endTime +
                ', tổng công suất Hub trong giới hạn.'}
          </div>
          <h3>Thay đổi so với lịch hiện tại</h3>
          <div className="charging-schedule__change">
            <span>{selectedVehicleId} khung giờ</span>
            <b>
              10:15 {icons.forward} {startTime}
            </b>
          </div>
          <div className="charging-schedule__change">
            <span>{selectedVehicleId} ưu tiên</span>
            <b>
              3 {icons.forward} {chargingPriority}
            </b>
          </div>
          <div className="charging-schedule__note">
            {isScheduleSaved
              ? 'Đã lưu thay đổi vào bản nháp lịch sạc.'
              : 'Lỗi lưu lịch → giữ nguyên lịch cũ và thông báo.'}
          </div>
          <div className="charging-schedule__editor-actions">
            <button
              className="charging-schedule__secondary"
              onClick={() => {
                setStartTime('10:15');
                setEndTime('11:30');
                setChargingPriority('3');
                setIsScheduleSaved(false);
              }}
            >
              Hoàn tác
            </button>
            <button
              className="charging-schedule__primary"
              disabled={hasInvalidTimeRange}
              onClick={handleSaveSchedule}
            >
              Xác nhận thay đổi
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
