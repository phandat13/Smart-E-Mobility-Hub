import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  mockScenarioKinds,
  mockSavedScenarios,
  mockSimulationHubOptions,
  mockSelectedSimulationHubs,
} from '../../../mocks/si/simulations';
import type { ScenarioKind } from '../types';
import SimulationHeader from '../components/SimulationHeader';
import '../styles/what-if.css';
export function WhatIfScenarioPage() {
  const [selectedScenarioKind, setSelectedScenarioKind] = useState<ScenarioKind>('Đột biến tải');
  const [selectedHubNames, setSelectedHubNames] = useState(mockSelectedSimulationHubs);
  const [demandIncreasePercent, setDemandIncreasePercent] = useState(60);
  const [simulationDuration, setSimulationDuration] = useState('60 phút');
  const [scenarioName, setScenarioName] = useState('Tan học + tàu Metro cập ga 17h');
  const [scenarioDescription, setScenarioDescription] = useState(
    'Kiểm tra khả năng đáp ứng khi nhu cầu tăng 60% tại 3 Hub cửa ngõ.',
  );
  const [saveNotice, setSaveNotice] = useState('');
  const navigate = useNavigate();
  const handleToggleHub = (hubName: string) =>
    setSelectedHubNames((previousHubNames) =>
      previousHubNames.includes(hubName)
        ? previousHubNames.filter((selectedHubName) => selectedHubName !== hubName)
        : [...previousHubNames, hubName],
    );
  const handleSaveScenario = () => {
    setSaveNotice('Đã lưu cấu hình kịch bản vào danh sách kịch bản của bạn.');
  };
  const handleRunSimulation = () => navigate('/simulations/SIM-0710-05/results');
  return (
    <div className="what-if-simulation">
      <SimulationHeader
        title="Tạo kịch bản What-if"
        sub="Mô phỏng chạy trên bản sao trạng thái (snapshot) – tách biệt hoàn toàn dữ liệu vận hành thật"
      />
      <div className="what-if-simulation__create-grid">
        <section className="what-if-simulation__card what-if-simulation__config">
          <h2>1. Loại tình huống</h2>
          <div className="what-if-simulation__kind-grid">
            {mockScenarioKinds.map((scenarioKind) => (
              <button
                key={scenarioKind.name}
                className={
                  'what-if-simulation__kind' +
                  (selectedScenarioKind === scenarioKind.name
                    ? ' what-if-simulation__kind--selected'
                    : '')
                }
                onClick={() => setSelectedScenarioKind(scenarioKind.name)}
              >
                <span>{scenarioKind.icon}</span>
                <div>
                  <b>{scenarioKind.name}</b>
                  <small>{scenarioKind.desc}</small>
                </div>
              </button>
            ))}
          </div>
          <h2 className="what-if-simulation__section-gap">2. Tham số tình huống</h2>
          <label className="what-if-simulation__field-label">Hub áp dụng</label>
          <div className="what-if-simulation__hub-chips">
            {mockSimulationHubOptions.map((hubName) => (
              <button
                key={hubName}
                className={
                  selectedHubNames.includes(hubName)
                    ? 'what-if-simulation__chip what-if-simulation__chip--selected'
                    : 'what-if-simulation__chip'
                }
                onClick={() => handleToggleHub(hubName)}
              >
                {hubName}
                {selectedHubNames.includes(hubName) ? ' ' + icons.close : ''}
              </button>
            ))}
            <span className="what-if-simulation__chip what-if-simulation__chip--muted">
              + Chọn Hub
            </span>
          </div>
          <div className="what-if-simulation__slider-label">
            <b>Mức tăng nhu cầu thuê/trả</b>
            <strong>+{demandIncreasePercent}%</strong>
          </div>
          <input
            className="what-if-simulation__range"
            type="range"
            min="0"
            max="100"
            step="5"
            value={demandIncreasePercent}
            onChange={(e) => setDemandIncreasePercent(Number(e.target.value))}
          />
          <div className="what-if-simulation__param-grid">
            <label>
              Thời điểm bắt đầu
              <input type="datetime-local" defaultValue="2026-10-07T17:00" />
            </label>
            <div>
              <span className="what-if-simulation__field-label">Khung thời gian mô phỏng</span>
              <div className="what-if-simulation__duration">
                {['15 phút', '30 phút', '60 phút', '24 giờ'].map((durationOption) => (
                  <button
                    key={durationOption}
                    className={
                      simulationDuration === durationOption
                        ? 'what-if-simulation__duration-option--selected'
                        : ''
                    }
                    onClick={() => setSimulationDuration(durationOption)}
                  >
                    {durationOption}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="what-if-simulation__param-grid">
            <label>
              Giả định bổ sung
              <select>
                <option>Cổng #04 KTX A tiếp tục lỗi</option>
                <option>Không có sự cố bổ sung</option>
                <option>Mất điện tại Ga Metro</option>
              </select>
            </label>
            <label>
              Dữ liệu đầu vào
              <select>
                <option>Snapshot trạng thái hiện tại</option>
                <option>Snapshot lúc 16:45</option>
              </select>
            </label>
          </div>
          <div className="what-if-simulation__valid">
            {icons.check} Cấu hình hợp lệ và nằm trong phạm vi mô phỏng. Tham số không hợp lệ hoặc
            thiếu thông tin bắt buộc sẽ được đánh dấu tại từng trường.
          </div>
          {saveNotice && <div className="what-if-simulation__notice">{saveNotice}</div>}
          <div className="what-if-simulation__config-actions">
            <button
              className="what-if-simulation__button what-if-simulation__button--outline"
              onClick={handleSaveScenario}
            >
              {icons.save} Lưu kịch bản (SI02)
            </button>
            <button
              className="what-if-simulation__button what-if-simulation__button--primary"
              onClick={handleRunSimulation}
            >
              {icons.play} Chạy mô phỏng (SI03)
            </button>
          </div>
        </section>
        <aside className="what-if-simulation__card what-if-simulation__save-card">
          <h2>Lưu cấu hình kịch bản</h2>
          <label>
            Tên kịch bản
            <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
          </label>
          <label>
            Mô tả
            <textarea
              rows={3}
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
            />
          </label>
          <h3>Tóm tắt</h3>
          <div className="what-if-simulation__summary">
            <span>Loại</span>
            <b>{selectedScenarioKind}</b>
            <span>Phạm vi</span>
            <b>{selectedHubNames.length} Hub</b>
            <span>Khung thời gian</span>
            <b>{simulationDuration}</b>
            <span>Mức tăng</span>
            <b>+{demandIncreasePercent}%</b>
          </div>
          <h3>Kịch bản đã lưu</h3>
          {mockSavedScenarios.map((savedScenario) => (
            <button
              className="what-if-simulation__saved-item"
              key={savedScenario.name}
              onClick={() => {
                setScenarioName(savedScenario.name);
                setScenarioDescription(savedScenario.detail);
              }}
            >
              <b>{savedScenario.name}</b>
              <small>{savedScenario.detail}</small>
              <strong>{icons.next}</strong>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
