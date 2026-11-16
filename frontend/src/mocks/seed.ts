import type { DemoState } from '../shared/types';
import { atVietnam, dayInput } from '../shared/format';

export function createSeed(): DemoState {
  const day = dayInput(new Date().toISOString());
  const at = (clock: string) => atVietnam(day, clock);
  return {
    version: 1, now: at('15:52'), deviceOffline: false, simulateConflict: false, activeTechnicianId: 'tech-1',
    hubs: [
      { id: 'ktx-a', name: 'KTX Khu A (Cổng chính)', shortName: 'KTX Khu A', slots: ['P-12', 'P-14', 'P-21', 'P-22', 'P-30', 'P-33'], ports: [{ id: '03', connector: 'Type 2 / AC', power: 3.3 }, { id: '05', connector: 'Type 2 / AC', power: 3.3 }, { id: '06', connector: 'Type 2 / AC', power: 7 }] },
      { id: 'ktx-b', name: 'KTX Khu B', shortName: 'KTX Khu B', slots: ['P-01', 'P-02'], ports: [] },
      { id: 'library', name: 'Thư viện Trung tâm', shortName: 'Thư viện TT', slots: ['P-01', 'P-02', 'P-03'], ports: [{ id: '01', connector: 'Type 2 / AC', power: 7 }, { id: '02', connector: 'CCS2 / DC', power: 22 }] },
    ],
    vehicles: [
      { id: 'pv-1', plate: '59-X1 123.45', type: 'MOTORBIKE', battery: 3.5, connector: 'Type 2 / AC', model: 'VinFast Evo200', color: 'Xanh Bạc' },
      { id: 'pv-2', plate: '59-MĐ1 045.12', type: 'BICYCLE', battery: 1.2, connector: 'Type 2 / AC', model: 'DatBike Weaver', color: 'Đen' },
    ],
    bookings: [{ id: `BK-${day.replace(/-/g, '')}-094`, vehicleId: 'pv-1', hubId: 'ktx-a', slotId: 'P-12', portId: '03', service: 'BOTH', startAt: at('15:00'), endAt: at('17:00'), status: 'IN_USE', token: 'unigo-demo-BK-094', energy: 1.12, battery: 64, checkedInAt: at('15:04'), resourcePending: false, timeline: [{ at: at('15:04'), message: 'Check-in thành công', detail: 'Quét QR tại cổng #03 · đúng Hub, đúng biển số, trong ngưỡng 15 phút' }, { at: at('15:05'), message: 'Thiết bị xác nhận bắt đầu phiên đỗ & sạc', detail: 'Trạng thái phiên: Đang sử dụng' }] }],
    resources: [
      { id: 'UG-018', name: 'Xe đạp điện UG-018', kind: 'VEHICLE', hubId: 'ktx-a', errorCode: 'E-TIRE-01', description: 'Xẹp lốp sau (sinh viên báo cáo)', status: 'FAULTY', battery: 92, telemetryFresh: true, correctHub: true },
      { id: 'UG-040', name: 'Xe đạp điện UG-040', kind: 'VEHICLE', hubId: 'ktx-a', errorCode: 'E-BAT-07', description: 'Điện áp cell pin bất thường', status: 'FAULTY', battery: 14, telemetryFresh: true, correctHub: true },
      { id: 'UG-077', name: 'Xe máy điện UG-077', kind: 'VEHICLE', hubId: 'library', errorCode: 'E-LOCK-03', description: 'Khóa xe không phản hồi lệnh', status: 'FAULTY', battery: 81, telemetryFresh: true, correctHub: true },
      { id: 'UG-091', name: 'Xe máy điện UG-091', kind: 'VEHICLE', hubId: 'ktx-b', errorCode: 'E-GPS-01', description: 'Mất tín hiệu định vị', status: 'IN_USE', battery: 52, telemetryFresh: false, correctHub: false },
      { id: 'CHG-A-04', name: 'Cổng #04', kind: 'PORT', hubId: 'ktx-a', errorCode: 'E-CHG-02', description: 'Cổng sạc ngắt phiên liên tục', status: 'FAULTY', battery: 0, telemetryFresh: true, correctHub: true },
      { id: 'CHG-L-02', name: 'Cổng #02', kind: 'PORT', hubId: 'library', errorCode: '', description: 'Hoạt động bình thường', status: 'AVAILABLE', battery: 0, telemetryFresh: true, correctHub: true },
    ],
    incidents: [
      { id: 'SC-1094', resourceId: 'UG-018', hubId: 'ktx-a', category: 'Xẹp lốp / thủng săm', description: 'Lốp sau bị xẹp khi đang đi trên đường Tạ Quang Bửu, gần cổng KTX Khu A.', photos: [], priority: 'HIGH', status: 'OPEN', createdAt: at('15:40'), source: 'STUDENT' },
      { id: 'SC-1093', resourceId: 'CHG-A-04', hubId: 'ktx-a', category: 'Ngắt phiên sạc', description: 'Cổng sạc #04 ngắt phiên liên tục.', photos: [], priority: 'MEDIUM', status: 'OPEN', createdAt: at('15:20'), source: 'SYSTEM' },
    ],
    technicians: [{ id: 'tech-1', name: 'Nguyễn Văn Nam', area: 'Đội 1 · khu KTX A–B' }, { id: 'tech-2', name: 'Trần Thị Linh', area: 'Đội 2 · Thư viện TT' }],
    orders: [], tickets: [],
  };
}
