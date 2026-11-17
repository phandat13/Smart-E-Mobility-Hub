import { Link } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { bookingLabel, date, serviceLabel, time } from '../../../shared/format';
import { Badge, Empty } from '../../../shared/ui';
import '../styles/pv.css';

export function SessionListPage() {
  const state = useDemoState();
  return (
    <main className="pv-page">
      <div className="ui-page-heading">
        <div>
          <p className="ui-eyebrow">PHIÊN ĐỖ & SẠC</p>
          <h1>Phiên đỗ & sạc của tôi</h1>
        </div>
        <Link className="ui-button ui-button--primary" to="/pv/book">
          + Đặt chỗ mới
        </Link>
      </div>
      <section className="ui-panel">
        {!state.bookings.length ? (
          <Empty title="Chưa có phiên đỗ / sạc" to="/pv/book" action="Đặt chỗ ngay" />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>MÃ ĐẶT CHỖ</th>
                  <th>PHƯƠNG TIỆN</th>
                  <th>HUB & THỜI GIAN</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {state.bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/pv/sessions/${b.id}`}>{b.id}</Link>
                      <small>{serviceLabel[b.service]}</small>
                    </td>
                    <td>
                      {
                        (state.vehicles.find((v) => v.id === b.vehicleId) ?? b.vehicleSnapshot)
                          ?.plate
                      }
                    </td>
                    <td>
                      {state.hubs.find((h) => h.id === b.hubId)?.shortName}
                      <small>
                        {time(b.startAt)} – {time(b.endAt)} · {date(b.startAt)}
                      </small>
                    </td>
                    <td>
                      <Badge
                        tone={
                          b.status === 'IN_USE' ? 'green' : b.status === 'EXPIRED' ? 'red' : 'blue'
                        }
                      >
                        {bookingLabel[b.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
