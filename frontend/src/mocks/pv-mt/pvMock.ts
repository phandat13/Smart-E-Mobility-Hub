import { getState, mockAction, newId, recordIds, updateState } from './store';
import { addMinutes } from '../../shared/format';
import type { BookingInput, PersonalVehicle } from '../../features/pv/types';
import type { DemoState } from './types';
import {
  expireBookings,
  invoice,
  isActiveBooking,
  resourceAvailable,
} from '../../features/pv/domain';

const normalizedPlate = (plate: string) =>
  plate
    .normalize('NFKC')
    .replace(/[\s.\-]/g, '')
    .toUpperCase();
function checkWindow(start: string, end: string, state: DemoState) {
  if (
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    Date.parse(end) <= Date.parse(start)
  )
    throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
  if (Date.parse(start) < Date.parse(state.now))
    throw new Error('Vui lòng chọn khung giờ trong tương lai theo đồng hồ demo.');
}
function validateResources(state: DemoState, input: BookingInput, excludeId?: string) {
  const hub = state.hubs.find((h) => h.id === input.hubId);
  const vehicle = state.vehicles.find((v) => v.id === input.vehicleId);
  if (!hub || !vehicle)
    throw new Error('Hub hoặc phương tiện không còn tồn tại. Hãy tải lại danh sách.');
  if (
    !hub.slots.includes(input.slotId) ||
    !resourceAvailable(state, hub.id, 'slot', input.slotId, input.startAt, input.endAt, excludeId)
  )
    throw new Error('Chỗ đỗ vừa được đặt hoặc đang chờ kiểm tra. Vui lòng chọn vị trí khác.');
  if (input.service !== 'PARK') {
    const port = hub.ports.find((p) => p.id === input.portId && p.connector === vehicle.connector);
    if (
      !port ||
      !resourceAvailable(state, hub.id, 'port', port.id, input.startAt, input.endAt, excludeId)
    )
      throw new Error('Cổng sạc không tương thích hoặc không còn trống trong khung giờ này.');
    if (
      state.resources.some(
        (r) =>
          r.kind === 'PORT' &&
          r.hubId === hub.id &&
          r.name === `Cổng #${port.id}` &&
          r.status !== 'AVAILABLE',
      )
    )
      throw new Error('Cổng sạc đang bị khóa hoặc báo lỗi.');
  }
  if (state.simulateConflict)
    throw new Error(
      'Xung đột mô phỏng: tài nguyên vừa được người khác giữ. Không thay đổi nào được lưu.',
    );
}

/** Mock PV01–04 operations on the local demo store. */
export const pvMock = {
  saveVehicle: (input: Omit<PersonalVehicle, 'id'>, id?: string) =>
    mockAction(() => {
      let result = '';
      updateState((state) => {
        if (id && !state.vehicles.some((v) => v.id === id))
          throw new Error('Phương tiện không còn tồn tại.');
        if (id && state.bookings.some((b) => b.vehicleId === id && isActiveBooking(b)))
          throw new Error('Không thể sửa xe đang có lịch đặt chỗ hoặc đang sử dụng.');
        if (!/^[\p{L}\d .-]{5,20}$/u.test(input.plate.trim()))
          throw new Error('Biển số phải gồm 5–20 ký tự chữ, số, dấu chấm hoặc gạch ngang.');
        if (!Number.isFinite(input.battery) || input.battery <= 0 || input.battery > 200)
          throw new Error('Dung lượng pin phải lớn hơn 0 và không quá 200 kWh.');
        if (
          state.vehicles.some(
            (v) => v.id !== id && normalizedPlate(v.plate) === normalizedPlate(input.plate),
          )
        )
          throw new Error('Phương tiện này đã được đăng ký trước đó.');
        result = id ?? newId('PV');
        const value = {
          ...input,
          plate: input.plate.trim().toUpperCase(),
          model: input.model.trim(),
          id: result,
        };
        state.vehicles = id
          ? state.vehicles.map((v) => (v.id === id ? value : v))
          : [...state.vehicles, value];
      });
      return result;
    }),
  deleteVehicle: (id: string) =>
    mockAction(() =>
      updateState((state) => {
        if (state.bookings.some((b) => b.vehicleId === id && isActiveBooking(b)))
          throw new Error(
            'Không thể xóa xe đang có lịch đặt chỗ đỗ/sạc hoặc đang sử dụng tại Hub.',
          );
        // Retain an immutable vehicle snapshot in historical bookings before removal.
        const vehicle = state.vehicles.find((v) => v.id === id);
        for (const booking of state.bookings.filter((b) => b.vehicleId === id))
          booking.vehicleSnapshot = vehicle;
        state.vehicles = state.vehicles.filter((v) => v.id !== id);
      }),
    ),
  book: (input: BookingInput) =>
    mockAction(() => {
      let id = '';
      updateState((state) => {
        id = recordIds.booking(state, input.startAt);
        expireBookings(state);
        checkWindow(input.startAt, input.endAt, state);
        validateResources(state, input);
        if (
          state.bookings.some(
            (b) =>
              b.vehicleId === input.vehicleId &&
              isActiveBooking(b) &&
              (b.status === 'IN_USE' ||
                (Date.parse(input.startAt) < Date.parse(b.endAt) &&
                  Date.parse(input.endAt) > Date.parse(b.startAt))),
          )
        )
          throw new Error('Xe đã có lịch đặt chỗ hoặc đang sử dụng trong khung giờ này.');
        state.bookings.unshift({
          ...input,
          portId: input.service === 'PARK' ? undefined : input.portId,
          id,
          token: crypto.randomUUID(),
          status: 'BOOKED',
          resourcePending: false,
          energy: 0,
          battery: 20,
          timeline: [{ at: state.now, message: 'Đặt chỗ thành công · đã phát mã QR' }],
        });
      });
      return id;
    }),
  checkIn: (id: string, token: string, hubId: string, plate: string) =>
    mockAction(() => {
      updateState(expireBookings);
      updateState((state) => {
        const b = state.bookings.find((item) => item.id === id);
        if (!b || b.status !== 'BOOKED')
          throw new Error('Lượt đặt không còn hiệu lực để check-in.');
        const vehicle = state.vehicles.find((v) => v.id === b.vehicleId)!;
        if (
          token.trim() !== b.token ||
          hubId !== b.hubId ||
          normalizedPlate(plate) !== normalizedPlate(vehicle.plate)
        )
          throw new Error('Mã QR, Hub hoặc biển số không khớp với lượt đặt.');
        validateResources(state, { ...b, startAt: state.now }, b.id);
        if (state.deviceOffline)
          throw new Error(
            'Thiết bị không phản hồi. Phiên giữ nguyên trạng thái; vui lòng thử lại hoặc báo sự cố.',
          );
        b.status = 'IN_USE';
        b.checkedInAt = state.now;
        b.timeline.push(
          {
            at: state.now,
            message: 'Check-in thành công',
            detail: `Quét QR tại ${b.portId ? `cổng #${b.portId}` : 'điểm check-in'} · đúng Hub, đúng biển số, trong ngưỡng 15 phút`,
          },
          {
            at: state.now,
            message: 'Thiết bị xác nhận bắt đầu phiên đỗ & sạc',
            detail: 'Trạng thái phiên: Đang sử dụng',
          },
        );
      });
    }),
  extend: (id: string, minutes: number) =>
    mockAction(() =>
      updateState((state) => {
        const b = state.bookings.find((item) => item.id === id);
        if (!b || b.status !== 'IN_USE') throw new Error('Chỉ gia hạn phiên đang sử dụng.');
        if (![30, 60, 120].includes(minutes)) throw new Error('Thời lượng gia hạn không hợp lệ.');
        if (Date.parse(b.endAt) - Date.parse(state.now) < 15 * 60000)
          throw new Error('Yêu cầu gia hạn phải gửi trước giờ kết thúc ít nhất 15 phút.');
        const endAt = addMinutes(b.endAt, minutes);
        validateResources(state, { ...b, startAt: b.endAt, endAt }, b.id);
        b.endAt = endAt;
        b.timeline.push({ at: state.now, message: `Đã gia hạn thêm ${minutes} phút` });
      }),
    ),
  checkOut: (id: string, token: string) =>
    mockAction(() => {
      const current = getState().bookings.find((b) => b.id === id);
      if (!current || current.status !== 'IN_USE') throw new Error('Phiên không còn đang sử dụng.');
      if (token.trim() !== current.token) throw new Error('Mã QR không khớp với phiên này.');
      if (getState().deviceOffline) {
        updateState((state) => {
          const b = state.bookings.find((item) => item.id === id);
          if (!b || b.status !== 'IN_USE') throw new Error('Phiên không còn đang sử dụng.');
          let resource = state.resources.find(
            (r) =>
              r.hubId === b.hubId &&
              r.name === (b.portId ? `Cổng #${b.portId}` : `Thiết bị ô ${b.slotId}`),
          );
          if (!resource) {
            resource = {
              id: `DEVICE-${b.hubId}-${b.portId ?? b.slotId}`,
              name: b.portId ? `Cổng #${b.portId}` : `Thiết bị ô ${b.slotId}`,
              kind: 'PORT',
              hubId: b.hubId,
              errorCode: 'E-DEVICE-01',
              description: 'Thiết bị không phản hồi khi check-out',
              status: 'IN_USE',
              battery: 0,
              telemetryFresh: false,
              correctHub: true,
            };
            state.resources.push(resource);
          }
          if (!state.incidents.some((i) => i.resourceId === resource.id && i.status !== 'CLOSED'))
            state.incidents.unshift({
              id: recordIds.incident(state),
              resourceId: resource.id,
              hubId: b.hubId,
              category: 'Thiết bị không phản hồi',
              description: `Check-out phiên ${id} không nhận được phản hồi thiết bị.`,
              photos: [],
              priority: 'HIGH',
              status: 'OPEN',
              createdAt: state.now,
              source: 'SYSTEM',
            });
        });
        throw new Error(
          'Thiết bị không phản hồi. Trạng thái phiên giữ nguyên; đã ghi nhận cảnh báo cho vận hành.',
        );
      }
      updateState((state) => {
        const b = state.bookings.find((item) => item.id === id);
        if (!b || b.status !== 'IN_USE') throw new Error('Phiên không còn đang sử dụng.');
        if (token.trim() !== b.token) throw new Error('Mã QR không khớp với phiên này.');
        b.status = 'COMPLETED';
        b.checkedOutAt = state.now;
        b.resourcePending = true;
        b.cost = invoice(b, state.now).total;
        b.timeline.push(
          {
            at: state.now,
            message: 'Check-out thành công · đã gửi chi phí tới thanh toán mô phỏng',
          },
          { at: state.now, message: 'Ô đỗ và cổng sạc chuyển Chờ kiểm tra' },
        );
      });
    }),
  verifyReleased: (id: string) =>
    mockAction(() =>
      updateState((state) => {
        const b = state.bookings.find((item) => item.id === id);
        if (!b || !b.resourcePending) throw new Error('Không có tài nguyên đang chờ kiểm tra.');
        if (state.deviceOffline) throw new Error('Chưa nhận được dữ liệu cảm biến hợp lệ.');
        b.resourcePending = false;
        b.timeline.push({
          at: state.now,
          message: 'Cảm biến mô phỏng xác nhận tài nguyên trống · đã mở lại',
        });
      }),
    ),
};
