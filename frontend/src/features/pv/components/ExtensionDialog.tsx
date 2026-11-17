import { icons } from '../../../assets/icons';
import { useState } from 'react';
import { pvApi } from '../../../api/pvApi';
import { useDemoState } from '../../../mocks/pv-mt/store';
import { addMinutes, money, time } from '../../../shared/format';
import type { Booking } from '../types';
import { Button, Feedback, Field, Modal, Notice, Summary, useAction } from '../../../shared/ui';
import { extensionEstimate, resourceAvailable } from '../domain';

export default function ExtensionDialog({
  booking,
  close,
}: {
  booking: Booking;
  close: () => void;
}) {
  const state = useDemoState();
  const action = useAction();
  const [minutes, setMinutes] = useState(30);
  const newEnd = addMinutes(booking.endAt, minutes);
  const available =
    resourceAvailable(
      state,
      booking.hubId,
      'slot',
      booking.slotId,
      booking.endAt,
      newEnd,
      booking.id,
    ) &&
    (!booking.portId ||
      resourceAvailable(
        state,
        booking.hubId,
        'port',
        booking.portId,
        booking.endAt,
        newEnd,
        booking.id,
      ));
  const onTime = Date.parse(booking.endAt) - Date.parse(state.now) >= 15 * 60000;
  return (
    <Modal title="Gia hạn thời gian đỗ & sạc" onClose={close} busy={action.pending}>
      <p className="ui-subtitle">
        Phiên {booking.id} · Ô {booking.slotId}
        {booking.portId ? ` · Cổng #${booking.portId}` : ''}
      </p>
      <div className="ui-stacked">
        <Field label="Thời gian muốn kéo dài thêm">
          <span className="ui-grid-3">
            {[30, 60, 120].map((value) => (
              <button
                type="button"
                className="ui-choice"
                key={value}
                aria-pressed={minutes === value}
                onClick={() => setMinutes(value)}
              >
                {value === 30 ? '+30 phút' : `+${value / 60} giờ`}
              </button>
            ))}
          </span>
        </Field>
        <Notice tone={available && onTime ? 'success' : 'warning'}>
          {!onTime
            ? 'Cần gửi yêu cầu trước giờ kết thúc ít nhất 15 phút.'
            : available
              ? `${icons.check} Ô ${booking.slotId}${booking.portId ? ` và cổng #${booking.portId}` : ''} còn trống trong khung tiếp giáp ${time(booking.endAt)} – ${time(newEnd)}.`
              : 'Vị trí đã có lịch kế tiếp. Vui lòng chọn thời lượng khác.'}
        </Notice>
      </div>
      <Summary
        rows={[
          ['Kết thúc hiện tại', time(booking.endAt)],
          ['Kết thúc mới', <span className="pv-primary">{time(newEnd)}</span>],
          ['Chi phí ước tính thêm', `+${money(extensionEstimate(booking.service, minutes))}`],
        ]}
      />
      <Feedback action={action} />
      <div className="ui-actions">
        <Button tone="secondary" onClick={close} disabled={action.pending}>
          Hủy
        </Button>
        <Button
          disabled={action.pending || !available || !onTime}
          onClick={() => void action.run(() => pvApi.extend(booking.id, minutes), close)}
        >
          {action.pending ? 'Đang gia hạn…' : 'Xác nhận gia hạn'}
        </Button>
      </div>
    </Modal>
  );
}
