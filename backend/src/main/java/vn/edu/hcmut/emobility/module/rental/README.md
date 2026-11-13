# RE: Thuê xe dùng chung (Rental)

> Sinh viên đặt giữ một chiếc xe điện của hệ thống, tới Hub lấy xe, chạy, rồi trả xe.
> Hiện mới làm **RE01 (giữ xe)** và **RE04 (gia hạn)**, cùng job tự hủy đơn quá giờ.
>
> Kiến thức chung (transaction, khóa, job nền...) nằm ở [`../README.md`](../README.md).

---

## 1. Các file

| File | Vai trò |
|---|---|
| `Reservation.java` | Entity bảng `reservation` + enum `Reservation.Status`. Các hàm `hold()`, `extend()`, `expire()` |
| `ReservationRepository.java` | Query, gồm `findByIdForUpdate()` (khóa dòng) |
| `RentalService.java` | ⭐ Luật RE01, RE04 + job `expireOverdue()` chạy mỗi 30 giây |
| `RentalController.java` | 3 URL bên dưới |
| `RentalDto.java` | `ReserveRequest`, `ReservationResponse` |

Dùng từ chỗ khác: `../hub/Vehicle.java` (xe), và record `AppProperties.Reservation` trong `core/config` (số phút giữ chỗ, gia hạn).

---

## 2. Vòng đời một đơn

```
             RE01 reserve()                 (chưa làm)                 (chưa làm)
  (không có) ──────────────► RESERVED ──────────────────► PICKED_UP ──────────► COMPLETED
                               │  ▲
                               │  └── RE04 extend(): +10 phút, tối đa 2 lần
                               │
                               ├── quá expiresAt ──► EXPIRED     (job expireOverdue)
                               └── hủy ───────────► CANCELLED    (chưa làm)
```

| Lúc | `reservation.status` | `vehicle.status` |
|---|---|---|
| Trước khi đặt | | `AVAILABLE` |
| Sau RE01 | `RESERVED` | `RESERVED` |
| Hết hạn | `EXPIRED` | `AVAILABLE`, hoặc `NEEDS_CHARGE` nếu pin < 20% (`Vehicle.release()`) |

---

## 3. API

Tất cả cần JWT của tài khoản **STUDENT**.

| Method | URL | Body | Kết quả |
|---|---|---|---|
| `POST` | `/api/v1/reservations` | `{"vehicleId": 1}` | `201` + đơn mới |
| `POST` | `/api/v1/reservations/{id}/extend` | | `200` + đơn sau khi gia hạn |
| `GET` | `/api/v1/reservations/current` | | `200` + đơn đang có, hoặc `204` nếu không có |

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

---

## 4. Luật → lỗi

### RE01: `reserve()`

| # | Luật | Lỗi | HTTP |
|---|---|---|---|
| 1 | Mỗi sinh viên chỉ 1 đơn `RESERVED`/`PICKED_UP` (`Reservation.Status.ACTIVE`) | `ACTIVE_RESERVATION_EXISTS` | 409 |
| 2 | Xe phải tồn tại | `NOT_FOUND` | 404 |
| 3 | Xe không bị RB/MT giữ (`TRANSFER_LOCKED`, `MAINTENANCE_LOCKED`) | `VEHICLE_HAS_OPERATION` | 409 |
| 4 | Xe đang `AVAILABLE` và đang ở 1 Hub | `VEHICLE_UNAVAILABLE` | 409 |
| 5 | Pin ≥ `app.vehicle.min-battery-percent` (20%) | `LOW_BATTERY` | 422 |
| → | Giữ xe `app.reservation.hold-minutes` (15) phút | | |

### RE04: `extend()`

| # | Luật | Lỗi | HTTP |
|---|---|---|---|
| 1 | Đơn phải của chính sinh viên đó | `NOT_FOUND` | 404 |
| 2 | Đơn đang `RESERVED` | `RESERVATION_NOT_ACTIVE` | 409 |
| 3 | Chưa quá `expiresAt` | `RESERVATION_EXPIRED` | 410 |
| 4 | Số lần gia hạn < `max-extensions` (2) | `MAX_EXTENSIONS_REACHED` | 422 |
| → | `expiresAt += extend-minutes` (10) | | |

Muốn đổi luật thì không cần sửa code, chỉ cần sửa `application.yml`:

```yaml
app:
  reservation:
    hold-minutes: 15
    extend-minutes: 10
    max-extensions: 2   # ⚠️ DB còn có CHECK (extension_count <= 2): tăng số này thì phải sửa cả migration
```

---

## 5. Điểm đáng học riêng ở module này

### Hai sinh viên bấm đặt cùng một xe cùng lúc

1. **`@Version` trên `Vehicle`**: người thứ hai lưu thì version đã đổi, sinh ra `OptimisticLockingFailureException`, và người đó nhận HTTP 409.
2. **Unique index có điều kiện** trong `V1__init.sql`:
   ```sql
   CREATE UNIQUE INDEX ux_reservation_one_active_per_vehicle
       ON reservation(vehicle_id) WHERE status IN ('RESERVED', 'PICKED_UP');
   ```
   "Unique, nhưng **chỉ xét các đơn đang hoạt động**". Một xe có hàng trăm đơn `COMPLETED` cũ cũng không sao, nhưng không thể có 2 đơn `RESERVED` cùng lúc.

### Sinh viên bấm gia hạn đúng lúc job hết hạn đang chạy

`extend()` và `expire()` đều lấy đơn qua `findByIdForUpdate()` (`SELECT ... FOR UPDATE`). Ai tới trước thì khóa dòng, người sau phải đợi rồi đọc trạng thái mới nhất. Kết quả: hoặc gia hạn thành công, hoặc báo `RESERVATION_NOT_ACTIVE`, không bao giờ có chuyện vừa gia hạn vừa bị hủy.

---

## 6. Tự quyết / chưa làm

- **Tự quyết**: sinh viên đang đi xe (`PICKED_UP`) cũng không được đặt thêm xe. Muốn đổi thì sửa `Reservation.Status.ACTIVE`.
- **Chưa làm**: nhận xe (tạo `trip`), trả xe (kiểm tra vị trí `INVALID_RETURN_LOCATION`, tính tiền), hủy đơn, đánh giá (`rating`). Nhiều khả năng đây là RE02, RE03, RE05, RE06, cần đối chiếu với báo cáo.
