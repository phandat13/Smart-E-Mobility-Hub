# RE: Thuê xe dùng chung (Rental)

> Sinh viên đặt giữ một chiếc xe điện của hệ thống, tới Hub lấy xe, chạy, rồi trả xe.
> Package này hiện mới làm **RE01 (giữ xe)** và **RE04 (gia hạn)**.

---

## 1. Bức tranh tổng thể

```
Sinh viên bấm "Đặt xe"
        │
        ▼
  ReservationController      ← nhận HTTP, lấy id sinh viên từ JWT
        │
        ▼
  ReservationService         ← TOÀN BỘ luật nghiệp vụ nằm ở đây
        │
        ├──► VehicleRepository      (đọc/sửa bảng vehicle)
        └──► ReservationRepository  (đọc/ghi bảng reservation)
                    │
                    ▼
               PostgreSQL

  ReservationExpiryJob  ── cứ 30 giây ──► ReservationService.expire()
```

**Quy tắc chia tầng** (cả project đều theo quy tắc này):

| Tầng | Làm gì | KHÔNG làm gì |
|---|---|---|
| Controller | Nhận request, gọi service, trả JSON | Không chứa `if` nghiệp vụ |
| Service | Kiểm tra luật, đổi trạng thái, mở transaction | Không biết gì về HTTP |
| Repository | Đọc/ghi DB | Không chứa luật |
| Entity | Ánh xạ 1 bảng; có vài hàm đổi trạng thái nhỏ | Không gọi repository |

---

## 2. Vòng đời một đơn đặt xe

```
             RE01 reserve()                (RE02/03 - chưa làm)        (chưa làm)
  (không có) ──────────────► RESERVED ──────────────────► PICKED_UP ──────────► COMPLETED
                               │  ▲
                               │  └── RE04 extend(): +10 phút, tối đa 2 lần
                               │
                               ├── quá expiresAt ──► EXPIRED   (ReservationExpiryJob)
                               └── hủy ───────────► CANCELLED  (chưa làm)
```

Trạng thái **xe** đi kèm:

| Lúc | `reservation.status` | `vehicle.status` |
|---|---|---|
| Trước khi đặt | | `AVAILABLE` |
| Sau RE01 | `RESERVED` | `RESERVED` |
| Hết hạn | `EXPIRED` | `AVAILABLE` (trả lại) |

---

## 3. Đọc file theo thứ tự nào

| # | File | Đọc để hiểu |
|---|---|---|
| 1 | `ReservationStatus.java` | 5 trạng thái của đơn |
| 2 | `Reservation.java` | Entity, map với bảng `reservation`. Xem hàm `hold()`, `extend()`, `expire()` |
| 3 | `ReservationRepository.java` | Các câu query. Spring tự sinh SQL từ **tên hàm** |
| 4 | `ReservationService.java` | ⭐ Quan trọng nhất: luật RE01, RE04, hết hạn |
| 5 | `ReservationExpiryJob.java` | Job chạy nền |
| 6 | `ReserveRequest.java`, `ReservationResponse.java` | Dữ liệu vào/ra (DTO) |
| 7 | `ReservationController.java` | URL nào gọi hàm nào |

Các file dùng chung ở chỗ khác:
- `../vehicle/Vehicle.java`: entity xe (RE, RB đều dùng)
- `../core/config/AppProperties.java`: record `Reservation` đọc số phút từ `application.yml`

---

## 4. API

Tất cả cần JWT của tài khoản **STUDENT** (`Authorization: Bearer <token>`).

| Method | URL | Body | Kết quả |
|---|---|---|---|
| `POST` | `/api/v1/reservations` | `{"vehicleId": 1}` | `201` + đơn mới |
| `POST` | `/api/v1/reservations/{id}/extend` | | `200` + đơn sau khi gia hạn |
| `GET` | `/api/v1/reservations/current` | | `200` + đơn đang có, hoặc `204` nếu không có |

Ví dụ response:

```json
{
  "id": 7,
  "code": "RS3F9A1C0B2E",
  "vehicleId": 1,
  "hubId": 1,
  "status": "RESERVED",
  "reservedAt": "2026-11-01T08:00:00Z",
  "expiresAt": "2026-11-01T08:15:00Z",
  "extensionCount": 0
}
```

Khi lỗi, `GlobalExceptionHandler` trả về dạng thống nhất, ví dụ:

```json
{
  "code": "LOW_BATTERY",
  "message": "Pin phương tiện dưới mức tối thiểu",
  "details": { "batteryPercent": 12, "minBatteryPercent": 20 },
  "path": "/api/v1/reservations",
  "timestamp": "2026-11-01T08:00:00Z"
}
```

---

## 5. Luật nghiệp vụ → nằm ở đâu → lỗi gì

### RE01: `reserve()`

| # | Luật | Lỗi (`ErrorCode`) | HTTP |
|---|---|---|---|
| 1 | Mỗi sinh viên chỉ 1 đơn `RESERVED`/`PICKED_UP` | `ACTIVE_RESERVATION_EXISTS` | 409 |
| 2 | Xe phải tồn tại | `NOT_FOUND` | 404 |
| 3 | Xe không bị RB/MT khóa (`TRANSFER_LOCKED`, `MAINTENANCE_LOCKED`) | `VEHICLE_HAS_OPERATION` | 409 |
| 4 | Xe đang `AVAILABLE` và đang ở 1 Hub | `VEHICLE_UNAVAILABLE` | 409 |
| 5 | Pin ≥ `app.vehicle.min-battery-percent` (20%) | `LOW_BATTERY` | 422 |
| → | Giữ `app.reservation.hold-minutes` (15 phút) | | |

### RE04: `extend()`

| # | Luật | Lỗi | HTTP |
|---|---|---|---|
| 1 | Đơn phải của chính sinh viên đó | `NOT_FOUND` (cố tình không báo "không có quyền" để khỏi lộ đơn của người khác) | 404 |
| 2 | Đơn đang `RESERVED` | `RESERVATION_NOT_ACTIVE` | 409 |
| 3 | Chưa quá `expiresAt` | `RESERVATION_EXPIRED` | 410 |
| 4 | Số lần gia hạn < `max-extensions` (2) | `MAX_EXTENSIONS_REACHED` | 422 |
| → | `expiresAt += extend-minutes` (10 phút) | | |

**Đổi luật không cần sửa code**: chỉ cần sửa `application.yml`:

```yaml
app:
  reservation:
    hold-minutes: 15
    extend-minutes: 10
    max-extensions: 2   # ⚠️ DB còn có CHECK (extension_count <= 2), tăng số này thì phải sửa cả migration
```

---

## 6. Kiến thức rút ra từ module này

### 6.1. `@Transactional`: hoặc làm hết, hoặc không làm gì

```java
@Transactional
public Reservation reserve(...) {
    vehicle.changeStatus(RESERVED);          // bước 1
    reservations.save(...);                  // bước 2
}
```

Nếu bước 2 lỗi, bước 1 cũng **tự hoàn tác** (rollback). Không bao giờ có cảnh "xe bị đánh dấu RESERVED nhưng không có đơn nào".

Bạn cũng sẽ để ý là không có dòng `vehicles.save(vehicle)` nào. Trong một transaction, Hibernate **tự theo dõi** mọi entity đã đọc ra. Bạn sửa field thì lúc commit nó tự sinh `UPDATE`. Cơ chế này gọi là *dirty checking*.

### 6.2. Hai sinh viên bấm đặt cùng 1 xe cùng lúc

Có hai lớp bảo vệ:

1. **`@Version` trên `Vehicle`** (*optimistic lock*): mỗi lần UPDATE, Hibernate thêm điều kiện `WHERE version = <số cũ>`. Người thứ hai update thì version đã đổi, không dòng nào khớp, sinh ra `OptimisticLockingFailureException`, và người dùng nhận HTTP 409.
2. **Unique index trên DB** (`V1__init.sql`):
   ```sql
   CREATE UNIQUE INDEX ux_reservation_one_active_per_vehicle
       ON reservation(vehicle_id) WHERE status IN ('RESERVED', 'PICKED_UP');
   ```
   Dù code có bug, DB vẫn không cho 2 đơn đang hoạt động trên cùng 1 xe.

> Bài học: **kiểm tra trong code để báo lỗi dễ hiểu, và ràng buộc trong DB để chắc chắn đúng.**

### 6.3. Gia hạn đúng lúc job hết hạn đang chạy

`extend()` và `expire()` đều gọi `findByIdForUpdate()`:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)   // → SELECT ... FOR UPDATE
```

Đây là *pessimistic lock*. Ai đến trước thì khóa dòng đó, người sau phải **đợi**. Khi người sau được chạy thì đọc được trạng thái mới nhất, nên không có chuyện ghi đè lên nhau.

| | Optimistic (`@Version`) | Pessimistic (`FOR UPDATE`) |
|---|---|---|
| Cách làm | Cứ làm, lúc lưu mới kiểm tra | Khóa trước rồi mới làm |
| Khi tranh chấp | Người sau bị lỗi 409 | Người sau phải đợi |
| Hợp với | Ít tranh chấp (đặt xe) | Chắc chắn có tranh chấp (job vs người dùng) |

### 6.4. Vì sao job phải tách thành class riêng

`@Transactional` hoạt động nhờ **proxy**: Spring bọc object của bạn bằng một lớp vỏ. Gọi `this.expire()` trong cùng class thì lời gọi **không đi qua vỏ**, nên mất transaction. Vì vậy `ReservationExpiryJob` là class riêng, gọi `service.expire(id)` từ bên ngoài. Mỗi đơn có transaction riêng, một đơn lỗi không kéo các đơn khác rollback theo.

### 6.5. `Clock` thay cho `Instant.now()`

Service dùng `clock.instant()`, với `Clock` được inject từ `TimeConfig`. Khi viết test, bạn truyền vào một `Clock` cố định để giả lập "đã 16 phút trôi qua" mà không phải ngồi chờ thật.

---

## 7. Phần tự quyết / chưa làm

- **Tự quyết**: sinh viên đang đi xe (`PICKED_UP`) cũng không được đặt thêm xe. Muốn đổi thì sửa hằng `ACTIVE` trong `ReservationService`.
- **Chưa làm**: nhận xe (bắt đầu `trip`), trả xe (kiểm tra vị trí trả `INVALID_RETURN_LOCATION`, tính tiền), hủy đơn, đánh giá (`rating`). Nhiều khả năng đây là RE02, RE03, RE05, RE06. Cần đối chiếu với báo cáo.
- **Chưa có test**.
