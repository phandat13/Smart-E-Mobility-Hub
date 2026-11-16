import { mockAction, resetDemo, updateState } from '../mocks/store';
import { addMinutes, duration } from '../shared/format';
import { expireBookings } from '../features/pv/domain';

export const demoApi = {
  advance: (minutes: number) => mockAction(() => updateState(state => {
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 24 * 60) throw new Error('Chỉ tăng đồng hồ trong khoảng 0–1440 phút.');
    state.now = addMinutes(state.now, minutes); expireBookings(state);
    for (const b of state.bookings.filter(b => b.status === 'IN_USE' && b.service !== 'PARK')) {
      b.energy = Math.round((b.energy + minutes / 60 * .6) * 100) / 100;
      b.battery = Math.min(90, Math.round(b.battery + minutes / 4));
    }
  })),
  setTime: (now: string) => mockAction(() => updateState(state => {
    if (!Number.isFinite(Date.parse(now)) || Date.parse(now) < Date.parse(state.now)) throw new Error('Không thể lùi đồng hồ demo. Đặt lại demo nếu muốn bắt đầu lại.');
    const elapsed = duration(state.now, now); state.now = now; expireBookings(state);
    for (const b of state.bookings.filter(b => b.status === 'IN_USE' && b.service !== 'PARK')) { b.energy = Math.round((b.energy + elapsed / 100) * 100) / 100; b.battery = Math.min(90, Math.round(b.battery + elapsed / 4)); }
  })),
  configure: (key: 'deviceOffline' | 'simulateConflict', value: boolean) => mockAction(() => updateState(state => { state[key] = value; })),
  technician: (id: string) => mockAction(() => updateState(state => { if (!state.technicians.some(t => t.id === id)) throw new Error('Không tìm thấy kỹ thuật viên.'); state.activeTechnicianId = id; })),
  reset: () => mockAction(resetDemo),
};
