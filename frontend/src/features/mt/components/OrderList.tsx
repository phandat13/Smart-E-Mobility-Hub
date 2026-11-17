import { useDemoState } from '../../../mocks/pv-mt/store';
import { date, time } from '../../../shared/format';
import { Badge } from '../../../shared/ui';

export default function OrderList() {
  const state = useDemoState();
  return (
    <section className="ui-panel mt-order-list">
      <h2>Lệnh bảo trì</h2>
      {!state.orders.length ? (
        <p className="ui-subtitle">
          Chưa có lệnh. Phân công một phiếu sự cố hoặc chọn tài nguyên để tạo lệnh mới.
        </p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>MÃ LỆNH</th>
                <th>TÀI NGUYÊN</th>
                <th>KỸ THUẬT VIÊN</th>
                <th>HẠN XỬ LÝ</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {state.orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.resourceIds.join(', ')}</td>
                  <td>{state.technicians.find((t) => t.id === order.technicianId)?.name}</td>
                  <td>
                    {time(order.dueAt)} · {date(order.dueAt)}
                  </td>
                  <td>
                    <Badge tone={order.status === 'CLOSED' ? 'green' : 'amber'}>
                      {order.status === 'CLOSED' ? 'Đã đóng' : 'Đang xử lý'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
