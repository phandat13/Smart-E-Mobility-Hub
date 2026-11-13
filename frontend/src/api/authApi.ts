import { http, USE_MOCK } from './client';
import { mockLogin, mockRegister, mockGetMe, mockUpdateProfile, mockGetTrips, mockGetTripDetail, mockRateTrip } from '../mocks/accountMock';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  studentCode: string;
  phone: string;
  email: string;
  citizenId: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  address?: string;
  nickname?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  username: string;
  role: 'STUDENT' | 'OPERATOR' | 'DRIVER' | 'TECHNICIAN';
  fullName: string;
  status: string;
  student: StudentInfo | null;
}

export interface StudentInfo {
  studentCode: string;
  phone: string;
  email: string;
  citizenIdMasked: string;
  address: string | null;
  nickname: string | null;
  verified: boolean;
}

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
  /** Các trường dưới đây chỉ có ở mock. Backend thật hiện chỉ trả id (xem plan mục 9). */
  vehicleType?: string;
  durationMinutes?: number;
  vehicleStars?: number | null;
  hubStars?: number | null;
  incidentReported?: boolean;
}

export interface TripDetail {
  id: number;
  vehicleId: number;
  vehicleCode: string;
  vehicleType?: string;
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

export async function loginApi(data: LoginRequest): Promise<TokenResponse> {
  if (USE_MOCK) return mockLogin(data.username, data.password);
  return http<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerApi(data: RegisterRequest): Promise<UserResponse> {
  if (USE_MOCK) return mockRegister(data);
  return http<UserResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMeApi(): Promise<UserResponse> {
  if (USE_MOCK) {
    const token = localStorage.getItem('auth') || sessionStorage.getItem('auth');
    if (token) {
      try {
        const { user } = JSON.parse(token);
        return mockGetMe(user.username);
      } catch {
        // fall through
      }
    }
    const err = new Error('Phiên đăng nhập không hợp lệ') as Error & { code: string; status: number };
    err.code = 'TOKEN_INVALID';
    err.status = 401;
    throw err;
  }
  return http<UserResponse>('/api/v1/me');
}

export async function updateProfileApi(data: UpdateProfileRequest): Promise<UserResponse> {
  if (USE_MOCK) {
    const token = localStorage.getItem('auth') || sessionStorage.getItem('auth');
    if (token) {
      try {
        const { user } = JSON.parse(token);
        return mockUpdateProfile(user.username, data);
      } catch {
        // fall through
      }
    }
    const err = new Error('Phiên đăng nhập không hợp lệ') as Error & { code: string; status: number };
    err.code = 'TOKEN_INVALID';
    err.status = 401;
    throw err;
  }
  return http<UserResponse>('/api/v1/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function rateTripApi(tripId: number, data: {
  vehicleStars: number;
  hubStars: number;
  comment?: string;
  photoUrls?: string[];
  reportIncident: boolean;
  incidentCategory?: string;
  safetyIssue: boolean;
}): Promise<{
  tripId: number;
  vehicleStars: number;
  hubStars: number;
  comment: string | null;
  photoUrls: string[];
  incidentReported: boolean;
}> {
  if (USE_MOCK) return mockRateTrip(tripId, data);
  return http(`/api/v1/me/trips/${tripId}/rating`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTripsApi(params: { page?: number; size?: number; sort?: string } = {}): Promise<PageResponse<TripSummary>> {
  const { page = 0, size = 20, sort = 'endedAt,desc' } = params;
  if (USE_MOCK) return mockGetTrips(page, size);
  const query = new URLSearchParams({ page: String(page), size: String(size), sort });
  return http<PageResponse<TripSummary>>(`/api/v1/me/trips?${query.toString()}`);
}

export async function getTripDetailApi(tripId: number): Promise<TripDetail> {
  if (USE_MOCK) return mockGetTripDetail(tripId);
  return http<TripDetail>(`/api/v1/me/trips/${tripId}`);
}