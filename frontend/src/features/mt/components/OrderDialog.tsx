import { icons } from '../../../assets/icons';
import { useState, type FormEvent } from 'react';
import { mtApi } from '../../../api/mtApi';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { addMinutes, atVietnam, dayInput, time } from '../../../shared/format';
import type { Priority } from '../types';
import {
  Badge,
  Button,
  DateInput,
  Feedback,
  Field,
  Modal,
  Notice,
  TimeSelect,
  useAction,
} from '../../../shared/ui';

export default function OrderDialog({
  resourceIds,
  incidentId,
  close,
  created,
}: {
  resourceIds: string[];
  incidentId?: string;
  close: () => void;
  created: (id: string) => void;
}) {
  const state = useDemoState();
  const action = useAction();
  const [technicianId, setTechnicianId] = useState(
    state.technicians.find(
      (t) => !state.orders.some((o) => o.technicianId === t.id && o.status === 'OPEN'),
    )?.id ?? '',
  );
  const [priority, setPriority] = useState<Priority>('HIGH');
  const defaultDue = new Date(
    Math.ceil(Date.parse(addMinutes(state.now, 120)) / 1800000) * 1800000,
  ).toISOString();
  const [dueDay, setDueDay] = useState(dayInput(defaultDue));
  const [dueTime, setDueTime] = useState(time(defaultDue));
  const vehiclesOnly = resourceIds.every(
    (id) => state.resources.find((r) => r.id === id)?.kind === 'VEHICLE',
  );
  const noun = vehiclesOnly ? 'xe' : 'tài nguyên';
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(
      () =>
        mtApi.createOrder(
          resourceIds,
          technicianId,
          priority,
          atVietnam(dueDay, dueTime),
          incidentId,
        ),
      created,
    );
  }
  return (
    <Modal title="Tạo lệnh bảo trì" wide busy={action.pending} onClose={close}>
      <p className="ui-subtitle">Gán Kỹ thuật viên bảo trì xử lý các {noun} lỗi đã chọn</p>
      <form onSubmit={submit} className="ui-stacked">
        <div>
          <h3>
            Danh sách {noun} cần bảo trì ({resourceIds.length})
          </h3>
          <div className="mt-order-items">
            {resourceIds.map((id) => {
              const r = state.resources.find((item) => item.id === id);
              const valid = r?.status === 'FAULTY';
              return (
                <article key={id}>
                  <div>
                    <strong>{id}</strong>
                    <small>
                      {r?.errorCode} · {state.hubs.find((h) => h.id === r?.hubId)?.shortName}
                      {valid ? ' · không nằm trong đơn/chuyến/lệnh khác' : ''}
                    </small>
                  </div>
                  <Badge tone={valid ? 'green' : 'red'}>
                    {valid ? `${icons.check} Hợp lệ` : 'Không hợp lệ'}
                  </Badge>
                </article>
              );
            })}
          </div>
        </div>
        <Field label="Kỹ thuật viên phụ trách">
          <select required value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            <option value="">Chọn kỹ thuật viên đang rảnh</option>
            {state.technicians.map((t) => {
              const busy = state.orders.some((o) => o.technicianId === t.id && o.status === 'OPEN');
              return (
                <option key={t.id} value={t.id} disabled={busy}>
                  {t.name} · {t.area} ({busy ? 'đang bận' : 'đang rảnh'})
                </option>
              );
            })}
          </select>
        </Field>
        <div className="ui-grid-2">
          <Field label="Mức ưu tiên">
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="HIGH">Cao</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="LOW">Thấp</option>
            </select>
          </Field>
          <Field label="Hạn xử lý">
            <span className="ui-datetime">
              <DateInput
                label="Ngày hạn xử lý"
                min={dayInput(state.now)}
                value={dueDay}
                onChange={setDueDay}
              />
              <TimeSelect label="Giờ hạn xử lý" value={dueTime} onChange={setDueTime} />
            </span>
          </Field>
        </div>
        <Notice>
          Trong cùng một giao dịch, hệ thống kiểm tra lần cuối các {noun} không thuộc đơn đặt trước,
          chuyến đi hay lệnh điều chuyển nào, rồi chuyển sang “Khóa bảo trì”. Có xung đột → hủy toàn
          bộ, không {noun} nào bị khóa.
        </Notice>
        <Feedback action={action} />
        <div className="ui-actions">
          <Button tone="secondary" disabled={action.pending} onClick={close}>
            Hủy
          </Button>
          <Button type="submit" disabled={action.pending || !technicianId || !resourceIds.length}>
            {action.pending ? 'Đang tạo lệnh…' : 'Tạo lệnh bảo trì'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
