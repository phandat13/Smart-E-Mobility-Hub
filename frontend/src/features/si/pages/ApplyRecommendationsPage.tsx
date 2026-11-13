import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockRecommendations, mockSelectedRecommendationIds } from '../../../mocks/si/simulations';
import SimulationHeader from '../components/SimulationHeader';
import SimulationTag from '../components/SimulationTag';
import '../styles/what-if.css';
export function ApplyRecommendationsPage() {
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState(
    mockSelectedRecommendationIds,
  );
  const [areRecommendationsApplied, setAreRecommendationsApplied] = useState(false);
  const handleToggleRecommendation = (id: string) =>
    setSelectedRecommendationIds((previousRecommendationIds) =>
      previousRecommendationIds.includes(id)
        ? previousRecommendationIds.filter((recommendationId) => recommendationId !== id)
        : [...previousRecommendationIds, id],
    );
  const isRecommendationFeasible = (id: string) => id !== 'r2';
  return (
    <div className="what-if-simulation">
      <SimulationHeader
        title="Áp dụng khuyến nghị · #SIM-0710-05"
        sub="Kiểm tra lại từng khuyến nghị với trạng thái thực tế mới nhất trước khi thực hiện"
      >
        <SimulationTag tone="purple">Snapshot 16:45:02</SimulationTag>
      </SimulationHeader>
      <section className="what-if-simulation__card what-if-simulation__compare">
        <h2>So sánh trạng thái thực tế (16:58:40) với snapshot (16:45:02)</h2>
        <table>
          <thead>
            <tr>
              <th>CHỈ SỐ</th>
              <th>SNAPSHOT</th>
              <th>THỰC TẾ</th>
              <th>KHÁC BIỆT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Xe sẵn sàng tại Tòa VNU</td>
              <td>20</td>
              <td>18</td>
              <td>
                <SimulationTag tone="muted">−2 · nhỏ</SimulationTag>
              </td>
            </tr>
            <tr>
              <td>Xe sẵn sàng tại Thư viện TT</td>
              <td>10</td>
              <td>3</td>
              <td>
                <SimulationTag tone="yellow">−7 · đáng kể</SimulationTag>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <div className="what-if-simulation__valid what-if-simulation__compare-valid">
        Khác biệt tổng thể dưới ngưỡng – kết quả mô phỏng vẫn còn hiệu lực. (Nếu khác biệt lớn, hệ
        thống cảnh báo kết quả có thể lỗi thời và đề xuất chạy lại SI03.)
      </div>
      <div className="what-if-simulation__apply-grid">
        <section className="what-if-simulation__card what-if-simulation__feasibility">
          <h2>Kiểm tra tính khả thi</h2>
          <p>Chọn các khuyến nghị khả thi để áp dụng</p>
          {mockRecommendations.map((recommendation) => (
            <label
              key={recommendation.id}
              className={
                'what-if-simulation__rec-choice' +
                (!isRecommendationFeasible(recommendation.id)
                  ? ' what-if-simulation__rec-choice--disabled'
                  : '') +
                (selectedRecommendationIds.includes(recommendation.id)
                  ? ' what-if-simulation__rec-choice--checked'
                  : '')
              }
            >
              <input
                type="checkbox"
                checked={selectedRecommendationIds.includes(recommendation.id)}
                disabled={!isRecommendationFeasible(recommendation.id) || areRecommendationsApplied}
                onChange={() => handleToggleRecommendation(recommendation.id)}
              />
              <span className="what-if-simulation__rec-copy">
                <b>{recommendation.title}</b>
                <small>
                  {recommendation.id === 'r1'
                    ? '18 xe còn sẵn sàng · Ga Metro còn 14 chỗ trống'
                    : recommendation.id === 'r2'
                      ? 'Thư viện TT chỉ còn 3 xe sẵn sàng (cần 8)'
                      : '5 cổng hoạt động · không xung đột lịch'}
                </small>
                <em>
                  {recommendation.id === 'r1'
                    ? '→ Sẽ tạo lệnh điều chuyển (RB01)'
                    : recommendation.id === 'r2'
                      ? '→ Không thực hiện'
                      : '→ Sẽ điều chỉnh lịch sạc (SC02)'}
                </em>
              </span>
              <SimulationTag tone={isRecommendationFeasible(recommendation.id) ? 'green' : 'red'}>
                {isRecommendationFeasible(recommendation.id) ? '✓ Khả thi' : '× Không khả thi'}
              </SimulationTag>
            </label>
          ))}
          <button
            className="what-if-simulation__button what-if-simulation__button--primary what-if-simulation__wide"
            disabled={!selectedRecommendationIds.length || areRecommendationsApplied}
            onClick={() => setAreRecommendationsApplied(true)}
          >
            {areRecommendationsApplied
              ? 'Đã áp dụng ' + selectedRecommendationIds.length + ' khuyến nghị'
              : 'Áp dụng ' + selectedRecommendationIds.length + ' khuyến nghị đã chọn'}
          </button>
          {areRecommendationsApplied && (
            <div className="what-if-simulation__valid what-if-simulation__applied">
              {icons.check} Các thao tác khả thi đã được ghi nhận. Kết quả mô phỏng gốc không thay
              đổi.
            </div>
          )}
        </section>
        <aside className="what-if-simulation__card what-if-simulation__apply-log">
          <h2>Nhật ký áp dụng</h2>
          <p>Kết quả mô phỏng gốc không thay đổi</p>
          <div className="what-if-simulation__log-entry">
            <i>{icons.check}</i>
            <div>
              <b>
                {areRecommendationsApplied
                  ? 'Đã tạo lệnh #DC-0710-027'
                  : 'Đã tạo lệnh #DC-0710-027'}
              </b>
              <small>Tòa VNU {icons.forward} Ga Metro · 12 xe khóa điều chuyển</small>
            </div>
          </div>
          <div className="what-if-simulation__log-entry">
            <i>{icons.check}</i>
            <div>
              <b>Đã điều chỉnh lịch #LS-0710-03</b>
              <small>6 xe KTX A được nâng ưu tiên</small>
            </div>
          </div>
          <div className="what-if-simulation__log-entry what-if-simulation__log-entry--muted">
            <i>−</i>
            <div>
              <b>Bỏ qua 1 khuyến nghị</b>
              <small>Không khả thi trên trạng thái thực tế</small>
            </div>
          </div>
          <div className="what-if-simulation__log-note">
            Thao tác thất bại do tài nguyên vừa thay đổi sẽ không được áp dụng; các thao tác đã
            thành công được giữ nguyên và báo cáo chi tiết.
          </div>
          <Link
            className="what-if-simulation__button what-if-simulation__button--outline what-if-simulation__back-results"
            to="/simulations/SIM-0710-05/results"
          >
            Quay lại kết quả mô phỏng
          </Link>
        </aside>
      </div>
    </div>
  );
}
