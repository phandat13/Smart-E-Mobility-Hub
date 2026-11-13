import { icons } from '../../../assets/icons';
import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  mockHubShortages,
  mockRecommendations,
  mockOccupancyTrend,
  mockSimulationHistory,
} from '../../../mocks/si/simulations';
import SimulationHeader from '../components/SimulationHeader';
import SimulationStatistic from '../components/SimulationStatistic';
import SimulationTag from '../components/SimulationTag';
import '../styles/what-if.css';
export function SimulationResultsPage() {
  const [activeSimulationId, setActiveSimulationId] = useState('SIM-0710-05');
  const navigate = useNavigate();
  return (
    <div className="what-if-simulation">
      <SimulationHeader
        title="Kết quả mô phỏng · Tan học + Metro 17h"
        sub="Lần chạy #SIM-0710-05 · hoàn tất 16:46:30"
      >
        <SimulationTag tone="purple">
          {icons.snapshot} Snapshot 16:45:02 · dữ liệu thật không đổi
        </SimulationTag>
      </SimulationHeader>
      <div className="what-if-simulation__stats">
        <SimulationStatistic
          label="Tỉ lệ đáp ứng thuê/trả"
          value="82%"
          detail="Hiện tại 96% · giảm 14 điểm"
          tone="red"
        />
        <SimulationStatistic
          label="Hub nguy cơ quá tải"
          value="2 Hub"
          detail="Ga Metro 98% · KTX Khu B 95%"
          tone="orange"
        />
        <SimulationStatistic
          label="Xe thiếu hụt"
          value="23 xe"
          detail="Đỉnh điểm T+30 phút"
          tone="red"
        />
        <SimulationStatistic label="Khung mô phỏng" value="60 phút" detail="17:00–18:00 · 3 Hub" />
      </div>
      <div className="what-if-simulation__results-grid">
        <section className="what-if-simulation__card what-if-simulation__analysis">
          <h2>Số xe thiếu hụt theo Hub</h2>
          <p>Tại thời điểm đỉnh T+30 phút</p>
          <div className="what-if-simulation__shortages">
            {mockHubShortages.map((result) => (
              <div className="what-if-simulation__shortage" key={result.hub}>
                <b>{result.hub}</b>
                <div className="what-if-simulation__shortage-track">
                  <i
                    className={'what-if-simulation__shortage-fill--' + result.tone}
                    style={
                      {
                        '--simulation-shortage-width': (Math.abs(result.value) / 14) * 100 + '%',
                      } as CSSProperties
                    }
                  />
                </div>
                <strong className={'what-if-simulation__shortage-text--' + result.tone}>
                  {result.label}
                </strong>
              </div>
            ))}
          </div>
          <h3>Nguy cơ lấp đầy bến đỗ theo thời gian</h3>
          <div className="what-if-simulation__bars">
            {mockOccupancyTrend.map((result) => (
              <div className="what-if-simulation__bar-wrap" key={result.t}>
                <b>{result.v}%</b>
                <i
                  className={
                    result.v >= 93
                      ? 'what-if-simulation__bar--critical'
                      : result.v >= 88
                        ? 'what-if-simulation__bar--warning'
                        : ''
                  }
                  style={{ '--simulation-occupancy-height': result.v + '%' } as CSSProperties}
                />
                <small>{result.t}</small>
              </div>
            ))}
          </div>
        </section>
        <div className="what-if-simulation__results-side">
          <section className="what-if-simulation__card what-if-simulation__recommendations">
            <h2>Khuyến nghị điều phối (3)</h2>
            <p>Chỉ trở thành thao tác thật qua SI05</p>
            {mockRecommendations.map((recommendation) => (
              <div className="what-if-simulation__recommendation" key={recommendation.id}>
                <span>{recommendation.type === 'move' ? icons.transfer : icons.charging}</span>
                <div>
                  <b>{recommendation.title}</b>
                  <small>{recommendation.detail}</small>
                </div>
              </div>
            ))}
            <button
              className="what-if-simulation__button what-if-simulation__button--primary what-if-simulation__wide"
              onClick={() => navigate('/simulations/SIM-0710-05/apply')}
            >
              Áp dụng khuyến nghị (SI05)
            </button>
          </section>
          <section className="what-if-simulation__card what-if-simulation__history">
            <h2>Lịch sử mô phỏng</h2>
            {mockSimulationHistory.map((result) => (
              <button
                key={result.id}
                className={
                  activeSimulationId === result.id
                    ? 'what-if-simulation__history-item--selected'
                    : ''
                }
                onClick={() => setActiveSimulationId(result.id)}
              >
                <b>#{result.id}</b>
                <strong>{result.name}</strong>
                <SimulationTag>{result.tag}</SimulationTag>
              </button>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
