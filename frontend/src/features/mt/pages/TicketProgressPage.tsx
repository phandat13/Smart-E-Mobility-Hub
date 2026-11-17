import { useParams } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { Empty } from '../../../shared/ui';
import '../styles/mt.css';
import Workspace from '../components/TechnicianWorkspace';
import ProgressForm from '../components/ProgressForm';

export function TicketProgressPage() {
  const { id } = useParams();
  const state = useDemoState();
  const ticket = state.tickets.find((t) => t.id === id);
  const order = state.orders.find(
    (o) => o.id === ticket?.orderId && o.technicianId === state.activeTechnicianId,
  );
  if (!ticket || !order)
    return (
      <main className="mt-tech-list ui-panel">
        <Empty
          title="Không tìm thấy phiếu thuộc kỹ thuật viên này"
          to="/tech/maintenance"
          action="Xem lệnh của tôi"
        />
      </main>
    );
  return (
    <Workspace order={order} selectedId={ticket.resourceId}>
      <ProgressForm key={ticket.id} ticket={ticket} order={order} />
    </Workspace>
  );
}
