# PV: Xe cá nhân đặt chỗ đỗ / sạc (Personal Vehicle)

> Sinh viên có xe điện **riêng** thì đăng ký xe, đặt trước một ô đỗ (có thể kèm cổng sạc) tại một Hub
> trong một khung giờ, tới nơi quét QR để check-in, xong thì check-out.
>
> Kiến thức chung (transaction, khóa, job nền...) nằm ở [`../README.md`](../README.md).

---

## 1. Các file

| File | Vai trò |
|---|---|
| `PersonalVehicle.java` | Entity bảng `personal_vehicle` |
| `SlotBooking.java` | Entity bảng `slot_booking` + enum `SlotBooking.Status`, `SlotBooking.ServiceType` |
| `PersonalVehicleRepository.java` | Query xe cá nhân |
| `SlotBookingRepository.java` | ⭐ Query tìm ô đỗ / cổng sạc **trống trong khung giờ** |
| `ParkingService.java` | ⭐ Đăng ký/xóa xe, PV01, PV03, check-out, hủy + job `expireNoShows()` chạy mỗi 60 giây |
| `ParkingController.java` | Toàn bộ URL bên dưới |
| `ParkingDto.java` | `RegisterVehicleRequest`, `VehicleResponse`, `BookRequest`, `CheckInRequest`, `BookingResponse` |

Dùng từ chỗ khác: `../hub/` (`Hub`, `ParkingSlot`, `ChargingPort`, `ResourceStatus`), và record `AppProperties.Booking` trong `core/config`.

---

## 2. Vòng đời một đơn đặt chỗ

```
            PV01 book()           PV03 checkIn()            checkOut()
 (không có) ───────────► BOOKED ─────────────────► IN_USE ─────────────► COMPLETED
                           │
                           ├── cancel() ────────────────► CANCELLED
                           └── quá giờ không tới ───────► EXPIRED   (job expireNoShows)
```

| Lúc | `slot_booking.status` | `parking_slot.status` / `charging_port.status` |
|---|---|---|
| Đặt trước (giờ tương lai) | `BOOKED` | `AVAILABLE` (chưa đổi, vì xe chưa tới) |
| Check-in | `IN_USE` | `OCCUPIED` |
| Check-out | `COMPLETED` | `AVAILABLE` |

**Khác với RE:** PV đặt theo **khung giờ trong tương lai**. Một ô đỗ có thể có nhiều đơn `BOOKED` ở các khung giờ khác nhau, nên không thể "khóa ô" ngay lúc đặt như cách RE khóa xe.

---

## 3. API

Tất cả cần JWT của tài khoản **STUDENT**.

### Xe cá nhân

| Method | URL | Body | Kết quả |
|---|---|---|---|
| `POST` | `/api/v1/personal-vehicles` | xem bên dưới | `201` |
| `GET` | `/api/v1/personal-vehicles` | | Danh sách xe của tôi |
| `DELETE` | `/api/v1/personal-vehicles/{id}` | | `204` |

```json
{ "plateNumber": "59-X1 123.45", "type": "E_MOTORBIKE", "batteryKwh": 2.5, "connectorType": "TYPE_2" }
```

Biển số, `type` và `connectorType` được tự `trim` và viết hoa.

### Đặt chỗ

| Method | URL | Body | Kết quả |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | xem bên dưới | `201` + đơn (có `qrToken`) |
| `GET` | `/api/v1/bookings` | | Danh sách đơn của tôi |
| `POST` | `/api/v1/bookings/check-in` | `{"qrToken": "..."}` | `200` |
| `POST` | `/api/v1/bookings/{id}/check-out` | | `200` |
| `POST` | `/api/v1/bookings/{id}/cancel` | | `200` |

```json
{
  "personalVehicleId": 3,
  "hubId": 1,
  "serviceType": "BOTH",
  "startAt": "2026-11-02T01:00:00Z",
  "endAt":   "2026-11-02T03:00:00Z"
}
```

> Thời gian luôn gửi và nhận theo **UTC** (đuôi `Z`). 08:00 giờ Việt Nam = `01:00Z`.

`serviceType`: `PARK` (chỉ đỗ), `CHARGE` (chỉ sạc), `BOTH` (cả hai). Frontend lấy `qrToken` trong response để vẽ mã QR.

---

## 4. Luật → lỗi

### Xe cá nhân

| Luật | Lỗi | HTTP |
|---|---|---|
| Biển số không trùng | `PLATE_NUMBER_TAKEN` | 409 |
| Không xóa xe còn đơn `BOOKED`/`IN_USE` | `VEHICLE_HAS_BOOKINGS` | 409 |
| Không xóa xe đã có lịch sử đặt (vì khóa ngoại) | `CONFLICT` | 409 |

### PV01: `book()`

| # | Luật | Lỗi | HTTP |
|---|---|---|---|
| 1 | Xe phải là của mình, Hub phải tồn tại | `NOT_FOUND` | 404 |
| 2 | `endAt > startAt` | `VALIDATION_FAILED` | 400 |
| 3 | `startAt` chưa qua (cho lùi tối đa `check-in-grace-minutes`) | `VALIDATION_FAILED` | 400 |
| 4 | Cùng 1 xe không có 2 đơn trùng giờ | `SLOT_UNAVAILABLE` | 409 |
| 5 | Còn ô `PERSONAL` trống, không hỏng/bảo trì trong khung giờ | `SLOT_UNAVAILABLE` | 409 |
| 6 | Nếu `CHARGE`/`BOTH`: còn cổng sạc **cùng loại đầu cắm** trống | `SLOT_UNAVAILABLE` | 409 |
| → | Hệ thống **tự chọn** ô/cổng trống đầu tiên, sinh `qrToken` ngẫu nhiên | | |

### PV03: `checkIn()`

| Luật | Lỗi | HTTP |
|---|---|---|
| QR đúng, của mình, đơn còn `BOOKED` | `CHECKIN_INVALID` | 422 |
| Giờ hiện tại trong `[startAt − 15', startAt + 15']` | `CHECKIN_INVALID` | 422 |
| Ô đỗ thực tế đang trống (người trước có thể chưa đi) | `SLOT_UNAVAILABLE` | 409 |
| Cổng sạc thực tế đang trống | `PORT_IN_USE` | 409 |

### No-show (job `expireNoShows()`)

Đơn vẫn còn `BOOKED` sau `startAt + no-show-minutes` (15 phút) thì chuyển `EXPIRED` và gửi thông báo cho chủ xe.

```yaml
app:
  booking:
    no-show-minutes: 15
    check-in-grace-minutes: 15
```

---

## 5. Điểm đáng học riêng ở module này

### 5.1. Hai khoảng thời gian có trùng nhau không

Hai khoảng `[a, b)` và `[c, d)` **giao nhau** khi và chỉ khi `a < d` **và** `c < b`.

```
Đơn cũ:      [====08:00────10:00====)
Đơn mới:                 [====09:00────11:00====)   → trùng       (08 < 11 và 09 < 10)
Đơn mới:                            [10:00────12:00)  → KHÔNG trùng (10 < 10 sai)
```

Dấu `)` nghĩa là **không tính điểm cuối**, nên người A đặt 08–10 và người B đặt 10–12 vẫn hợp lệ. Cả 3 query trong `SlotBookingRepository` đều dùng công thức này:

```sql
b.startAt < :endAt and b.endAt > :startAt
```

### 5.2. Exclusion constraint: "không trùng giờ" nằm ngay trong DB

```sql
ALTER TABLE slot_booking ADD CONSTRAINT ex_slot_no_overlap
    EXCLUDE USING gist (slot_id WITH =, tstzrange(start_at, end_at) WITH &&)
    WHERE (status IN ('BOOKED', 'IN_USE'));
```

Đọc là: *"Không được có 2 dòng mà `slot_id` **bằng nhau** VÀ khoảng thời gian **giao nhau** (`&&`), chỉ xét các đơn còn hiệu lực."*

Unique index (dùng ở RE) chỉ chặn được giá trị **bằng nhau**. Exclusion constraint chặn được cả **giao nhau**. Đây là tính năng riêng của PostgreSQL, cần extension `btree_gist`.

Code bắt lỗi từ DB và đổi thành lỗi dễ hiểu:

```java
try {
    return bookings.saveAndFlush(booking);      // flush = gửi INSERT xuống DB NGAY
} catch (DataIntegrityViolationException ex) {
    throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE);
}
```

Dùng `saveAndFlush` thay vì `save` vì nếu đợi tới lúc commit mới gửi INSERT, lỗi sẽ nổ ra **sau khi** đã ra khỏi khối `try`, và không bắt được nữa.

### 5.3. Query tìm chỗ trống bằng `NOT EXISTS`

```sql
select s from ParkingSlot s
where s.hubId = :hubId and s.kind = PERSONAL and s.status not in (FAULTY, MAINTENANCE, DISABLED)
  and not exists ( một đơn còn hiệu lực trên ô s mà trùng giờ )
```

Dịch ra tiếng Việt: "lấy các ô của Hub này, loại cá nhân, không hỏng, và **không tồn tại** đơn nào đang chiếm ô đó trong khung giờ đã chọn".

---

## 6. Tự quyết / chưa làm

- **Mã yêu cầu**: chỉ PV01 và PV03 là chắc chắn (có ghi trong `AppProperties` và `V1__init.sql`). `V1__init.sql` có nhắc PV04 dùng exclusion constraint, nên PV04 có thể là "đổi/gia hạn giờ đặt": **chưa làm**.
- **Chưa tính tiền**: `energyKwh` và `cost` để `null`, vì chưa có bảng giá và điện năng thực tế phải lấy từ IoT.
- **Ai quét QR**: hiện tại chủ xe tự gửi `qrToken`. Nếu thiết kế là *thiết bị ở Hub quét mã trên điện thoại*, thì nên chuyển check-in sang `/api/v1/iot/**` (xác thực bằng API key).
- **Ở lố giờ**: chưa có job xử lý đơn `IN_USE` đã quá `endAt`.
- ⚠️ **Seed chưa có ô `PERSONAL`**: `2__seed.sql` chỉ tạo ô `SHARED`, nên `book()` sẽ luôn báo `SLOT_UNAVAILABLE`. Muốn test thì thêm vào seed:
  ```sql
  INSERT INTO parking_slot (hub_id, code, kind, status)
  SELECT h, 'PSLOT_' || h || '_' || LPAD(i::text, 2, '0'), 'PERSONAL', 'AVAILABLE'
  FROM generate_series(1, 5) h, generate_series(1, 5) i;
  ```
  Cổng sạc trong seed có đầu cắm `TYPE_2`, nên khi đăng ký xe để test sạc thì nhập `"connectorType": "TYPE_2"`.
