# Frontend - Smart E-Mobility Hub

React 18 + TypeScript + Vite 7 + React Router 7 frontend for the Smart E-Mobility Hub system.

## Quick Start

```bash
cd frontend
npm ci
npm run dev
```

App runs at `http://localhost:5173` (proxies `/api` → `http://localhost:8080`).

## Environment Variables

Create `.env.local` in `frontend/` (or set in your shell):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_USE_MOCK` | `true` | **Mock mode** — uses in-memory mock data for all API calls. Set to `false` to hit real backend. |
| `VITE_API_BASE` | `''` (rỗng) | Tiền tố URL backend. Để trống khi dev: các đường dẫn `/api/v1/...` được Vite proxy sang `localhost:8080`. Production: đặt origin backend (vd `https://api.example.com`). |

### Example: Run with real backend

```bash
# Terminal 1: Start backend (separate repo/branch)
docker-compose up -d postgres
cd ../backend && ./mvnw spring-boot:run

# Terminal 2: Start frontend with real API
VITE_USE_MOCK=false npm run dev
```

> **Note:** Backend AC endpoints are on branch `feature/AC-MO`, RB endpoints on `RE-PV-RB`. To run both, you need a merged backend workspace.

## Mock Accounts (when `VITE_USE_MOCK=true`)

| Role | Username | Password | Portal |
|------|----------|----------|--------|
| Student | `student` | `student123` | `/student` (cổng sinh viên) |
| Operator | `operator` | `operator123` | `/rebalance` (vận hành) |
| Driver | `driver` | `driver123` | `/driver` (tài xế) |
| Technician | `tech` | `tech123` | `/internal/login` → chọn Kỹ thuật viên |

> Passwords are mock-only. Real backend uses bcrypt hashes from `2__seed.sql` (đổi mật khẩu ở mock chỉ sống trong bộ nhớ, tải lại trang sẽ reset).

## Project Structure

```
frontend/src/
├── api/
│   ├── client.ts          # HTTP client (Bearer token, lỗi chuẩn hoá, 401 → logout), USE_MOCK
│   ├── authApi.ts         # login, register, me, profile, trips, rating (AC)
│   ├── hubApi.ts          # Hub (AC01) — hiện trả dữ liệu mock vì backend chưa có Hub API
│   └── networkApi.ts      # (nhóm khác)
├── components/icons/      # Icon SVG dùng chung (StarIcon, RefreshIcon, CloseIcon, PlusIcon)
├── auth/                  # AuthContext, RequireAuth (guard theo role), storage an toàn
├── layouts/
│   ├── StudentLayout.tsx  # Navbar: Trang chủ · Đặt chỗ · Chuyến đi · Tài khoản
│   ├── InternalDriverLayout.tsx  # Tab: Lệnh được giao · Lịch sử lệnh · Báo cáo sự cố
│   └── AppLayout.tsx      # Sidebar + Topbar vận hành (dùng chung với TV4)
├── features/
│   ├── auth/
│   │   ├── pages/         # LoginStudent (AC03), LoginInternal, Register (AC02), RegisterSuccess
│   │   └── constants.ts   # Vai trò/khu vực của cổng nội bộ
│   ├── ac/
│   │   ├── pages/         # SearchHubPage (AC01), ProfilePage (AC04), TripHistoryPage (AC05), RateTripPage (AC06)
│   │   ├── components/    # StarRating (kèm CSS riêng)
│   │   ├── utils/         # tripCode.ts — mã chuyến hiển thị "UGddMMyy-xxx"
│   │   └── constants.ts   # Nhãn sao, loại sự cố, cỡ trang
│   └── rb/
│       ├── api/transferApi.ts   # RB01/RB02 (mock + thật)
│       ├── pages/         # DispatchBoardPage (RB01), DriverOrdersPage (RB02: lệnh / lịch sử / sự cố)
│       ├── components/    # ImbalanceAlertCard, SuggestionBanner, DispatchColumn, CreateOrderModal, OrderDetailModal, OrderTimeline, HandoverGrid
│       ├── rb.css, components/driver.css
│       └── types.ts
├── mocks/                 # accountMock (auth/hồ sơ/chuyến đi/đánh giá), hubsMock (AC01), transfersMock (RB)
├── styles/                # tokens.css (biến CSS), global.css
└── App.tsx                # Routes + guards
```

CSS tách khỏi `.tsx`, mỗi màn một file. Class đặt theo BEM với tên block đầy đủ (`trip-history__chip--green`, `hub-search__pin`, `rate-trip__card`, `profile__field`, `register__pledge`, `rebalance__modal`, `star-rating__star`) để không đụng class của nhóm khác. Style inline chỉ dùng cho giá trị động (toạ độ pin, % pin, ...).

## Routes

| Route | Page | Guard |
|-------|------|-------|
| `/login` | Student login (AC03) | Public |
| `/register` | Student register (AC02) | Public |
| `/register/success` | Register success | Public |
| `/internal/login` | Internal login (AUTH) | Public |
| `/student` or `/home` | Student home (AC01 redirect) | STUDENT |
| `/student/hubs` | Search Hub (AC01) | STUDENT |
| `/account` / `/account/profile` | Profile (AC04) | STUDENT |
| `/account/trips` | Trip history (AC05) | STUDENT |
| `/account/trips/:id/rate` | Rate trip (AC06) | STUDENT |
| `/rebalance` | Dispatch board (RB01) | OPERATOR |
| `/driver` | Driver orders (RB02) | DRIVER |
| `/driver/history` | Lịch sử lệnh (mock) | DRIVER |
| `/driver/incidents` | Báo cáo sự cố (placeholder, thuộc MT01) | DRIVER |

TV4's routes (`/overview`, `/hubs`, `/vehicles`, `/charging-schedules`, `/simulations`) are **not guarded** by this feature — they remain as-is.

## Role-based Login Flow

1. User logs in at `/login` (student) or `/internal/login` (operator/driver/tech).
2. Backend returns `user.role` (STUDENT / OPERATOR / DRIVER / TECHNICIAN).
3. Frontend redirects:
   - STUDENT → `/account` (or `/student/hubs`)
   - OPERATOR → `/rebalance` (or `/overview`)
   - DRIVER → `/driver`
   - TECHNICIAN → placeholder (TV3)
4. If selected role ≠ backend role → error "Tài khoản không thuộc vai trò đã chọn" + logout.

## Design Tokens

All colors, spacing, radii, fonts are defined in `src/styles/tokens.css` as CSS variables:

```css
:root {
  --primary: #5b8def;
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-amber: #f59e0b;
  --radius-card: 18px;
  --radius-panel: 20px;
  --font-family: 'Inter', system-ui, sans-serif;
  /* ... */
}
```

**Never hardcode colors in components** — use tokens or utility classes (`.card`, `.btn`, `.tone-*`, `.page-head`, etc.).

## Mock vs Real API Pattern

Every API file exports:
- `*Api` functions (e.g., `getTripHistoryApi`) — check `USE_MOCK`, call mock or real `http()`
- TypeScript types re-exported from mocks

```ts
// Example pattern
import { http, USE_MOCK } from '../../../api/client';
import { mockGetTrips, type TripSummary } from '../../../mocks/tripsMock';

export async function getTripHistoryApi(params): Promise<PageResponse<TripSummary>> {
  if (USE_MOCK) return mockGetTrips(params);
  return http<PageResponse<TripSummary>>(`/api/v1/me/trips?...`);
}
```

## Mock rules (RB, dùng để demo)

- Hub đích "Thư viện TT" tối đa 8 xe, vượt → `409 HUB_FULL`.
- Xe `UG-140` đang có lệnh khác → `409 VEHICLE_HAS_OPERATION`.
- Đội tài xế 1/2 → `201 ASSIGNED`; đội 3 (không rảnh) → `202 PENDING` (`NO_FREE_DRIVER`); bỏ trống → tự chọn đội 1.
- Tài xế mock: Trần Văn Bình (`driver` / `driver123`).

## Known Backend Gaps (mock-only)

Chi tiết ở `plan_frontend_AC_RB.md` mục 9:

- Chưa có Hub API (AC01) → `hubsMock.ts`.
- `TripSummary` thật chỉ có id (thiếu tên Hub/mã xe) → mock đầy đủ.
- Chưa có endpoint upload ảnh (AC06) → ảnh chỉ giữ cục bộ, gửi `photoUrls: []`.
- Chưa có API cảnh báo mất cân bằng (RB01), `TransferOrderResponse` thiếu tên hiển thị → mock.
- App tài xế: chỉ có `current`; chưa có lịch sử / sự cố / đổi Hub đích / báo xe hỏng.

## Build & Lint

```bash
npm run build       # tsc --noEmit + vite build (production)
npm run lint        # if eslint configured
```

## Tech Stack

- React 18, TypeScript 5.6, Vite 7
- React Router 7 (declarative routes + Outlet guards)
- No UI library — custom CSS with design tokens
- Inter font (self-hosted via `@fontsource/inter` or CDN)
- Mock-first development (`VITE_USE_MOCK=true` by default)

## Contributing (TV1 — Trần Tiến Đạt)

This frontend covers **AC (6 use cases) + RB (2 use cases)** only.
- Do **not** modify TV4's features (MO, SC, SI) or shared layouts (`AppLayout`, `Topbar`, `Sidebar`) beyond adding routes.
- Do **not** add heavy dependencies without asking.
- Follow the feature-based structure: `src/features/<ma>/{pages,components,hooks,types.ts,constants.ts,*.css}`.
- Write Vietnamese UI text.
- Test at 1280px and 1440px (Figma desktop targets).