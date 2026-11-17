import { useState, type FormEvent } from 'react';
import { pvApi } from '../../../api/pvApi';
import { useDemoState } from '../../../mocks/pv-mt/store';
import type { Booking } from '../types';
import { Button, Feedback, Field, Modal, useAction } from '../../../shared/ui';

export default function ScanDialog({
  booking,
  mode,
  close,
}: {
  booking: Booking;
  mode: 'in' | 'out';
  close: () => void;
}) {
  const state = useDemoState();
  const action = useAction();
  const vehicle = state.vehicles.find((v) => v.id === booking.vehicleId)!;
  const [token, setToken] = useState('');
  const [hubId, setHubId] = useState(booking.hubId);
  const [plate, setPlate] = useState(vehicle.plate);
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(
      () =>
        mode === 'in'
          ? pvApi.checkIn(booking.id, token, hubId, plate)
          : pvApi.checkOut(booking.id, token),
      close,
    );
  }
  return (
    <Modal
      title={mode === 'in' ? 'Check-in tại Hub' : 'Check-out – kết thúc phiên'}
      onClose={close}
      busy={action.pending}
    >
      <form onSubmit={submit} className="ui-stacked">
        <p className="ui-subtitle">
          {booking.id} · Thiết bị và thao tác quét mã được mô phỏng trong bản demo.
        </p>
        <Field label="Mã QR xác nhận">
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Dán nội dung mã QR"
            autoComplete="off"
          />
        </Field>
        <Button tone="soft" onClick={() => setToken(booking.token)}>
          Mô phỏng quét QR của phiên này
        </Button>
        {mode === 'in' && (
          <>
            <Field label="Hub check-in">
              <select value={hubId} onChange={(e) => setHubId(e.target.value)}>
                {state.hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Biển số tại Hub">
              <input required value={plate} onChange={(e) => setPlate(e.target.value)} />
            </Field>
          </>
        )}
        <Feedback action={action} />
        <div className="ui-actions">
          <Button tone="secondary" disabled={action.pending} onClick={close}>
            Hủy
          </Button>
          <Button type="submit" disabled={action.pending}>
            {action.pending
              ? 'Đang xác thực…'
              : mode === 'in'
                ? 'Xác nhận check-in'
                : 'Xác nhận check-out'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
