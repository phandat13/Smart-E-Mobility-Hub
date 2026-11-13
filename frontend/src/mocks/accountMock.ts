import type { RegisterRequest, TokenResponse, UserResponse, StudentInfo, UpdateProfileRequest, TripSummary, TripDetail, PageResponse } from '../api/authApi';

const MOCK_USERS: Map<string, { user: UserResponse; password: string }> = new Map();

const seedUsers = [
  {
    username: 'student',
    password: 'student123',
    role: 'STUDENT' as const,
    fullName: 'Nguyễn Văn An',
    studentCode: '2410734',
    phone: '0901234567',
    email: 'an.nguyen@student.hcmut.edu.vn',
    citizenId: '079200001234',
  },
  {
    username: 'operator',
    password: 'operator123',
    role: 'OPERATOR' as const,
    fullName: 'Lê Thu Trang',
    studentCode: '',
    phone: '0901234568',
    email: 'trang.le@hcmut.edu.vn',
    citizenId: '',
  },
  {
    username: 'driver',
    password: 'driver123',
    role: 'DRIVER' as const,
    fullName: 'Trần Văn Bình',
    studentCode: '',
    phone: '0901234569',
    email: 'binh.tran@hcmut.edu.vn',
    citizenId: '',
  },
  {
    username: 'tech',
    password: 'tech123',
    role: 'TECHNICIAN' as const,
    fullName: 'Phạm Văn Nam',
    studentCode: '',
    phone: '0901234570',
    email: 'nam.pham@hcmut.edu.vn',
    citizenId: '',
  },
];

seedUsers.forEach((u) => {
  const student: StudentInfo | null = u.role === 'STUDENT' ? {
    studentCode: u.studentCode,
    phone: u.phone,
    email: u.email,
    citizenIdMasked: '********' + u.citizenId.slice(-4),
    address: 'Khu phố 6, TP. Thủ Đức',
    nickname: 'An',
    verified: true,
  } : null;

  const user: UserResponse = {
    id: MOCK_USERS.size + 1,
    username: u.username,
    role: u.role,
    fullName: u.fullName,
    status: 'ACTIVE',
    student,
  };

  MOCK_USERS.set(u.username, { user, password: u.password });
});

function generateToken(user: UserResponse): TokenResponse {
  const expiresAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();
  const payload = { sub: user.username, role: user.role, exp: Math.floor(Date.now() / 1000) + 120 * 60 };
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa('mock-signature');
  const accessToken = `${header}.${body}.${signature}`;

  return { accessToken, tokenType: 'Bearer', expiresAt, user };
}

export async function mockLogin(username: string, password: string): Promise<TokenResponse> {
  await new Promise((r) => setTimeout(r, 300));
  const record = MOCK_USERS.get(username);
  if (!record || record.password !== password) {
    const err = new Error('Thông tin đăng nhập không chính xác') as Error & { code: string; status: number };
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }
  if (record.user.status !== 'ACTIVE') {
    const err = new Error('Tài khoản đã bị khóa') as Error & { code: string; status: number };
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }
  return generateToken(record.user);
}

export async function mockRegister(data: RegisterRequest): Promise<UserResponse> {
  await new Promise((r) => setTimeout(r, 400));
  if (MOCK_USERS.has(data.username)) {
    const err = new Error('Tên đăng nhập đã tồn tại') as Error & { code: string; details: Record<string, unknown> };
    err.code = 'USERNAME_TAKEN';
    err.details = { field: 'username' };
    throw err;
  }
  if (MOCK_USERS.has(data.email)) {
    const err = new Error('Email đã được đăng ký') as Error & { code: string; details: Record<string, unknown> };
    err.code = 'CONFLICT';
    err.details = { field: 'email' };
    throw err;
  }
  if (!/^\d{12}$/.test(data.citizenId)) {
    const err = new Error('Số CCCD/CMND không hợp lệ') as Error & { code: string; details: Record<string, unknown> };
    err.code = 'CITIZEN_ID_INVALID';
    err.details = { field: 'citizenId' };
    throw err;
  }

  const student: StudentInfo = {
    studentCode: data.studentCode,
    phone: data.phone,
    email: data.email,
    citizenIdMasked: '********' + data.citizenId.slice(-4),
    address: null,
    nickname: null,
    verified: false,
  };

  const user: UserResponse = {
    id: MOCK_USERS.size + 1,
    username: data.username,
    role: 'STUDENT',
    fullName: data.fullName,
    status: 'ACTIVE',
    student,
  };

  MOCK_USERS.set(data.username, { user, password: data.password });
  return user;
}

export async function mockGetMe(username: string): Promise<UserResponse> {
  await new Promise((r) => setTimeout(r, 200));
  const record = MOCK_USERS.get(username);
  if (!record) {
    const err = new Error('Phiên đăng nhập không hợp lệ') as Error & { code: string; status: number };
    err.code = 'TOKEN_INVALID';
    err.status = 401;
    throw err;
  }
  return record.user;
}

export async function mockUpdateProfile(username: string, data: UpdateProfileRequest): Promise<UserResponse> {
  await new Promise((r) => setTimeout(r, 300));
  const record = MOCK_USERS.get(username);
  if (!record) {
    const err = new Error('Phiên đăng nhập không hợp lệ') as Error & { code: string; status: number };
    err.code = 'TOKEN_INVALID';
    err.status = 401;
    throw err;
  }

  if (data.currentPassword && data.currentPassword !== record.password) {
    const err = new Error('Mật khẩu hiện tại không đúng') as Error & { code: string; details: Record<string, unknown> };
    err.code = 'VALIDATION_FAILED';
    err.details = { currentPassword: 'Mật khẩu hiện tại không đúng' };
    throw err;
  }

  if (data.newPassword) {
    if (data.newPassword.length < 8 || data.newPassword.length > 72 || !/[a-zA-Z]/.test(data.newPassword) || !/[0-9]/.test(data.newPassword)) {
      const err = new Error('Mật khẩu mới không hợp lệ') as Error & { code: string; details: Record<string, unknown> };
      err.code = 'VALIDATION_FAILED';
      err.details = { newPassword: 'Mật khẩu 8-72 ký tự, có chữ và số' };
      throw err;
    }
    record.password = data.newPassword;
  }

  if (data.fullName) record.user.fullName = data.fullName;
  if (data.phone) {
    record.user.student = record.user.student ? { ...record.user.student, phone: data.phone } : null;
  }
  if (data.address && record.user.student) {
    record.user.student = { ...record.user.student, address: data.address };
  }
  if (data.nickname && record.user.student) {
    record.user.student = { ...record.user.student, nickname: data.nickname };
  }

  return record.user;
}

// Mock trip data
// Dữ liệu chuyến đi mẫu lấy từ Figma AC05 (ngày hiện tại trong Figma: 07/10/2026).
interface TripSeed {
  id: number; vehicleId: number; vehicleCode: string; vehicleType: string;
  startHubId: number; startHubName: string; endHubId: number; endHubName: string;
  startedAt: string; minutes: number; km: number; cost: number;
  startBattery: number; endBattery: number;
  rating?: { vehicleStars: number; hubStars: number; comment: string | null; incidentReported: boolean };
}

const TRIP_SEEDS: TripSeed[] = [
  { id: 71026018, vehicleId: 18, vehicleCode: 'UG-018', vehicleType: 'Xe đạp điện', startHubId: 1, startHubName: 'KTX Khu A', endHubId: 4, endHubName: 'Thư viện TT', startedAt: '2026-10-07T14:35:00+07:00', minutes: 24, km: 2.8, cost: 12000, startBattery: 92, endBattery: 76 },
  { id: 50926031, vehicleId: 31, vehicleCode: 'UG-031', vehicleType: 'Xe máy điện', startHubId: 6, startHubName: 'Ga Metro', endHubId: 7, endHubName: 'H6', startedAt: '2026-10-05T07:12:00+07:00', minutes: 11, km: 1.6, cost: 5500, startBattery: 81, endBattery: 74, rating: { vehicleStars: 5, hubStars: 5, comment: 'Xe chạy êm, pin còn nhiều.', incidentReported: false } },
  { id: 30926022, vehicleId: 22, vehicleCode: 'UG-022', vehicleType: 'Xe máy điện', startHubId: 5, startHubName: 'Nhà văn hóa SV', endHubId: 1, endHubName: 'KTX Khu A', startedAt: '2026-10-03T18:40:00+07:00', minutes: 19, km: 3.4, cost: 9500, startBattery: 88, endBattery: 71, rating: { vehicleStars: 4, hubStars: 4, comment: null, incidentReported: false } },
  { id: 10926009, vehicleId: 9, vehicleCode: 'UG-009', vehicleType: 'Xe đạp điện', startHubId: 1, startHubName: 'KTX Khu A', endHubId: 4, endHubName: 'Thư viện TT', startedAt: '2026-10-01T09:05:00+07:00', minutes: 21, km: 2.7, cost: 10500, startBattery: 79, endBattery: 66, rating: { vehicleStars: 2, hubStars: 4, comment: 'Phanh sau hơi lỏng.', incidentReported: true } },
  { id: 28926018, vehicleId: 18, vehicleCode: 'UG-018', vehicleType: 'Xe đạp điện', startHubId: 4, startHubName: 'Thư viện TT', endHubId: 2, endHubName: 'KTX Khu B', startedAt: '2026-09-28T16:20:00+07:00', minutes: 15, km: 2.1, cost: 7500, startBattery: 90, endBattery: 82, rating: { vehicleStars: 5, hubStars: 5, comment: null, incidentReported: false } },
  { id: 26926040, vehicleId: 40, vehicleCode: 'UG-040', vehicleType: 'Xe máy điện', startHubId: 7, startHubName: 'H6', endHubId: 6, endHubName: 'Ga Metro', startedAt: '2026-09-26T12:02:00+07:00', minutes: 9, km: 1.4, cost: 4500, startBattery: 70, endBattery: 64, rating: { vehicleStars: 4, hubStars: 4, comment: null, incidentReported: false } },
  { id: 24926015, vehicleId: 15, vehicleCode: 'UG-015', vehicleType: 'Xe đạp điện', startHubId: 2, startHubName: 'KTX Khu B', endHubId: 1, endHubName: 'KTX Khu A', startedAt: '2026-09-24T07:30:00+07:00', minutes: 12, km: 1.9, cost: 6000, startBattery: 95, endBattery: 88, rating: { vehicleStars: 5, hubStars: 5, comment: null, incidentReported: false } },
  { id: 22926027, vehicleId: 27, vehicleCode: 'UG-027', vehicleType: 'Xe máy điện', startHubId: 1, startHubName: 'KTX Khu A', endHubId: 5, endHubName: 'Nhà văn hóa SV', startedAt: '2026-09-22T19:10:00+07:00', minutes: 17, km: 3.0, cost: 8500, startBattery: 85, endBattery: 69, rating: { vehicleStars: 3, hubStars: 4, comment: null, incidentReported: false } },
  { id: 20926033, vehicleId: 33, vehicleCode: 'UG-033', vehicleType: 'Xe đạp điện', startHubId: 6, startHubName: 'Ga Metro', endHubId: 4, endHubName: 'Thư viện TT', startedAt: '2026-09-20T08:45:00+07:00', minutes: 26, km: 4.2, cost: 13500, startBattery: 91, endBattery: 72, rating: { vehicleStars: 5, hubStars: 4, comment: null, incidentReported: false } },
  { id: 18926012, vehicleId: 12, vehicleCode: 'UG-012', vehicleType: 'Xe máy điện', startHubId: 4, startHubName: 'Thư viện TT', endHubId: 1, endHubName: 'KTX Khu A', startedAt: '2026-09-18T17:25:00+07:00', minutes: 22, km: 3.1, cost: 10000, startBattery: 77, endBattery: 60, rating: { vehicleStars: 4, hubStars: 5, comment: null, incidentReported: false } },
  { id: 15926044, vehicleId: 44, vehicleCode: 'UG-044', vehicleType: 'Xe đạp điện', startHubId: 7, startHubName: 'H6', endHubId: 2, endHubName: 'KTX Khu B', startedAt: '2026-09-15T13:00:00+07:00', minutes: 14, km: 2.2, cost: 7000, startBattery: 84, endBattery: 75, rating: { vehicleStars: 4, hubStars: 4, comment: null, incidentReported: false } },
  { id: 12926008, vehicleId: 8, vehicleCode: 'UG-008', vehicleType: 'Xe máy điện', startHubId: 2, startHubName: 'KTX Khu B', endHubId: 6, endHubName: 'Ga Metro', startedAt: '2026-09-12T06:50:00+07:00', minutes: 28, km: 5.0, cost: 15500, startBattery: 93, endBattery: 71, rating: { vehicleStars: 5, hubStars: 5, comment: null, incidentReported: false } },
];

const tripEnd = (t: TripSeed) => new Date(new Date(t.startedAt).getTime() + t.minutes * 60000).toISOString();

const MOCK_TRIPS: TripSummary[] = TRIP_SEEDS.map((t) => ({
  id: t.id,
  vehicleId: t.vehicleId,
  vehicleCode: t.vehicleCode,
  vehicleType: t.vehicleType,
  startHubId: t.startHubId,
  startHubName: t.startHubName,
  endHubId: t.endHubId,
  endHubName: t.endHubName,
  startedAt: t.startedAt,
  endedAt: tripEnd(t),
  durationMinutes: t.minutes,
  distanceKm: t.km,
  cost: t.cost,
  rated: !!t.rating,
  vehicleStars: t.rating?.vehicleStars ?? null,
  hubStars: t.rating?.hubStars ?? null,
  incidentReported: t.rating?.incidentReported ?? false,
}));

const MOCK_TRIP_DETAILS: Map<number, TripDetail> = new Map(
  TRIP_SEEDS.map((t) => [
    t.id,
    {
      id: t.id,
      vehicleId: t.vehicleId,
      vehicleCode: t.vehicleCode,
      vehicleType: t.vehicleType,
      startHubId: t.startHubId,
      startHubName: t.startHubName,
      endHubId: t.endHubId,
      endHubName: t.endHubName,
      startedAt: t.startedAt,
      endedAt: tripEnd(t),
      durationMinutes: t.minutes,
      distanceKm: t.km,
      startBattery: t.startBattery,
      endBattery: t.endBattery,
      cost: t.cost,
      rating: t.rating
        ? { tripId: t.id, vehicleStars: t.rating.vehicleStars, hubStars: t.rating.hubStars, comment: t.rating.comment, photoUrls: [], incidentReported: t.rating.incidentReported }
        : null,
    } as TripDetail,
  ])
);

/** Lưu đánh giá vào mock để danh sách và chi tiết cập nhật sau khi gửi. */
export async function mockRateTrip(
  tripId: number,
  data: { vehicleStars: number; hubStars: number; comment?: string; photoUrls?: string[]; reportIncident: boolean },
) {
  await new Promise((r) => setTimeout(r, 300));
  const detail = MOCK_TRIP_DETAILS.get(tripId);
  if (!detail) {
    const err = new Error('Không tìm thấy chuyến đi') as Error & { code: string; status: number };
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (detail.rating) {
    const err = new Error('Chuyến đi đã được đánh giá') as Error & { code: string; status: number };
    err.code = 'TRIP_ALREADY_RATED';
    err.status = 409;
    throw err;
  }
  const rating = {
    tripId,
    vehicleStars: data.vehicleStars,
    hubStars: data.hubStars,
    comment: data.comment || null,
    photoUrls: data.photoUrls || [],
    incidentReported: data.reportIncident,
  };
  detail.rating = rating;
  const summary = MOCK_TRIPS.find((t) => t.id === tripId);
  if (summary) {
    summary.rated = true;
    summary.vehicleStars = rating.vehicleStars;
    summary.hubStars = rating.hubStars;
    summary.incidentReported = rating.incidentReported;
  }
  return rating;
}

export async function mockGetTrips(page: number, size: number): Promise<PageResponse<TripSummary>> {
  await new Promise((r) => setTimeout(r, 300));
  const start = page * size;
  const end = start + size;
  const items = MOCK_TRIPS.slice(start, end);
  return {
    items,
    page,
    size,
    totalItems: MOCK_TRIPS.length,
    totalPages: Math.ceil(MOCK_TRIPS.length / size),
  };
}

export async function mockGetTripDetail(tripId: number): Promise<TripDetail> {
  await new Promise((r) => setTimeout(r, 200));
  const detail = MOCK_TRIP_DETAILS.get(tripId);
  if (!detail) {
    const err = new Error('Không tìm thấy chuyến đi') as Error & { code: string; status: number };
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return detail;
}