import { useParams } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { Empty } from '../../../shared/ui';
import '../styles/mt.css';
import Workspace from '../components/TechnicianWorkspace';
import TicketForm from '../components/TicketForm';

export function NewTicketPage() {
  const { orderId, resourceId } = useParams();
  const state = useDemoState();
  const order = state.orders.find(
    (o) =>
      o.id === orderId &&
      o.technicianId === state.activeTechnicianId &&
      o.resourceIds.includes(resourceId ?? ''),
  );
  if (!order || !resourceId)
    return (
      <main className="mt-tech-list ui-panel">
        <Empty
          title="Lệnh không tồn tại hoặc không thuộc kỹ thuật viên này"
          to="/tech/maintenance"
          action="Xem lệnh của tôi"
        />
      </main>
    );
  const existing = state.tickets.find((t) => t.orderId === order.id && t.resourceId === resourceId);
  if (existing)
    return (
      <Workspace order={order} selectedId={resourceId}>
        <section className="ui-panel">
          <Empty
            title="Tài nguyên đã có phiếu bảo trì"
            to={`/tech/maintenance/tickets/${existing.id}`}
            action="Mở phiếu hiện có"
          />
        </section>
      </Workspace>
    );
  return (
    <Workspace order={order} selectedId={resourceId}>
      <TicketForm key={`${order.id}-${resourceId}`} order={order} resourceId={resourceId} />
    </Workspace>
  );
}
