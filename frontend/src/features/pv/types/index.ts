/** PV domain types (PV01–04). */
export type ServiceType = 'PARK' | 'CHARGE' | 'BOTH';

export type BookingStatus = 'BOOKED' | 'IN_USE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface PersonalVehicle {
  id: string;
  plate: string;
  type: 'MOTORBIKE' | 'BICYCLE';
  battery: number;
  connector: string;
  model: string;
  color?: string;
}

export interface Port {
  id: string;
  connector: string;
  power: number;
}

export interface Hub {
  id: string;
  name: string;
  shortName: string;
  slots: string[];
  ports: Port[];
}

export interface TimelineEvent {
  at: string;
  message: string;
  detail?: string;
}

export interface Booking {
  id: string;
  vehicleId: string;
  hubId: string;
  slotId: string;
  portId?: string;
  service: ServiceType;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  token: string;
  energy: number;
  battery: number;
  checkedInAt?: string;
  checkedOutAt?: string;
  cost?: number;
  resourcePending: boolean;
  timeline: TimelineEvent[];
  vehicleSnapshot?: PersonalVehicle;
}

/** Input for creating a PV01 booking. */
export interface BookingInput {
  vehicleId: string;
  hubId: string;
  service: ServiceType;
  startAt: string;
  endAt: string;
  slotId: string;
  portId?: string;
}
