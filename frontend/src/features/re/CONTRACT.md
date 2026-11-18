# RE: contract FE đang dùng

FE gọi đúng backend **hiện tại** (`backend/.../module/rental`). Những chỗ dưới đây là **đề xuất cho BE (TV2)**, chưa có ở backend; mock trong `mocks/handlers.ts` đã làm theo đề xuất này.

## Đã có ở backend (FE bám nguyên)

| Method | URL | Ghi chú |
|---|---|---|
| `POST` | `/api/v1/reservations` `{vehicleId}` | 201 + `ReservationResponse` |
| `GET` | `/api/v1/reservations/current` | 200 + đơn, hoặc **204** nếu không có |

Lỗi RE01 FE đang xử lý: `ACTIVE_RESERVATION_EXISTS` (409), `NOT_FOUND` (404), `VEHICLE_HAS_OPERATION` (409), `VEHICLE_UNAVAILABLE` (409), `LOW_BATTERY` (422, `details.batteryPercent`, `details.minBatteryPercent`).

## Đề xuất, backend chưa có

| Method | URL | Response | Lý do |
|---|---|---|---|
| `GET` | `/api/v1/hubs` | `[{id, code, name, latitude, longitude}]` | Hiện tên Hub; `SecurityConfig` đã mở sẵn `GET /api/v1/hubs/**` |
| `GET` | `/api/v1/vehicles?hubId=&status=AVAILABLE` | `[{id, code, type, hubId, status, batteryPercent, rangeKm}]` | Danh sách xe để đặt (B.5) |
| `GET` | `/api/v1/vehicles/{id}` | như một phần tử ở trên | Màn RE01 cần mã xe, loại xe, pin |

Gợi ý thay thế: thêm vào `ReservationResponse` một object `vehicle {code, type, batteryPercent, rangeKm}` và `hubName`. Khi đó RE01 chỉ cần gọi 1 API.

## Khác biệt với tài liệu `CLAUDE_BTL_SmartEMobilityHub.md` (cần nhóm chốt)

- `/reservations/active` (404) ↔ backend `/reservations/current` (204).
- Enum xe: tài liệu `READY/UNLOCKING/FAULT/MAINTENANCE` ↔ backend `AVAILABLE/PICKUP_PENDING/FAULTY/MAINTENANCE_LOCKED`.
- Mã lỗi: `VEHICLE_NO_LONGER_AVAILABLE` ↔ `VEHICLE_UNAVAILABLE`, `BATTERY_TOO_LOW` ↔ `LOW_BATTERY`.
- Mã đơn: tài liệu `DX-ddMMyy-nnnn` ↔ backend `RS` + 10 ký tự hex.
- Hết hạn: tài liệu xe → `PENDING_CHECK` ↔ backend xe → `AVAILABLE`/`NEEDS_CHARGE`.
- Response không trả ô đỗ (`P-07` trên Figma) và các luật (`maxExtensions`, `holdMinutes`). FE giữ bản sao luật trong `types.ts` (`RESERVATION_RULES`).
