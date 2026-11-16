import { useSyncExternalStore } from 'react';
import { USE_MOCK } from '../api/client';
import type { DemoState } from '../shared/types';
import { createSeed } from './seed';
import { dayInput } from '../shared/format';

export const STORAGE_KEY = 'unigo.pv-mt.v1';
let storageWarning = '';
function load(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const value = JSON.parse(saved) as DemoState;
      value.activeTechnicianId ??= 'tech-1';
      if (value.version === 1 && Array.isArray(value.vehicles) && Array.isArray(value.bookings) && Array.isArray(value.resources) && Array.isArray(value.incidents) && Array.isArray(value.orders) && Array.isArray(value.tickets) && Array.isArray(value.hubs) && Array.isArray(value.technicians) && Number.isFinite(Date.parse(value.now))) return value;
      storageWarning = 'Dữ liệu demo cũ không hợp lệ; đã tải dữ liệu mẫu.';
    }
  } catch { storageWarning = 'Không đọc được dữ liệu demo đã lưu. Phiên này sử dụng dữ liệu mẫu.'; }
  return createSeed();
}
let state = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const getState = () => state;
export const getStorageWarning = () => storageWarning;
export function updateState(mutate: (draft: DemoState) => void) {
  const next = structuredClone(state);
  mutate(next);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); storageWarning = ''; }
  catch { throw new Error('Không lưu được dữ liệu demo (bộ nhớ trình duyệt có thể đã đầy). Hãy giảm số ảnh và thử lại.'); }
  state = next;
  emit();
}
export const useDemoState = () => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getState);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { state = load(); emit(); } });
export async function mockAction<T>(action: () => T): Promise<T> {
  if (!USE_MOCK) throw new Error('API PV / MT chưa được kết nối. Bật chế độ mock để chạy demo.');
  await new Promise(resolve => setTimeout(resolve, 180));
  return action();
}
export function resetDemo() { updateState(draft => Object.assign(draft, createSeed())); }
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
// Human-readable record numbers in the Figma format (BK-20261007-094, SC-1094, LBT-0710-007, PBT-0710-012).
// Sequences are derived from existing records, so they stay unique within the demo state.
const nextSequence = (ids: string[], pattern: RegExp, floor = 0) => Math.max(floor, ...ids.map(id => Number(pattern.exec(id)?.[1] ?? 0))) + 1;
const pad = (value: number, width: number) => String(value).padStart(width, '0');
const dayMonthCode = (value: string) => { const [, month, day] = dayInput(value).split('-'); return `${day}${month}`; };
export const recordIds = {
  booking: (state: DemoState, startAt: string) => `BK-${dayInput(startAt).replace(/-/g, '')}-${pad(nextSequence(state.bookings.map(b => b.id), /^BK-\d{8}-(\d+)$/), 3)}`,
  incident: (state: DemoState) => `SC-${nextSequence(state.incidents.map(i => i.id), /^SC-(\d+)$/, 1000)}`,
  order: (state: DemoState) => `LBT-${dayMonthCode(state.now)}-${pad(nextSequence(state.orders.map(o => o.id), /^LBT-\d{4}-(\d+)$/), 3)}`,
  ticket: (state: DemoState) => `PBT-${dayMonthCode(state.now)}-${pad(nextSequence(state.tickets.map(t => t.id), /^PBT-\d{4}-(\d+)$/), 3)}`,
};
