import { mockAction, recordIds, updateState } from './store';
import type { DemoState } from './types';
import type {
  Incident,
  MaintenanceTicket,
  Priority,
  RepairProgress,
} from '../../features/mt/types';

function checkAssignable(state: DemoState, resourceIds: string[], technicianId: string) {
  if (!resourceIds.length) throw new Error('Chọn ít nhất một tài nguyên cần bảo trì.');
  if (!state.technicians.some((t) => t.id === technicianId))
    throw new Error('Vui lòng chọn kỹ thuật viên.');
  if (state.orders.some((o) => o.technicianId === technicianId && o.status === 'OPEN'))
    throw new Error('Kỹ thuật viên đang có lệnh mở. Vui lòng chọn người đang rảnh.');
  if (state.simulateConflict)
    throw new Error('Xung đột mô phỏng. Đã hủy toàn bộ, không tài nguyên nào bị khóa.');
  for (const id of resourceIds) {
    const r = state.resources.find((item) => item.id === id);
    if (
      !r ||
      r.status !== 'FAULTY' ||
      state.orders.some((o) => o.status === 'OPEN' && o.resourceIds.includes(id))
    )
      throw new Error(
        `${id} không còn hợp lệ: đang sử dụng, đã được gán lệnh hoặc chưa báo lỗi. Đã hủy toàn bộ.`,
      );
  }
}
/** Mock MT01–05 operations on the local demo store. */
export const mtMock = {
  report: (input: Pick<Incident, 'resourceId' | 'hubId' | 'category' | 'description' | 'photos'>) =>
    mockAction(() => {
      let id = '';
      updateState((state) => {
        const r = state.resources.find(
          (item) => item.id === input.resourceId && item.hubId === input.hubId,
        );
        if (!r) throw new Error('Tài nguyên không thuộc Hub đã chọn.');
        if (!input.category || input.description.trim().length < 10)
          throw new Error('Chọn loại lỗi và mô tả sự cố ít nhất 10 ký tự.');
        const existing = state.incidents.find(
          (i) => i.resourceId === input.resourceId && i.status !== 'CLOSED',
        );
        if (existing) {
          id = existing.id;
          existing.description += `\nPhản ánh bổ sung: ${input.description.trim()}`;
          existing.photos.push(...input.photos);
        } else {
          id = recordIds.incident(state);
          state.incidents.unshift({
            ...input,
            id,
            description: input.description.trim(),
            priority: 'HIGH',
            status: 'OPEN',
            createdAt: state.now,
            source: 'STUDENT',
          });
        }
        // Never release an in-use / maintenance-locked asset because of a report.
        if (r.status === 'AVAILABLE' || r.status === 'NEEDS_CHARGE') r.status = 'FAULTY';
        r.description = input.category;
      });
      return id;
    }),
  createOrder: (
    resourceIds: string[],
    technicianId: string,
    priority: Priority,
    dueAt: string,
    incidentId?: string,
  ) =>
    mockAction(() => {
      let id = '';
      updateState((state) => {
        id = recordIds.order(state);
        const uniqueIds = [...new Set(resourceIds)];
        checkAssignable(state, uniqueIds, technicianId);
        if (!Number.isFinite(Date.parse(dueAt)) || Date.parse(dueAt) <= Date.parse(state.now))
          throw new Error('Hạn xử lý phải sau thời điểm hiện tại của demo.');
        if (
          incidentId &&
          !state.incidents.some(
            (i) => i.id === incidentId && i.status === 'OPEN' && uniqueIds.includes(i.resourceId),
          )
        )
          throw new Error('Phiếu sự cố đã được gán hoặc không khớp tài nguyên.');
        state.orders.unshift({
          id,
          resourceIds: uniqueIds,
          technicianId,
          priority,
          dueAt,
          status: 'OPEN',
          createdAt: state.now,
        });
        for (const resourceId of uniqueIds) {
          state.resources.find((r) => r.id === resourceId)!.status = 'MAINTENANCE_LOCKED';
          for (const i of state.incidents.filter(
            (i) => i.resourceId === resourceId && i.status === 'OPEN',
          )) {
            i.status = 'ASSIGNED';
            i.technicianId = technicianId;
            i.orderId = id;
          }
        }
      });
      return id;
    }),
  saveTicket: (
    input: Pick<
      MaintenanceTicket,
      'orderId' | 'resourceId' | 'diagnosis' | 'repairItems' | 'parts' | 'photos'
    >,
  ) =>
    mockAction(() => {
      let id = '';
      updateState((state) => {
        id = recordIds.ticket(state);
        const order = state.orders.find(
          (o) =>
            o.id === input.orderId &&
            o.status === 'OPEN' &&
            o.resourceIds.includes(input.resourceId),
        );
        if (!order) throw new Error('Lệnh không còn mở hoặc tài nguyên không thuộc lệnh.');
        if (order.technicianId !== state.activeTechnicianId)
          throw new Error('Lệnh không thuộc kỹ thuật viên demo đang chọn.');
        if (state.tickets.some((t) => t.orderId === order.id && t.resourceId === input.resourceId))
          throw new Error('Tài nguyên đã có phiếu trong lệnh này.');
        if (input.diagnosis.trim().length < 10 || !input.repairItems.length)
          throw new Error('Nhập tình trạng lỗi ít nhất 10 ký tự và chọn hạng mục sửa chữa.');
        if (
          input.parts.some(
            (p) =>
              !p.name.trim() || !p.code.trim() || !Number.isInteger(p.quantity) || p.quantity <= 0,
          )
        )
          throw new Error('Linh kiện cần tên, mã và số lượng nguyên dương.');
        state.tickets.push({
          ...input,
          id,
          progress: 'REPAIRING',
          notes: '',
          createdAt: state.now,
          timeline: [{ at: state.now, message: 'Tiếp nhận lệnh & lập phiếu' }],
        });
      });
      return id;
    }),
  updateProgress: (id: string, progress: RepairProgress, notes: string) =>
    mockAction(() =>
      updateState((state) => {
        const ticket = state.tickets.find((t) => t.id === id);
        if (!ticket || ticket.progress === 'DONE' || ticket.progress === 'UNREPAIRABLE')
          throw new Error('Phiếu đã đóng hoặc không tồn tại.');
        if (
          state.orders.find((o) => o.id === ticket.orderId)?.technicianId !==
          state.activeTechnicianId
        )
          throw new Error('Phiếu không thuộc kỹ thuật viên demo đang chọn.');
        if (!notes.trim()) throw new Error('Vui lòng nhập ghi chú cập nhật cho Đơn vị vận hành.');
        ticket.progress = progress;
        ticket.notes = notes.trim();
        const label = {
          REPAIRING: 'Đang sửa',
          WAITING_PARTS: 'Chờ linh kiện',
          DONE: 'Hoàn tất · chờ xác minh cảm biến',
          UNREPAIRABLE: 'Ngừng sử dụng',
        }[progress];
        ticket.timeline.push({ at: state.now, message: `${label} – ${notes.trim()}` });
        const r = state.resources.find((item) => item.id === ticket.resourceId)!;
        if (progress === 'DONE' || progress === 'UNREPAIRABLE') {
          r.status = progress === 'DONE' ? 'PENDING_CHECK' : 'OUT_OF_SERVICE';
          for (const i of state.incidents.filter(
            (i) => i.orderId === ticket.orderId && i.resourceId === r.id,
          )) {
            i.status = 'CLOSED';
            i.closedAt = state.now;
          }
          const order = state.orders.find((o) => o.id === ticket.orderId)!;
          if (
            order.resourceIds.every((resourceId) =>
              state.tickets.some(
                (t) =>
                  t.orderId === order.id &&
                  t.resourceId === resourceId &&
                  (t.progress === 'DONE' || t.progress === 'UNREPAIRABLE'),
              ),
            )
          )
            order.status = 'CLOSED';
        }
      }),
    ),
  verifyResource: (id: string) =>
    mockAction(() =>
      updateState((state) => {
        const r = state.resources.find((item) => item.id === id);
        if (!r || r.status !== 'PENDING_CHECK')
          throw new Error('Tài nguyên không ở trạng thái Chờ kiểm tra.');
        if (state.deviceOffline || !r.telemetryFresh || !r.correctHub)
          throw new Error(
            'Dữ liệu cảm biến chưa hợp lệ hoặc sai Hub. Tài nguyên tiếp tục chờ kiểm tra.',
          );
        if (state.incidents.some((i) => i.resourceId === id && i.status !== 'CLOSED'))
          throw new Error('Tài nguyên còn phiếu sự cố đang mở.');
        r.status = r.kind === 'VEHICLE' && r.battery < 20 ? 'NEEDS_CHARGE' : 'AVAILABLE';
        r.errorCode = '';
        r.description = 'Đã xác minh sau bảo trì';
      }),
    ),
  saveIncidentNotes: (id: string, notes: string) =>
    mockAction(() =>
      updateState((state) => {
        const incident = state.incidents.find((i) => i.id === id);
        if (!incident) throw new Error('Phiếu sự cố không tồn tại.');
        if (notes.length > 1000) throw new Error('Ghi chú tối đa 1000 ký tự.');
        incident.notes = notes.trim();
      }),
    ),
  // Operator acceptance (nghiệm thu): only after repairs are closed and the resource left maintenance / pending check.
  acceptIncident: (id: string) =>
    mockAction(() =>
      updateState((state) => {
        const incident = state.incidents.find((i) => i.id === id);
        if (!incident || incident.status !== 'CLOSED' || incident.acceptedAt)
          throw new Error('Chỉ nghiệm thu phiếu đã sửa chữa xong và chưa đóng.');
        const r = state.resources.find((item) => item.id === incident.resourceId);
        if (!r || ['FAULTY', 'MAINTENANCE_LOCKED', 'PENDING_CHECK'].includes(r.status))
          throw new Error(
            'Tài nguyên chưa được xác minh sau bảo trì. Chờ dữ liệu cảm biến trước khi nghiệm thu.',
          );
        incident.acceptedAt = state.now;
      }),
    ),
};
