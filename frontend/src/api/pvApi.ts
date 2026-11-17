import { USE_MOCK } from './client';
import { backendPending } from './backendPending';
import { pvMock } from '../mocks/pv-mt/pvMock';
import type { BookingInput, PersonalVehicle } from '../features/pv/types';

/** PV01–04: phương tiện cá nhân, đặt chỗ đỗ / sạc, check-in / check-out, gia hạn. */
export const pvApi = {
  /** PV02 · thêm hoặc sửa phương tiện */
  saveVehicle(input: Omit<PersonalVehicle, 'id'>, id?: string): Promise<string> {
    if (USE_MOCK) return pvMock.saveVehicle(input, id);
    return backendPending('PV02 · lưu phương tiện');
  },
  /** PV02 · xóa phương tiện */
  deleteVehicle(id: string): Promise<void> {
    if (USE_MOCK) return pvMock.deleteVehicle(id);
    return backendPending('PV02 · xóa phương tiện');
  },
  /** PV01 · đặt chỗ đỗ / lịch sạc */
  book(input: BookingInput): Promise<string> {
    if (USE_MOCK) return pvMock.book(input);
    return backendPending('PV01 · đặt chỗ');
  },
  /** PV03 · check-in tại Hub */
  checkIn(id: string, token: string, hubId: string, plate: string): Promise<void> {
    if (USE_MOCK) return pvMock.checkIn(id, token, hubId, plate);
    return backendPending('PV03 · check-in');
  },
  /** PV04 · gia hạn phiên */
  extend(id: string, minutes: number): Promise<void> {
    if (USE_MOCK) return pvMock.extend(id, minutes);
    return backendPending('PV04 · gia hạn');
  },
  /** PV03 · check-out */
  checkOut(id: string, token: string): Promise<void> {
    if (USE_MOCK) return pvMock.checkOut(id, token);
    return backendPending('PV03 · check-out');
  },
  /** PV03 · xác minh tài nguyên trống sau check-out (dữ liệu cảm biến) */
  verifyReleased(id: string): Promise<void> {
    if (USE_MOCK) return pvMock.verifyReleased(id);
    return backendPending('PV03 · xác minh tài nguyên');
  },
};
