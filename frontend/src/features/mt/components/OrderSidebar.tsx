import { icons } from '../../../assets/icons';
import { Link } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { priorityLabel, progressLabel, time } from '../../../shared/format';
import type { MaintenanceOrder } from '../types';
import { Badge } from '../../../shared/ui';

export default function OrderSidebar({
  order,
  selectedId,
}: {
  order: MaintenanceOrder;
  selectedId: string;
}) {
  const state = useDemoState();
  return (
    <aside className="ui-panel mt-tech-sidebar">
      <h2>Lệnh bảo trì #{order.id}</h2>
      <p className="ui-subtitle">
        Ưu tiên {priorityLabel[order.priority].toLowerCase()} · hạn {time(order.dueAt)} ·{' '}
        {order.resourceIds.length}{' '}
        {order.resourceIds.every(
          (id) => state.resources.find((r) => r.id === id)?.kind === 'VEHICLE',
        )
          ? 'xe'
          : 'tài nguyên'}
      </p>
      <div className="ui-stacked">
        {order.resourceIds.map((id) => {
          const resource = state.resources.find((r) => r.id === id)!;
          const ticket = state.tickets.find((t) => t.orderId === order.id && t.resourceId === id);
          return (
            <Link
              className={`mt-tech-resource${id === selectedId ? ' mt-tech-resource--selected' : ''}`}
              key={id}
              to={
                ticket
                  ? `/tech/maintenance/tickets/${ticket.id}`
                  : `/tech/maintenance/tickets/new/${order.id}/${id}`
              }
            >
              <strong>
                {resource.kind === 'PORT' ? icons.plug : icons.scooter} {resource.id}
              </strong>
              <small>
                {resource.errorCode || 'Đã xử lý'} ·{' '}
                {state.hubs.find((h) => h.id === resource.hubId)?.shortName}
              </small>
              <Badge
                tone={
                  ticket?.progress === 'DONE'
                    ? 'green'
                    : ticket?.progress === 'UNREPAIRABLE'
                      ? 'red'
                      : ticket
                        ? 'amber'
                        : id === selectedId
                          ? 'blue'
                          : 'slate'
                }
              >
                {ticket
                  ? progressLabel[ticket.progress]
                  : id === selectedId
                    ? 'Đang lập phiếu'
                    : 'Chưa xử lý'}
              </Badge>
            </Link>
          );
        })}
      </div>
      <Link className="ui-link" to="/tech/maintenance">
        {icons.back} Danh sách lệnh
      </Link>
    </aside>
  );
}
