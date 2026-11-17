import type { TimelineEvent } from '../../pv/types';

/** MT domain types (MT01–05). */
export type ResourceStatus =
  | 'FAULTY'
  | 'IN_USE'
  | 'AVAILABLE'
  | 'MAINTENANCE_LOCKED'
  | 'PENDING_CHECK'
  | 'NEEDS_CHARGE'
  | 'OUT_OF_SERVICE';

export type RepairProgress = 'REPAIRING' | 'WAITING_PARTS' | 'DONE' | 'UNREPAIRABLE';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Resource {
  id: string;
  name: string;
  kind: 'VEHICLE' | 'PORT';
  hubId: string;
  errorCode: string;
  description: string;
  status: ResourceStatus;
  battery: number;
  telemetryFresh: boolean;
  correctHub: boolean;
}

export interface Incident {
  id: string;
  resourceId: string;
  hubId: string;
  category: string;
  description: string;
  photos: string[];
  priority: Priority;
  status: 'OPEN' | 'ASSIGNED' | 'CLOSED';
  createdAt: string;
  technicianId?: string;
  orderId?: string;
  source?: 'STUDENT' | 'SYSTEM';
  notes?: string;
  closedAt?: string;
  acceptedAt?: string;
}

export interface Technician {
  id: string;
  name: string;
  area: string;
}

export interface MaintenanceOrder {
  id: string;
  resourceIds: string[];
  technicianId: string;
  priority: Priority;
  dueAt: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}

export interface Part {
  name: string;
  code: string;
  quantity: number;
}

export interface MaintenanceTicket {
  id: string;
  orderId: string;
  resourceId: string;
  diagnosis: string;
  repairItems: string[];
  parts: Part[];
  photos: string[];
  progress: RepairProgress;
  notes: string;
  createdAt: string;
  timeline: TimelineEvent[];
}
