import type { Booking, Hub, PersonalVehicle } from '../../features/pv/types';
import type {
  Incident,
  MaintenanceOrder,
  MaintenanceTicket,
  Resource,
  Technician,
} from '../../features/mt/types';

/** Shape of the PV / MT demo state persisted in localStorage. */
export interface DemoState {
  version: 1;
  now: string;
  deviceOffline: boolean;
  simulateConflict: boolean;
  activeTechnicianId: string;
  hubs: Hub[];
  vehicles: PersonalVehicle[];
  bookings: Booking[];
  resources: Resource[];
  incidents: Incident[];
  technicians: Technician[];
  orders: MaintenanceOrder[];
  tickets: MaintenanceTicket[];
}
