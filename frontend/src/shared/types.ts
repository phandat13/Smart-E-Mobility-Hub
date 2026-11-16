export type ServiceType = 'PARK' | 'CHARGE' | 'BOTH';
export type BookingStatus = 'BOOKED' | 'IN_USE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
export type ResourceStatus = 'FAULTY' | 'IN_USE' | 'AVAILABLE' | 'MAINTENANCE_LOCKED' | 'PENDING_CHECK' | 'NEEDS_CHARGE' | 'OUT_OF_SERVICE';
export type RepairProgress = 'REPAIRING' | 'WAITING_PARTS' | 'DONE' | 'UNREPAIRABLE';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export interface PersonalVehicle { id: string; plate: string; type: 'MOTORBIKE' | 'BICYCLE'; battery: number; connector: string; model: string; color?: string }
export interface Port { id: string; connector: string; power: number }
export interface Hub { id: string; name: string; shortName: string; slots: string[]; ports: Port[] }
export interface TimelineEvent { at: string; message: string; detail?: string }
export interface Booking {
  id: string; vehicleId: string; hubId: string; slotId: string; portId?: string; service: ServiceType;
  startAt: string; endAt: string; status: BookingStatus; token: string; energy: number; battery: number;
  checkedInAt?: string; checkedOutAt?: string; cost?: number; resourcePending: boolean; timeline: TimelineEvent[];
  vehicleSnapshot?: PersonalVehicle;
}
export interface Resource {
  id: string; name: string; kind: 'VEHICLE' | 'PORT'; hubId: string; errorCode: string; description: string;
  status: ResourceStatus; battery: number; telemetryFresh: boolean; correctHub: boolean;
}
export interface Incident {
  id: string; resourceId: string; hubId: string; category: string; description: string; photos: string[];
  priority: Priority; status: 'OPEN' | 'ASSIGNED' | 'CLOSED'; createdAt: string; technicianId?: string; orderId?: string;
  source?: 'STUDENT' | 'SYSTEM'; notes?: string; closedAt?: string; acceptedAt?: string;
}
export interface Technician { id: string; name: string; area: string }
export interface MaintenanceOrder { id: string; resourceIds: string[]; technicianId: string; priority: Priority; dueAt: string; status: 'OPEN' | 'CLOSED'; createdAt: string }
export interface Part { name: string; code: string; quantity: number }
export interface MaintenanceTicket {
  id: string; orderId: string; resourceId: string; diagnosis: string; repairItems: string[]; parts: Part[]; photos: string[];
  progress: RepairProgress; notes: string; createdAt: string; timeline: TimelineEvent[];
}
export interface DemoState {
  version: 1; now: string; deviceOffline: boolean; simulateConflict: boolean; activeTechnicianId: string;
  hubs: Hub[]; vehicles: PersonalVehicle[]; bookings: Booking[]; resources: Resource[];
  incidents: Incident[]; technicians: Technician[]; orders: MaintenanceOrder[]; tickets: MaintenanceTicket[];
}
