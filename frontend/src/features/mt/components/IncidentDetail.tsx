import { useState } from 'react';
import { mtApi } from '../../../api/mtApi';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { date, priorityLabel, progressLabel, resourceTitle, time } from '../../../shared/format';
import { Badge, Button, Feedback, Notice, useAction } from '../../../shared/ui';
import { priorityTone, queueStatus, type Queued } from '../utils/incidentQueue';

export default function IncidentDetail({
  incident,
  assign,
  accepted,
}: {
  incident: Queued;
  assign: () => void;
  accepted: () => void;
}) {
  const state = useDemoState();
  const action = useAction();
  const notesAction = useAction();
  const [notes, setNotes] = useState(incident.notes ?? '');
  const [saved, setSaved] = useState(false);
  const resource = state.resources.find((r) => r.id === incident.resourceId);
  const hub = state.hubs.find((h) => h.id === incident.hubId);
  const order = state.orders.find((o) => o.id === incident.orderId);
  const technician = state.technicians.find((t) => t.id === incident.technicianId);
  const ticket = state.tickets.find(
    (t) => t.orderId === incident.orderId && t.resourceId === incident.resourceId,
  );
  const status = queueStatus(incident, state);
  const steps: { title: string; detail: string }[] = [
    {
      title: 'Ticket được tạo',
      detail: `${time(incident.createdAt)} · ${incident.source === 'SYSTEM' ? 'Hệ thống' : 'Sinh viên báo cáo'}`,
    },
  ];
  if (order)
    steps.push({
      title: 'Đã phân công',
      detail: `${time(order.createdAt)} · ${technician?.name ?? '—'}`,
    });
  if (ticket)
    steps.push({
      title:
        ticket.progress === 'DONE'
          ? 'Sửa chữa hoàn tất'
          : ticket.progress === 'UNREPAIRABLE'
            ? 'Ngừng sử dụng tài nguyên'
            : 'Đang kiểm tra thiết bị',
      detail: `${time(ticket.timeline[ticket.timeline.length - 1].at)} · ${ticket.progress === 'DONE' || ticket.progress === 'UNREPAIRABLE' ? progressLabel[ticket.progress] : 'Đang thực hiện'}`,
    });
  if (incident.acceptedAt)
    steps.push({
      title: 'Nghiệm thu & đóng phiếu',
      detail: `${time(incident.acceptedAt)} · Đơn vị vận hành`,
    });
  const canAssign = incident.status === 'OPEN' && resource?.status === 'FAULTY';
  const canAccept =
    incident.status === 'CLOSED' &&
    !incident.acceptedAt &&
    !!resource &&
    !['FAULTY', 'MAINTENANCE_LOCKED', 'PENDING_CHECK'].includes(resource.status);
  return (
    <>
      <h2>Chi tiết Ticket #{incident.id}</h2>
      <div className="mt-ticket-pills">
        <Badge tone={priorityTone[incident.priority]}>
          Mức {priorityLabel[incident.priority].toLocaleLowerCase('vi')}
        </Badge>
        <Badge tone={status === 'Đã đóng' ? 'green' : 'blue'}>{status}</Badge>
      </div>
      <div className="mt-ticket-info">
        <p className="ui-eyebrow">THÔNG TIN SỰ CỐ</p>
        <h3>{incident.category}</h3>
        <ul>
          <li>Thiết bị: {resource ? resourceTitle(resource) : incident.resourceId}</li>
          <li>Khu vực: {hub?.shortName ?? '—'}</li>
          <li>
            Phát hiện: {time(incident.createdAt)} · {date(incident.createdAt)}
          </li>
          <li>Người phụ trách: {technician?.name ?? 'Chưa phân công'}</li>
          <li>
            Nguồn: {incident.source === 'SYSTEM' ? 'Hệ thống giám sát' : 'Sinh viên báo cáo (MT01)'}
          </li>
        </ul>
        <p className="mt-description">{incident.description}</p>
        {!!incident.photos.length && (
          <div className="mt-photo-list">
            {incident.photos.map((photo, index) => (
              <a key={index} href={photo} target="_blank" rel="noreferrer">
                <img src={photo} alt={`Ảnh báo cáo ${index + 1}`} />
              </a>
            ))}
          </div>
        )}
      </div>
      <p className="ui-eyebrow mt-ticket-label">TIẾN TRÌNH XỬ LÝ</p>
      <ol className="mt-ticket-steps">
        {steps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <small>{step.detail}</small>
          </li>
        ))}
      </ol>
      <label className="mt-ticket-notes">
        <span className="ui-eyebrow mt-ticket-label">GHI CHÚ XỬ LÝ</span>
        <textarea
          rows={3}
          maxLength={1000}
          placeholder="Ghi chú cho các bước xử lý tiếp theo…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          onBlur={() => {
            if (notes.trim() !== (incident.notes ?? ''))
              void notesAction.run(
                () => mtApi.saveIncidentNotes(incident.id, notes),
                () => setSaved(true),
              );
          }}
        />
      </label>
      {saved && (
        <small className="mt-saved" role="status">
          Đã lưu ghi chú
        </small>
      )}
      <Feedback action={notesAction} />
      <Feedback action={action} />
      {incident.status === 'OPEN' && resource?.status !== 'FAULTY' && (
        <Notice tone="warning">
          Tài nguyên đang được sử dụng hoặc đã bị khóa. Chỉ tạo lệnh khi tài nguyên ở trạng thái Báo
          lỗi.
        </Notice>
      )}
      {incident.status === 'CLOSED' && !canAccept && !incident.acceptedAt && (
        <Notice tone="neutral">
          Đã sửa chữa xong. Nghiệm thu sau khi dữ liệu cảm biến xác minh tài nguyên.
        </Notice>
      )}
      <div className="mt-ticket-actions">
        <Button disabled={!canAssign} onClick={assign}>
          Tạo phiếu & phân công KTV
        </Button>
        <Button
          tone="secondary"
          disabled={!canAccept || action.pending}
          onClick={() => void action.run(() => mtApi.acceptIncident(incident.id), accepted)}
        >
          Nghiệm thu & đóng phiếu
        </Button>
      </div>
    </>
  );
}
