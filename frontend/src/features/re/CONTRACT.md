# RE: contract FE đang dùng

FE gọi đúng backend **hiện tại** (`backend/.../module/rental`) ở những API đã có. Phần còn lại là **đề xuất cho BE (TV2)**; mock trong `mocks/handlers.ts` đã làm theo đề xuất này. Kiểu dữ liệu đầy đủ nằm trong [`types.ts`](./types.ts).

Quy ước giữ nguyên như backend: prefix `/api/v1`, lỗi `{code, message, details, path, timestamp}`, thời gian ISO 8601 UTC, "không có" trả **204** (giống `/reservations/current`), danh sách trả `PageResponse` (`core/common/PageResponse.java`).

## 1. Đã có ở backend (FE bám nguyên)

| Method | URL | UC | Ghi chú |
|---|---|---|---|
| `POST` | `/reservations` `{vehicleId}` | RE01 | 201 + `ReservationResponse` |
| `GET` | `/reservations/current` | RE01 | 200 + đơn, hoặc 204 |
| `POST` | `/reservations/{id}/extend` | RE04 | 200 + đơn sau gia hạn |

Lỗi đang xử lý: `ACTIVE_RESERVATION_EXISTS` (409), `NOT_FOUND` (404), `VEHICLE_HAS_OPERATION` (409), `VEHICLE_UNAVAILABLE` (409), `LOW_BATTERY` (422), `RESERVATION_NOT_ACTIVE` (409), `RESERVATION_EXPIRED` (410), `MAX_EXTENSIONS_REACHED` (422).

## 2. Đề xuất, backend chưa có

### Dữ liệu tham chiếu

| Method | URL | Response |
|---|---|---|
| `GET` | `/hubs` | `Hub[]` `{id, code, name, latitude, longitude}` |
| `GET` | `/vehicles?hubId=&status=AVAILABLE` | `Vehicle[]` `{id, code, type, hubId, status, batteryPercent, rangeKm}` |
| `GET` | `/vehicles/{id}` | `Vehicle` |

### RE02 – Lịch sử đặt xe

| Method | URL | Response |
|---|---|---|
| `GET` | `/reservations?status=&page=&size=` | `PageResponse<ReservationSummary>`, mới nhất trước |
| `GET` | `/reservations/{id}` | `ReservationDetail` = Summary + `events[]` |

`ReservationSummary` = `ReservationResponse` + `vehicleCode, vehicleType, hubName, pickedUpAt, completedAt, cancelledAt, returnHubId, returnHubName, tripId`.
`events[]`: `{type: CREATED|EXTENDED|PICKED_UP|RETURNED|CANCELLED|EXPIRED, at, note}` – cần thêm bảng `reservation_event` (B.4) hoặc tự dựng từ các cột thời gian.

### RE03 – Hủy

| Method | URL | Response | Lỗi |
|---|---|---|---|
| `POST` | `/reservations/{id}/cancel` | đơn đã `CANCELLED` | `NOT_FOUND` 404, `RESERVATION_NOT_ACTIVE` 409 (đã nhận xe / đã hủy / hết hạn) |

Xe → `PENDING_CHECK` (B.2), chỉ về `AVAILABLE`/`NEEDS_CHARGE` sau khi job xác minh chạy.

### RE04 – bổ sung một luật

B.2 yêu cầu từ chối gia hạn khi xe được ưu tiên cho quy trình vận hành khác. Backend `extend()` chưa kiểm tra; đề xuất trả **`VEHICLE_HAS_OPERATION` (409)** (dùng lại mã có sẵn thay vì tạo `VEHICLE_PRIORITIZED`).

### RE05 – Nhận xe

| Method | URL | Body | Response |
|---|---|---|---|
| `POST` | `/rentals/pickup` | `{vehicleCode, reservationId?}` | 201 + `Trip` |
| `GET` | `/trips/current` | | 200 + `Trip` đang chạy, hoặc 204 |
| `GET` | `/trips/{id}` | | `Trip` |

Không có `reservationId` = thuê trực tiếp. Thứ tự kiểm tra (mock làm đúng thứ tự này, FE dùng mã lỗi để đánh dấu bước trượt trong checklist):

| # | Luật | Lỗi | HTTP |
|---|---|---|---|
| 1 | Không có chuyến đang chạy | `ACTIVE_TRIP_EXISTS` *(mới)* | 409 |
| 2 | Xe tồn tại (tìm theo `code`, không phân biệt hoa thường) | `NOT_FOUND` | 404 |
| 3a | Có đơn: đơn `RESERVED`, chưa hết hạn, đúng xe | `RESERVATION_NOT_ACTIVE` / `RESERVATION_EXPIRED` / `WRONG_VEHICLE` *(mới)* | 409 / 410 / 422 |
| 3b | Thuê trực tiếp: không có đơn hiệu lực; xe không bị RB/MT giữ; xe `AVAILABLE` | `ACTIVE_RESERVATION_EXISTS` / `VEHICLE_HAS_OPERATION` / `VEHICLE_UNAVAILABLE` | 409 |
| 4 | Cảm biến: xe đứng yên đúng Hub | `VEHICLE_NOT_AT_HUB` *(mới)* | 422 |
| 5 | Pin ≥ 20 % | `LOW_BATTERY` | 422 |
| 6 | Không có sự cố đang mở | `INCIDENT_ALREADY_OPEN` | 409 |
| 7 | Xe → `PICKUP_PENDING`, gửi lệnh mở khóa | `IOT_TIMEOUT` / `IOT_COMMAND_FAILED` | 504 / 502 |
| → | Thành công: xe `IN_USE`, tạo `trip`, đơn `PICKED_UP` | | |

Lỗi ở bước 3b–7 nên có `details.hubId` (và `details.vehicleId`) để FE gợi ý xe khác cùng Hub.

`Trip` = bảng `trip` + đề xuất: `code, status (IN_PROGRESS|COMPLETED), vehicleCode, vehicleType, startSlotCode, endSlotCode, currentBattery, vehicleStatusAfterReturn`. Khi `IN_PROGRESS`, `cost` là **chi phí tạm tính**.

### RE06 – Trả xe

| Method | URL | Body | Response |
|---|---|---|---|
| `POST` | `/trips/{id}/return/check` | `{hubId}` | `ReturnCheck {slotConfirmed, slotCode, confirmedAt, chargingConnected, chargingPortCode}` – FE polling 5 s tới khi `slotConfirmed` |
| `POST` | `/trips/{id}/return/photo` | multipart `photo` | 201 `{proofId}` (ảnh xác nhận thủ công, E1) |
| `POST` | `/trips/{id}/return` | `{hubId, checklistConfirmed: true, damageIncidentId?, manualProof?}` | 200 + `Trip` đã `COMPLETED` |
| `POST` | `/trips/{id}/return/offline` | `{hubId, otp, clientEndedAt, checklistConfirmed: true, damageIncidentId?}` | 200 + `Trip` (E2) |
| `POST` | `/trips/{id}/rating` | `{vehicleStars, hubStars, comment?}` (bảng `rating`) | 204 |

`manualProof`: `{method: 'OTP', otp}` hoặc `{method: 'PHOTO', proofId}`.

| Luật | Lỗi | HTTP |
|---|---|---|
| Chưa có xác nhận ô đỗ và không có `manualProof` | `INVALID_RETURN_LOCATION` (đã có) | 422 |
| OTP sai | `OTP_INVALID` *(mới)* | 422 |
| Khóa xe không phản hồi | `IOT_TIMEOUT` / `IOT_COMMAND_FAILED` | 504 / 502 |
| Thanh toán mô phỏng lỗi | `PAYMENT_FAILED` | 502 |
| Đánh giá lần 2 | `TRIP_ALREADY_RATED` (đã có) | 409 |

Trạng thái xe sau trả (`vehicleStatusAfterReturn`): có `damageIncidentId` → `MAINTENANCE_LOCKED`; đang cắm sạc → `CHARGING`; pin < 20 % → `NEEDS_CHARGE`; còn lại `AVAILABLE`. `return` nên **idempotent**: gọi lại khi chuyến đã xong thì trả kết quả cũ.

### Sự cố (RE05c, RE06 A1 – MT xử lý)

| Method | URL | Body | Response |
|---|---|---|---|
| `POST` | `/incidents` | multipart: `targetType (VEHICLE|CHARGING_PORT), category, description, vehicleId?, tripId?, hubId?, photos[]` | 201 `{id, code, status: 'OPEN'}` |

`category`: `DAMAGE, BRAKE_LIGHT, BATTERY, LOCK, CHARGING_PORT, OTHER` – cần TV3 (MT) xác nhận danh sách.

## 3. Mã lỗi mới FE đang dùng (cần thêm vào `ErrorCode.java`)

`ACTIVE_TRIP_EXISTS` (409), `WRONG_VEHICLE` (422), `VEHICLE_NOT_AT_HUB` (422), `OTP_INVALID` (422). FE đã có câu thông báo trong `shared/i18n/vi.ts`; nếu BE đặt tên khác chỉ cần sửa ở đó và trong `PickupPage.tsx` (`FAILED_STEP`).

## 4. Khác biệt với tài liệu `CLAUDE_BTL_SmartEMobilityHub.md` (cần nhóm chốt)

- `/reservations/active` (404) ↔ backend `/reservations/current` (204). FE theo backend, và đặt `/trips/current` (thay `/trips/active` ở B.5) cho đồng bộ.
- Enum xe: tài liệu `READY/UNLOCKING/FAULT/MAINTENANCE` ↔ backend `AVAILABLE/PICKUP_PENDING/FAULTY/MAINTENANCE_LOCKED`.
- Mã lỗi: `VEHICLE_NO_LONGER_AVAILABLE` ↔ `VEHICLE_UNAVAILABLE`, `BATTERY_TOO_LOW` ↔ `LOW_BATTERY`, `EXTENSION_LIMIT_REACHED` ↔ `MAX_EXTENSIONS_REACHED`, `RESERVATION_NOT_CANCELLABLE` ↔ `RESERVATION_NOT_ACTIVE`, `UNLOCK_TIMEOUT/UNLOCK_FAILED` ↔ `IOT_TIMEOUT/IOT_COMMAND_FAILED`, `OPEN_INCIDENT` ↔ `INCIDENT_ALREADY_OPEN`.
- Mã đơn: tài liệu `DX-ddMMyy-nnnn` ↔ backend `RS` + 10 ký tự hex. Mã chuyến trong mock: `TP` + 10 hex (Figma `UG071026-018`).
- **Hết hạn**: tài liệu xe → `PENDING_CHECK` ↔ backend `Vehicle.release()` → `AVAILABLE`/`NEEDS_CHARGE`. Mock giữ đúng backend cho hết hạn, nhưng **hủy (RE03)** thì theo tài liệu (`PENDING_CHECK`).
- **Mở khóa thất bại khi có đơn**: đặc tả không nói đơn đi về đâu. Mock **hủy đơn** (ghi chú "Mở khóa thất bại") để sinh viên chọn được xe khác ngay. Cần BE/nhóm xác nhận.
- Response không trả ô đỗ (`P-07` trên Figma) và các luật (`maxExtensions`, `holdMinutes`). FE giữ bản sao luật trong `types.ts` (`RESERVATION_RULES`).
- Lịch sử chuyến đi (toggle ở RE02): chưa có API `GET /trips`, chưa rõ module nào phụ trách.
- Hàm giá: mock 500 đ/phút (khớp ví dụ Figma 24 phút = 12.000 đ). Thật do dịch vụ thanh toán mô phỏng quyết định (B.10 mục 5).
