import { icons } from '../../../assets/icons';
import { Link } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { date, priorityLabel, progressLabel, time } from '../../../shared/format';
import { Badge, Empty } from '../../../shared/ui';
import '../styles/mt.css';

export function TechnicianListPage({
  history = false,
  ticketsOnly = false,
}: {
  history?: boolean;
  ticketsOnly?: boolean;
}) {
  const state = useDemoState();
  const orders = state.orders.filter(
    (o) =>
      o.technicianId === state.activeTechnicianId &&
      (history ? o.status === 'CLOSED' : o.status === 'OPEN'),
  );
  const tickets = state.tickets.filter((t) =>
    state.orders.some((o) => o.id === t.orderId && o.technicianId === state.activeTechnicianId),
  );
  return (
    <main className="mt-tech-list">
      <div className="ui-page-heading">
        <div>
          <p className="ui-eyebrow">ỨNG DỤNG KỸ THUẬT VIÊN</p>
          <h1>
            {history
              ? 'Lịch sử bảo trì'
              : ticketsOnly
                ? 'Phiếu bảo trì của tôi'
                : 'Lệnh bảo trì được phân công'}
          </h1>
          <p>Chỉ hiển thị công việc của kỹ thuật viên demo đang chọn.</p>
        </div>
        <Link className="ui-link" to="/setup">
          Đổi kỹ thuật viên demo
        </Link>
      </div>
      {ticketsOnly ? (
        <section className="ui-panel">
          {!tickets.length ? (
            <Empty
              title="Chưa có phiếu bảo trì"
              to="/tech/maintenance"
              action="Xem lệnh được giao"
            />
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>SỐ PHIẾU</th>
                    <th>TÀI NGUYÊN</th>
                    <th>LỆNH LIÊN KẾT</th>
                    <th>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/tech/maintenance/tickets/${t.id}`}>{t.id}</Link>
                      </td>
                      <td>{t.resourceId}</td>
                      <td>{t.orderId}</td>
                      <td>
                        <Badge
                          tone={
                            t.progress === 'DONE'
                              ? 'green'
                              : t.progress === 'UNREPAIRABLE'
                                ? 'red'
                                : 'amber'
                          }
                        >
                          {progressLabel[t.progress]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : !orders.length ? (
        <section className="ui-panel">
          <Empty title={history ? 'Chưa có lệnh đã đóng' : 'Chưa có lệnh được phân công'}>
            Tạo và phân công lệnh từ cổng vận hành để bắt đầu quy trình bảo trì.
          </Empty>
        </section>
      ) : (
        <div className="mt-tech-orders">
          {orders.map((o) => (
            <article className="ui-panel" key={o.id}>
              <Badge tone={o.priority === 'HIGH' ? 'red' : 'amber'}>
                Ưu tiên {priorityLabel[o.priority].toLowerCase()}
              </Badge>
              <h2>{o.id}</h2>
              <p className="ui-subtitle">
                Hạn {time(o.dueAt)} · {date(o.dueAt)} · {o.resourceIds.length} tài nguyên
              </p>
              {o.resourceIds.map((id) => {
                const ticket = state.tickets.find((t) => t.orderId === o.id && t.resourceId === id);
                return (
                  <Link
                    className="mt-order-link"
                    key={id}
                    to={
                      ticket
                        ? `/tech/maintenance/tickets/${ticket.id}`
                        : `/tech/maintenance/tickets/new/${o.id}/${id}`
                    }
                  >
                    <strong>{id}</strong>
                    <Badge tone={ticket?.progress === 'DONE' ? 'green' : 'blue'}>
                      {ticket ? progressLabel[ticket.progress] : `Lập phiếu ${icons.forward}`}
                    </Badge>
                  </Link>
                );
              })}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
