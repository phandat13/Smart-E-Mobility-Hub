export interface TripSummary {
  id: number;
  vehicleId: number;
  vehicleCode?: string;
  startHubId: number;
  startHubName?: string;
  endHubId: number;
  endHubName?: string;
  startedAt: string;
  endedAt: string;
  distanceKm: number | null;
  cost: number;
  rated: boolean;
}

export interface TripDetail {
  id: number;
  vehicleId: number;
  vehicleCode: string;
  startHubId: number;
  startHubName: string;
  endHubId: number;
  endHubName: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  distanceKm: number | null;
  startBattery: number | null;
  endBattery: number | null;
  cost: number;
  rating: RatingResponse | null;
}

export interface RatingRequest {
  vehicleStars: number;
  hubStars: number;
  comment?: string;
  photoUrls?: string[];
  reportIncident: boolean;
  incidentCategory?: string;
  safetyIssue: boolean;
}

export interface RatingResponse {
  tripId: number;
  vehicleStars: number;
  hubStars: number;
  comment: string | null;
  photoUrls: string[];
  incidentReported: boolean;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export type TripTab = 'trips' | 'bookings';