import { icons } from '../../../assets/icons';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mtApi } from '../../../api/mtApi';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { progressLabel, resourceLabel, time } from '../../../shared/format';
import type { MaintenanceOrder, MaintenanceTicket, RepairProgress } from '../types';
import { Button, Feedback, Field, Notice, useAction } from '../../../shared/ui';
import { terminal } from '../utils/maintenance';

export default function ProgressForm({
  ticket,
  order,
}: {
  ticket: MaintenanceTicket;
  order: MaintenanceOrder;
}) {
  const state = useDemoState();
  const action = useAction();
  const resource = state.resources.find((r) => r.id === ticket.resourceId)!;
  const [progress, setProgress] = useState<RepairProgress>('DONE');
  const [notes, setNotes] = useState(ticket.notes);
  const closed = terminal(ticket);
  return (
    <section className="ui-panel mt-tech-main" data-figma-node="400:2927">
      <h1>Cập nhật tình trạng bảo trì · {ticket.resourceId}</h1>
      <p className="ui-subtitle">
        Phiếu {ticket.id} · lệnh #{order.id}
      </p>
      {closed ? (
        <Notice tone={ticket.progress === 'DONE' ? 'success' : 'warning'}>
          {ticket.progress === 'DONE'
            ? 'Đã ghi nhận hoàn tất. Tài nguyên chỉ sẵn sàng sau bước xác minh cảm biến.'
            : 'Tài nguyên đã ngừng sử dụng và không được mở lại.'}{' '}
          Trạng thái: {resourceLabel[resource.status]}.
        </Notice>
      ) : (
        <>
          <h2 className="mt-field-label">Trạng thái bảo trì</h2>
          <div className="mt-progress-options">
            {(['REPAIRING', 'WAITING_PARTS', 'DONE', 'UNREPAIRABLE'] as const).map(
              (value, index) => (
                <button
                  type="button"
                  className={`ui-choice ${value === 'DONE' ? 'mt-done-choice' : ''}`}
                  key={value}
                  aria-pressed={progress === value}
                  onClick={() => setProgress(value)}
                >
                  {[icons.wrench, icons.parts, icons.check, icons.stop][index]}{' '}
                  {progressLabel[value]}
                </button>
              ),
            )}
          </div>
        </>
      )}
      <h2 className="mt-field-label">Tiến trình</h2>
      <ol className="mt-progress-timeline">
        {ticket.timeline.map((event, index) => (
          <li key={index}>
            {time(event.at)} · {event.message}
          </li>
        ))}
      </ol>
      <div className="mt-verification">
        <h2>Xác minh tự động sau khi xác nhận “Hoàn tất”</h2>
        <p>
          Lệnh bảo trì đóng khi mọi {resource.kind === 'VEHICLE' ? 'xe' : 'tài nguyên'} trong lệnh
          đã xử lý xong · {resource.kind === 'VEHICLE' ? 'xe' : 'tài nguyên'} chuyển “Khóa bảo trì”
          → “Chờ kiểm tra” → hệ thống kiểm tra tình trạng thực tế
        </p>
        <div className="ui-grid-2">
          {[
            {
              ok: resource.telemetryFresh && !state.deviceOffline,
              label: 'Dữ liệu cảm biến mới, không báo lỗi',
              detail: resource.telemetryFresh ? 'Đã có dữ liệu mô phỏng' : 'Chưa có dữ liệu mới',
            },
            {
              ok: resource.correctHub,
              label: `Vị trí đúng Hub ${state.hubs.find((h) => h.id === resource.hubId)?.shortName}`,
              detail: resource.correctHub ? 'Đúng vị trí' : 'Cần xác minh vị trí',
            },
            {
              ok: resource.kind === 'PORT' || resource.battery >= 20,
              label: resource.kind === 'PORT' ? 'Kiểm tra nguồn và kết nối' : 'Mức pin ≥ 20%',
              detail: resource.kind === 'PORT' ? 'Thiết bị sạc' : `Hiện tại ${resource.battery}%`,
            },
            {
              ok: !state.incidents.some(
                (i) =>
                  i.resourceId === resource.id && i.orderId !== order.id && i.status !== 'CLOSED',
              ),
              label: 'Không còn sự cố / phiếu mở khác',
              detail: 'Phiếu liên kết đóng khi hoàn tất sửa chữa',
            },
          ].map((check) => (
            <div className="mt-check" key={check.label}>
              <span className={`mt-check__icon mt-check__icon--${check.ok ? 'ok' : 'bad'}`}>
                {check.ok ? icons.check : icons.close}
              </span>
              <div>
                <strong>{check.label}</strong>
                <small>{check.detail}</small>
              </div>
            </div>
          ))}
        </div>
        <Notice tone="warning">
          {resource.kind === 'VEHICLE' && resource.battery < 20
            ? 'Kết quả dự kiến: pin dưới ngưỡng → xe chuyển “Cần sạc”, vào hàng đợi sạc và thông báo cho Đơn vị vận hành.'
            : 'Chỉ chuyển “Sẵn sàng” khi dữ liệu cảm biến và vị trí hợp lệ, không còn sự cố mở.'}
        </Notice>
      </div>
      <details className="mt-ticket-details">
        <summary>Thông tin phiếu & linh kiện đã lưu</summary>
        <p>{ticket.diagnosis}</p>
        <p>{ticket.repairItems.join(' · ')}</p>
        {ticket.parts.map((part, index) => (
          <p key={index}>
            {part.name} · {part.code} · SL: {part.quantity}
          </p>
        ))}
        {!!ticket.photos.length && (
          <div className="mt-photo-list">
            {ticket.photos.map((photo, i) => (
              <img key={i} src={photo} alt={`Ảnh bảo trì ${i + 1}`} />
            ))}
          </div>
        )}
      </details>
      {!closed && (
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void action.run(
              () => mtApi.updateProgress(ticket.id, progress, notes),
              () => action.setSuccess('Đã cập nhật tình trạng bảo trì.'),
            );
          }}
        >
          <div className="mt-progress-submit">
            <Field label="Ghi chú cho Đơn vị vận hành">
              <input
                required
                maxLength={1000}
                placeholder="Mô tả công việc đã thực hiện hoặc lý do chờ linh kiện…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={action.pending}>
              {action.pending
                ? 'Đang lưu…'
                : progress === 'DONE'
                  ? 'Xác nhận hoàn tất'
                  : 'Lưu cập nhật'}
            </Button>
          </div>
        </form>
      )}
      <Feedback action={action} />
      {resource.status === 'PENDING_CHECK' && (
        <Notice tone="neutral">
          Trong demo, phát phản hồi cảm biến từ <Link to="/setup">điều khiển demo</Link> để xác minh
          trạng thái tiếp theo.
        </Notice>
      )}
    </section>
  );
}
