import { icons } from '../assets/icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { demoControls } from '../mocks/pv-mt/demoControls';
import { pvApi } from '../api/pvApi';
import { mtApi } from '../api/mtApi';
import { getStorageWarning, useDemoState } from '../mocks/pv-mt/store';
import { date, localDateTime, time } from '../shared/format';
import { Badge, Button, Feedback, Field, Modal, Notice, useAction } from '../shared/ui';
import './setup.css';

const MODULES = [
  {
    title: 'PV01–04 · Phương tiện cá nhân',
    detail: 'Quản lý xe, đặt chỗ, phiên đỗ / sạc và gia hạn.',
    to: '/pv/book',
  },
  {
    title: 'MT01 · Báo cáo sự cố',
    detail: 'Sinh viên / tài xế gửi báo cáo và nhận mã phiếu.',
    to: '/incidents/new',
  },
  {
    title: 'MT02–03 · Vận hành',
    detail: 'Hàng đợi sự cố, phân công và tạo lệnh bảo trì.',
    to: '/maintenance',
  },
  {
    title: 'MT04–05 · Kỹ thuật viên',
    detail: 'Lập phiếu và cập nhật tiến trình sửa chữa.',
    to: '/tech/maintenance',
  },
];

export default function SetupPage() {
  const state = useDemoState();
  const action = useAction();
  const [reset, setReset] = useState(false);
  const [clock, setClock] = useState(localDateTime(state.now));
  return (
    <main className="setup-page">
      <p className="setup-page__eyebrow">UniGo · PV / MT</p>
      <h1>UniGo · Demo PV / MT</h1>
      <p>
        Chọn cổng để trải nghiệm quy trình. Dữ liệu lưu trên trình duyệt; QR, thiết bị và thanh toán
        sử dụng môi trường mô phỏng. Chuyển cổng ở đây không phải đăng nhập hay phân quyền thực.
      </p>
      {getStorageWarning() && <Notice tone="warning">{getStorageWarning()}</Notice>}
      <div className="setup-page__modules">
        {MODULES.map((module) => (
          <article className="card" key={module.to}>
            <h2>{module.title}</h2>
            <p>{module.detail}</p>
            <Link to={module.to}>Mở cổng {icons.forward}</Link>
          </article>
        ))}
      </div>
      <section className="ui-panel ui-stacked">
        <div>
          <Badge>ĐIỀU KHIỂN DEMO</Badge>
          <h2>
            Đồng hồ: {time(state.now)} · {date(state.now)}
          </h2>
          <p className="ui-subtitle">
            Đồng hồ được giữ cố định để kiểm tra các quy tắc thời gian. Tăng thời gian sẽ cập nhật
            phiên sạc và tự hết hạn các lượt đặt trễ check-in.
          </p>
        </div>
        <div className="ui-grid-2">
          <Field label="Giờ demo mới (giờ Việt Nam)">
            <input
              type="datetime-local"
              value={clock}
              min={localDateTime(state.now)}
              onChange={(event) => setClock(event.target.value)}
            />
          </Field>
          <div className="ui-actions">
            <Button
              tone="secondary"
              disabled={action.pending || !clock}
              onClick={() =>
                void action.run(() =>
                  demoControls.setTime(new Date(`${clock}:00+07:00`).toISOString()),
                )
              }
            >
              Đặt đồng hồ
            </Button>
            <Button
              disabled={action.pending}
              onClick={() => void action.run(() => demoControls.advance(15))}
            >
              +15 phút
            </Button>
            <Button
              disabled={action.pending}
              onClick={() => void action.run(() => demoControls.advance(60))}
            >
              +1 giờ
            </Button>
          </div>
        </div>
        <div className="ui-grid-2">
          <label className="setup-toggle">
            <input
              type="checkbox"
              checked={state.deviceOffline}
              disabled={action.pending}
              onChange={(e) =>
                void action.run(() => demoControls.configure('deviceOffline', e.target.checked))
              }
            />
            Mô phỏng thiết bị không phản hồi
          </label>
          <label className="setup-toggle">
            <input
              type="checkbox"
              checked={state.simulateConflict}
              disabled={action.pending}
              onChange={(e) =>
                void action.run(() => demoControls.configure('simulateConflict', e.target.checked))
              }
            />
            Mô phỏng xung đột khi xác nhận
          </label>
        </div>
        <Field label="Kỹ thuật viên demo đang chọn">
          <select
            value={state.activeTechnicianId}
            disabled={action.pending}
            onChange={(e) => void action.run(() => demoControls.technician(e.target.value))}
          >
            {state.technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.area}
              </option>
            ))}
          </select>
        </Field>
        <h3>Phản hồi cảm biến mô phỏng</h3>
        {!state.bookings.some((b) => b.resourcePending) &&
          !state.resources.some((r) => r.status === 'PENDING_CHECK') && (
            <p className="ui-subtitle">
              Chưa có tài nguyên chờ kiểm tra. Kết thúc một phiên hoặc hoàn tất bảo trì để kiểm tra
              bước này.
            </p>
          )}
        {state.bookings
          .filter((b) => b.resourcePending)
          .map((b) => (
            <div className="setup-sensor" key={b.id}>
              <span>
                {b.id} · {b.slotId} · Chờ kiểm tra
              </span>
              <Button
                tone="soft"
                disabled={action.pending}
                onClick={() =>
                  void action.run(
                    () => pvApi.verifyReleased(b.id),
                    () => action.setSuccess('Đã mở lại tài nguyên sau khi xác minh cảm biến.'),
                  )
                }
              >
                Xác minh tài nguyên trống
              </Button>
            </div>
          ))}
        {state.resources
          .filter((r) => r.status === 'PENDING_CHECK')
          .map((r) => (
            <div className="setup-sensor" key={r.id}>
              <span>
                {r.id} · Sau bảo trì · pin {r.battery}%
              </span>
              <Button
                tone="soft"
                disabled={action.pending}
                onClick={() =>
                  void action.run(
                    () => mtApi.verifyResource(r.id),
                    () =>
                      action.setSuccess(
                        'Đã xác minh; trạng thái cập nhật theo dữ liệu cảm biến và mức pin.',
                      ),
                  )
                }
              >
                Phát dữ liệu cảm biến hợp lệ
              </Button>
            </div>
          ))}
        <Feedback action={action} />
        <Button tone="danger" disabled={action.pending} onClick={() => setReset(true)}>
          Đặt lại toàn bộ dữ liệu demo
        </Button>
      </section>
      <p>
        Màn PV / MT dùng chung nền frontend của nhóm (refactor/frontend-cleanup). Ghi chú tích hợp:
        README.md.
      </p>
      {reset && (
        <Modal title="Đặt lại dữ liệu demo?" busy={action.pending} onClose={() => setReset(false)}>
          <p className="ui-subtitle">
            Các xe mới, lượt đặt, báo cáo và phiếu bảo trì trong trình duyệt này sẽ bị xóa và thay
            bằng dữ liệu mẫu.
          </p>
          <div className="ui-actions">
            <Button tone="secondary" disabled={action.pending} onClick={() => setReset(false)}>
              Hủy
            </Button>
            <Button
              tone="danger"
              disabled={action.pending}
              onClick={() =>
                void action.run(demoControls.reset, () => {
                  setReset(false);
                  action.setSuccess('Đã đặt lại dữ liệu demo.');
                })
              }
            >
              Xác nhận đặt lại
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
