import { type ImbalanceAlert } from '../types';
import '../rb.css';

interface Props {
  alert: ImbalanceAlert | null;
  onCreateOrder: (alert: ImbalanceAlert) => void;
}

const clock = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '';

export default function SuggestionBanner({ alert, onCreateOrder }: Props) {
  const reco = alert?.recommendation;
  if (!alert || !reco) return null;
  return (
    <div className="rebalance__banner" role="status">
      <div>
        <div className="rebalance__banner-title">
          Đề xuất: {reco.fromHubName} → {reco.toHubName} · {reco.suggestedVehicleCount} xe
        </div>
        <div className="rebalance__banner-meta">
          {alert.detectedAt && <span>Phát hiện {clock(alert.detectedAt)} · nguồn: cảnh báo hệ thống</span>}
          <span>hoặc khuyến nghị từ kết quả mô phỏng SI</span>
        </div>
      </div>
      <button type="button" className="rebalance__btn" onClick={() => onCreateOrder(alert)}>
        Tạo lệnh điều chuyển
      </button>
    </div>
  );
}
