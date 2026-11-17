import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { bookingLabel, date, money, shortConnector, time } from '../../../shared/format';
import { Badge, Button, Empty, Feedback, Notice, Summary, useAction } from '../../../shared/ui';
import { invoice } from '../domain';
import '../styles/pv.css';
import ScanDialog from '../components/ScanDialog';
import ExtensionDialog from '../components/ExtensionDialog';

export function SessionPage() {
  const { id } = useParams();
  const state = useDemoState();
  const navigate = useNavigate();
  const location = useLocation();
  const action = useAction();
  const [scan, setScan] = useState<'in' | 'out'>();
  const b = state.bookings.find((item) => item.id === id);
  if (!b)
    return (
      <main className="pv-page ui-panel">
        <Empty title="Không tìm thấy phiên" to="/pv/sessions" action="Xem danh sách phiên" />
      </main>
    );
  const vehicle = state.vehicles.find((v) => v.id === b.vehicleId) ?? b.vehicleSnapshot!;
  const hub = state.hubs.find((h) => h.id === b.hubId)!;
  const port = hub.ports.find((p) => p.id === b.portId);
  const cost = invoice(b, state.now);
  const active = b.status === 'IN_USE';
  const closed = ['COMPLETED', 'EXPIRED', 'CANCELLED'].includes(b.status);
  return (
    <main className="pv-page" data-figma-node="400:1387">
      <div className="ui-page-heading">
        <div>
          <p className="ui-eyebrow">PHIÊN ĐỖ & SẠC</p>
          <h1>
            {b.id} · {hub.shortName}
          </h1>
        </div>
        <Link className="ui-link" to="/pv/sessions">
          {icons.back} Các phiên của tôi
        </Link>
      </div>
      <div className="pv-book-layout">
        <section className="ui-panel pv-session-main">
          <Badge
            tone={
              active || b.status === 'COMPLETED' ? 'green' : b.status === 'EXPIRED' ? 'red' : 'blue'
            }
          >
            {icons.dot} {bookingLabel[b.status]}
          </Badge>
          <h2>
            Ô {b.slotId}
            {b.portId
              ? ` · Cổng sạc #${b.portId} (${shortConnector(port?.connector ?? vehicle.connector)}${port ? ` · ${port.power} kW` : ''})`
              : ' · Chỉ đỗ xe'}
          </h2>
          {b.service !== 'PARK' && (
            <div className="pv-battery">
              <div>
                <span>Mức pin xe {vehicle.plate}</span>
                <strong>{b.battery}% → 90%</strong>
              </div>
              <progress value={b.battery} max="100" aria-label="Mức pin hiện tại" />
            </div>
          )}
          <div className="ui-grid-3 pv-stats">
            <article>
              <span>Điện năng đã sạc</span>
              <strong>{b.energy.toFixed(2)} kWh</strong>
            </article>
            <article>
              <span>Đã sử dụng</span>
              <strong>{b.checkedInAt ? cost.minutes : 0} phút</strong>
            </article>
            <article>
              <span>Kết thúc lúc</span>
              <strong>{time(b.endAt)}</strong>
            </article>
          </div>
          <h3>Diễn biến phiên</h3>
          <ol className="pv-timeline">
            {b.timeline.map((event, index) => (
              <li key={`${index}-${event.at}`}>
                <span className="pv-timeline__icon">{icons.check}</span>
                <div>
                  <strong>{event.message}</strong>
                  <small>
                    {time(event.at)} · {event.detail ?? date(event.at)}
                  </small>
                </div>
              </li>
            ))}
            {!closed && (
              <li>
                <span className="pv-timeline__icon pv-timeline__icon--pending">
                  {active ? '3' : '2'}
                </span>
                <div>
                  <strong>{active ? 'Check-out' : 'Check-in tại Hub'}</strong>
                  <small>
                    {active
                      ? 'Quét mã để kết thúc phiên khi rời Hub'
                      : 'Xác thực QR, Hub và biển số để bắt đầu sử dụng'}
                  </small>
                </div>
              </li>
            )}
          </ol>
          <Feedback action={action} />
          <div className="ui-actions pv-session-actions">
            {b.status === 'BOOKED' && (
              <>
                <Link className="ui-button ui-button--soft" to={`/pv/bookings/${b.id}/qr`}>
                  Xem mã QR
                </Link>
                <Button onClick={() => setScan('in')}>Check-in – quét mã tại Hub</Button>
              </>
            )}
            {active && (
              <>
                <Button tone="soft" onClick={() => navigate(`/pv/sessions/${b.id}/extend`)}>
                  {icons.timer} Gia hạn thời gian
                </Button>
                <Button onClick={() => setScan('out')}>Check-out – quét mã kết thúc</Button>
              </>
            )}
            {closed && (
              <Link className="ui-button ui-button--primary" to="/pv/book">
                Đặt chỗ mới
              </Link>
            )}
          </div>
          {active && (
            <p className="pv-caption">
              Yêu cầu gia hạn cần gửi trước giờ kết thúc ít nhất 15 phút.
            </p>
          )}
        </section>
        <aside className="ui-panel pv-session-cost">
          <h2>{b.status === 'COMPLETED' ? 'Tóm tắt chi phí' : 'Khi check-out'}</h2>
          <p className="ui-subtitle">
            Hệ thống gửi yêu cầu kết thúc phiên tới thiết bị, nhận điện năng tiêu thụ & thời lượng
            thực tế rồi gửi tới dịch vụ thanh toán mô phỏng.
          </p>
          <Summary
            rows={[
              ['Phí đỗ (tạm tính)', money(cost.park)],
              [
                `Phí sạc ${b.energy.toFixed(2)} kWh${b.status === 'COMPLETED' ? '' : ' (tạm tính)'}`,
                money(cost.charge),
              ],
              [
                b.status === 'COMPLETED' ? 'Tổng chi phí mô phỏng' : 'Tổng tạm tính',
                <span className="pv-primary">{money(b.cost ?? cost.total)}</span>,
              ],
            ]}
          />
          <Notice tone="warning">
            Thiết bị không phản hồi → trạng thái phiên giữ nguyên, hệ thống ghi nhận sự cố và báo
            Đơn vị vận hành.
          </Notice>
          <Notice tone="neutral">
            Sau check-out, ô đỗ & cổng sạc chuyển “Chờ kiểm tra” và chỉ mở lại khi dữ liệu cảm biến
            được xác minh.
          </Notice>
          {b.resourcePending && (
            <Notice tone="warning">
              Tài nguyên đang chờ kiểm tra. Có thể mô phỏng phản hồi cảm biến trong{' '}
              <Link to="/setup">điều khiển demo</Link>.
            </Notice>
          )}
          {b.status === 'COMPLETED' && (
            <Notice tone="success">
              Đã gửi chi phí tới thanh toán mô phỏng. Không phát sinh giao dịch tiền thật.
            </Notice>
          )}
        </aside>
      </div>
      {scan && <ScanDialog booking={b} mode={scan} close={() => setScan(undefined)} />}
      {location.pathname.endsWith('/extend') && (
        <ExtensionDialog
          booking={b}
          close={() => navigate(`/pv/sessions/${b.id}`, { replace: true })}
        />
      )}
    </main>
  );
}
