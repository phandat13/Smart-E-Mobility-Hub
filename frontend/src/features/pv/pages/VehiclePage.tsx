import { icons } from '../../../assets/icons';
import { useRef, useState, type FormEvent } from 'react';
import { pvApi } from '../../../api/pvApi';
import { useDemoState } from '../../../mocks/pv-mt/store';
import type { PersonalVehicle } from '../types';
import {
  Badge,
  Button,
  Empty,
  Feedback,
  Field,
  Modal,
  Notice,
  useAction,
} from '../../../shared/ui';
import { isActiveBooking } from '../domain';
import '../styles/pv.css';

const blank = (): Omit<PersonalVehicle, 'id'> => ({
  plate: '',
  type: 'MOTORBIKE',
  battery: 2.4,
  connector: 'Type 2 / AC',
  model: '',
});
export default function VehiclePage() {
  const state = useDemoState();
  const action = useAction();
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState<string>();
  const [deleting, setDeleting] = useState<PersonalVehicle>();
  const formRef = useRef<HTMLFormElement>(null);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  function start(vehicle?: PersonalVehicle) {
    setEditing(vehicle?.id);
    setDraft(vehicle ? { ...vehicle } : blank());
    action.setError('');
    action.setSuccess('');
    formRef.current?.querySelector('input')?.focus();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(
      () => pvApi.saveVehicle(draft, editing),
      () => {
        action.setSuccess(editing ? 'Đã cập nhật phương tiện.' : 'Đã thêm phương tiện mới.');
        setEditing(undefined);
        setDraft(blank());
      },
    );
  }
  return (
    <main className="pv-page">
      <section className="ui-panel pv-vehicles" data-figma-node="15:1335">
        <div className="ui-page-heading">
          <div>
            <h1>Phương tiện của tôi</h1>
            <p>Thông tin xe dùng để kiểm tra chỗ đỗ & cổng sạc tương thích khi đặt chỗ</p>
          </div>
          <Button onClick={() => start()}>+ Thêm xe mới</Button>
        </div>
        <div className="pv-vehicle-layout">
          <div className="ui-stacked">
            {!state.vehicles.length && (
              <Empty title="Bạn chưa có phương tiện">Thêm xe đầu tiên để bắt đầu đặt chỗ.</Empty>
            )}
            {state.vehicles.map((vehicle) => {
              const busy = state.bookings.some(
                (b) => b.vehicleId === vehicle.id && isActiveBooking(b),
              );
              return (
                <article
                  className={`pv-vehicle ${busy ? 'pv-vehicle--busy' : ''}`}
                  key={vehicle.id}
                >
                  <div className="pv-vehicle__icon" aria-hidden="true">
                    {vehicle.type === 'MOTORBIKE' ? icons.scooter : icons.bicycle}
                  </div>
                  <div className="pv-vehicle__body">
                    <h2>
                      {vehicle.type === 'MOTORBIKE' ? 'Xe máy điện' : 'Xe đạp điện'} {vehicle.model}
                    </h2>
                    <p>
                      Biển số: {vehicle.plate}
                      {vehicle.color ? ` · Màu ${vehicle.color}` : ''}
                    </p>
                    <p className="pv-vehicle__spec">
                      Pin {vehicle.battery} kWh · Chuẩn sạc {vehicle.connector}
                    </p>
                    <Badge tone={busy ? 'amber' : 'green'}>
                      {busy ? 'Đang có lịch đặt chỗ / sử dụng' : 'Sẵn sàng đặt chỗ'}
                    </Badge>
                    <div className="pv-vehicle__actions">
                      <Button
                        tone="soft"
                        className="ui-button--small"
                        disabled={action.pending || busy}
                        onClick={() => start(vehicle)}
                        aria-label={`Sửa ${vehicle.plate}`}
                      >
                        {icons.edit} Sửa
                      </Button>
                      <Button
                        tone="secondary"
                        className="ui-button--small pv-delete"
                        disabled={action.pending}
                        onClick={() => {
                          action.setError('');
                          setDeleting(vehicle);
                        }}
                        aria-label={`Xóa ${vehicle.plate}`}
                      >
                        {icons.delete} Xóa
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
            <Notice tone="warning">
              Không thể xóa hoặc sửa xe đang có lịch đặt chỗ đỗ/sạc hoặc đang sử dụng tại Hub.
            </Notice>
          </div>
          <form className="pv-vehicle-form ui-stacked" ref={formRef} onSubmit={submit}>
            <h2>{editing ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'}</h2>
            <Field label="Biển số xe">
              <input
                required
                maxLength={20}
                placeholder="59-X1 678.90"
                value={draft.plate}
                onChange={(e) => set('plate', e.target.value)}
              />
            </Field>
            <Field label="Loại xe">
              <select
                value={draft.type}
                onChange={(e) => set('type', e.target.value as PersonalVehicle['type'])}
              >
                <option value="MOTORBIKE">Xe máy điện</option>
                <option value="BICYCLE">Xe đạp điện</option>
              </select>
            </Field>
            <div className="ui-grid-2">
              <Field label="Dung lượng pin (kWh)">
                <input
                  type="number"
                  required
                  min="0.1"
                  max="200"
                  step="0.1"
                  value={draft.battery}
                  onChange={(e) => set('battery', Number(e.target.value))}
                />
              </Field>
              <Field label="Chuẩn cắm sạc">
                <select value={draft.connector} onChange={(e) => set('connector', e.target.value)}>
                  <option>Type 2 / AC</option>
                  <option>CCS2 / DC</option>
                </select>
              </Field>
            </div>
            <Field label="Hãng / mẫu xe (tùy chọn)">
              <input
                maxLength={80}
                placeholder="Yadea Odora S"
                value={draft.model}
                onChange={(e) => set('model', e.target.value)}
              />
            </Field>
            <Notice tone="neutral">Biển số không được trùng với phương tiện đã đăng ký.</Notice>
            <Feedback action={action} />
            <div className="ui-actions">
              <Button tone="secondary" disabled={action.pending} onClick={() => start()}>
                Hủy
              </Button>
              <Button type="submit" disabled={action.pending}>
                {action.pending ? 'Đang lưu…' : 'Lưu phương tiện'}
              </Button>
            </div>
          </form>
        </div>
      </section>
      {deleting && (
        <Modal
          title="Xóa phương tiện?"
          busy={action.pending}
          onClose={() => setDeleting(undefined)}
        >
          <p className="ui-subtitle">
            Bạn muốn xóa xe {deleting.plate}? Thao tác này không thể hoàn tác.
          </p>
          <Feedback action={action} />
          <div className="ui-actions">
            <Button
              tone="secondary"
              disabled={action.pending}
              onClick={() => setDeleting(undefined)}
            >
              Giữ lại
            </Button>
            <Button
              tone="danger"
              disabled={action.pending}
              onClick={() =>
                void action.run(
                  () => pvApi.deleteVehicle(deleting.id),
                  () => {
                    setDeleting(undefined);
                    if (editing === deleting.id) start();
                    action.setSuccess('Đã xóa phương tiện.');
                  },
                )
              }
            >
              {action.pending ? 'Đang xóa…' : 'Xác nhận xóa'}
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
