import { icons } from '../../../assets/icons';
import { Link, useParams } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { resourceLabel, resourceTitle } from '../../../shared/format';
import { Empty, Notice, Summary } from '../../../shared/ui';
import '../styles/mt.css';

export function IncidentReceivedPage() {
  const { id } = useParams();
  const state = useDemoState();
  const incident = state.incidents.find((i) => i.id === id);
  if (!incident)
    return (
      <main className="mt-report ui-panel">
        <Empty title="Không tìm thấy báo cáo" to="/incidents/new" action="Báo cáo sự cố" />
      </main>
    );
  const resource = state.resources.find((r) => r.id === incident.resourceId)!;
  return (
    <main className="mt-received ui-panel" data-figma-node="400:1021">
      <div className="mt-success" aria-hidden="true">
        {icons.check}
      </div>
      <h1>Đã tiếp nhận báo cáo sự cố</h1>
      <p className="ui-subtitle">Cảm ơn bạn đã phản ánh! Vui lòng lưu mã phiếu để đối soát.</p>
      <div className="mt-received__code">
        <small>MÃ PHIẾU SỰ CỐ</small>
        <strong>#{incident.id}</strong>
      </div>
      <Summary
        rows={[
          ['Đối tượng', resourceTitle(resource)],
          ['Loại lỗi', incident.category],
          [
            'Trạng thái tài nguyên',
            <span className="mt-flag-text">
              {resource.status === 'FAULTY'
                ? 'Gắn cờ cảnh báo – ngừng cho đặt'
                : resourceLabel[resource.status]}
            </span>,
          ],
        ]}
      />
      <Notice>
        Phiếu đã được chuyển vào hàng đợi giám sát của Đơn vị vận hành. Nếu sự cố đã được người khác
        báo trước, phản hồi của bạn được liên kết vào phiếu hiện có.
      </Notice>
      <Link className="ui-button ui-button--primary pv-full" to="/pv">
        Về trang chủ
      </Link>
    </main>
  );
}
