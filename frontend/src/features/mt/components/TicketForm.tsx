import { icons } from '../../../assets/icons';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { mtApi } from '../../../api/mtApi';
import { recordIds, useDemoState } from '../../../mocks/pv-mt/store';
import { date, resourceType, time } from '../../../shared/format';
import type { MaintenanceOrder, Part } from '../types';
import { Button, Feedback, Field, PhotoUpload, useAction } from '../../../shared/ui';

export default function TicketForm({
  order,
  resourceId,
}: {
  order: MaintenanceOrder;
  resourceId: string;
}) {
  const state = useDemoState();
  const resource = state.resources.find((r) => r.id === resourceId)!;
  const action = useAction();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState('');
  const [repairItems, setRepairItems] = useState<string[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const categories =
    resource.kind === 'VEHICLE'
      ? [
          'Kiểm tra & hiệu chỉnh BMS',
          'Thay cell pin lỗi',
          'Vệ sinh cổng sạc',
          'Kiểm tra phanh & lốp',
        ]
      : [
          'Kiểm tra nguồn điện',
          'Thay đầu nối sạc',
          'Vệ sinh cổng sạc',
          'Kiểm tra kết nối thiết bị',
        ];
  const setPart = (index: number, key: keyof Part, value: string | number) =>
    setParts((previous) =>
      previous.map((part, i) => (i === index ? { ...part, [key]: value } : part)),
    );
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(
      () =>
        mtApi.saveTicket({ orderId: order.id, resourceId, diagnosis, repairItems, parts, photos }),
      (id) => navigate(`/tech/maintenance/tickets/${id}`),
    );
  }
  return (
    <section className="ui-panel mt-tech-main" data-figma-node="400:2849">
      <h1>Lập phiếu bảo trì · {resource.id}</h1>
      <p className="ui-subtitle">
        Liên kết lệnh #{order.id} · {resourceType(resource)} ·{' '}
        {state.hubs.find((h) => h.id === resource.hubId)?.shortName}
      </p>
      <form onSubmit={submit} className="ui-stacked">
        <div className="ui-grid-3">
          <Field label="Mã lỗi hệ thống">
            <input readOnly value={resource.errorCode} />
          </Field>
          <Field label="Thời điểm tiếp nhận">
            <input readOnly value={`${time(state.now)} · ${date(state.now)}`} />
          </Field>
          <Field label="Số phiếu" hint="Cấp chính thức khi lưu phiếu">
            <input readOnly value={recordIds.ticket(state)} />
          </Field>
        </div>
        <Field label="Tình trạng lỗi ghi nhận">
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            value={diagnosis}
            placeholder="Mô tả kết quả kiểm tra và tình trạng thực tế của tài nguyên…"
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </Field>
        <fieldset className="mt-fieldset">
          <legend>Hạng mục sửa chữa</legend>
          <div className="mt-repair-options">
            {categories.map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  checked={repairItems.includes(item)}
                  onChange={(e) =>
                    setRepairItems((previous) =>
                      e.target.checked
                        ? [...previous, item]
                        : previous.filter((value) => value !== item),
                    )
                  }
                />
                {item}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <h2 className="mt-field-label">Linh kiện thay thế</h2>
          {parts.length > 0 && (
            <div className="ui-table-wrap">
              <table className="ui-table mt-parts">
                <thead>
                  <tr>
                    <th>LINH KIỆN</th>
                    <th>MÃ</th>
                    <th>SỐ LƯỢNG</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="ui-input"
                          required
                          aria-label={`Tên linh kiện ${i + 1}`}
                          value={part.name}
                          onChange={(e) => setPart(i, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ui-input"
                          required
                          aria-label={`Mã linh kiện ${i + 1}`}
                          value={part.code}
                          onChange={(e) => setPart(i, 'code', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ui-input"
                          type="number"
                          required
                          min="1"
                          max="999"
                          step="1"
                          aria-label={`Số lượng linh kiện ${i + 1}`}
                          value={part.quantity}
                          onChange={(e) => setPart(i, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ui-icon-button"
                          aria-label={`Xóa linh kiện ${i + 1}`}
                          onClick={() =>
                            setParts((previous) => previous.filter((_, index) => index !== i))
                          }
                        >
                          {icons.close}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button
            tone="soft"
            className="ui-button--small"
            onClick={() =>
              setParts((previous) => [...previous, { name: '', code: '', quantity: 1 }])
            }
          >
            + Thêm linh kiện
          </Button>
        </div>
        <div>
          <h2 className="mt-field-label">Ảnh hiện trạng</h2>
          <PhotoUpload photos={photos} onChange={setPhotos} />
        </div>
        <Feedback action={action} />
        <div className="ui-actions">
          <Button
            tone="secondary"
            disabled={action.pending}
            onClick={() => navigate('/tech/maintenance')}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={action.pending || order.status === 'CLOSED'}>
            {action.pending ? 'Đang lưu…' : 'Lưu phiếu bảo trì'}
          </Button>
        </div>
      </form>
    </section>
  );
}
