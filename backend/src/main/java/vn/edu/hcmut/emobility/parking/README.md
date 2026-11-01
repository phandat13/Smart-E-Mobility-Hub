# PV: Xe cá nhân đặt chỗ đỗ / sạc (Personal Vehicle)

> Sinh viên có xe điện **riêng** thì đăng ký xe, đặt trước một ô đỗ (có thể kèm cổng sạc) tại một Hub
> trong một khung giờ, tới nơi quét QR để check-in, xong thì check-out.

---

## 1. Bức tranh tổng thể

```
PersonalVehicleController ──► PersonalVehicleService ──► PersonalVehicleRepository  (bảng personal_vehicle)

BookingController ──► BookingService ──┬──► SlotBookingRepository     (bảng slot_booking + query tìm chỗ trống)
                                       ├──► ParkingSlotRepository     (bảng parking_slot)
                                       ├──► ChargingPortRepository    (bảng charging_port)
                                       └──► HubRepository             (bảng hub)

BookingNoShowJob ── cứ 60 giây ──► BookingService.expireNoShow()
```

`ParkingSlot`, `ChargingPort`, `Hub` nằm ở package `../hub/` vì chúng là tài nguyên của Hub (module MO),
RE/PV/SC đều dùng chung.

---

## 2. Vòng đời một đơn đặt chỗ

```
            PV01 book()           PV03 checkIn()            checkOut()
 (không có) ───────────► BOOKED ─────────────────► IN_USE ─────────────► COMPLETED
                           │
                           ├── cancel() ────────────────► CANCELLED
                           └── quá giờ không tới ───────► EXPIRED   (BookingNoShowJob)
```

Trạng thái **ô đỗ / cổng sạc** đi kèm:

| Lúc | `slot_booking.status` | `parking_slot.status` / `charging_port.status` |
|---|---|---|
| Đặt trước (giờ tương lai) | `BOOKED` | `AVAILABLE` (chưa đổi, vì xe chưa tới) |
| Check-in | `IN_USE` | `OCCUPIED` |
| Check-out | `COMPLETED` | `AVAILABLE` |

Điểm khác với RE: đặt chỗ PV là đặt theo **khung giờ trong tương lai**. Một ô đỗ có thể có nhiều đơn
`BOOKED` ở các khung giờ khác nhau, nên không thể "khóa ô" ngay lúc đặt như cách RE khóa xe.

---

## 3. Đọc file theo thứ tự nào

| # | File | Đọc để hiểu |
|---|---|---|
| 1 | `ServiceType.java`, `BookingStatus.java` | PARK/CHARGE/BOTH; 5 trạng thái đơn |
| 2 | `PersonalVehicle.java` | Entity xe cá nhân |
| 3 | `SlotBooking.java` | Entity đơn đặt chỗ |
| 4 | `SlotBookingRepository.java` | ⭐ Query tìm ô đỗ / cổng sạc **trống trong khung giờ** |
| 5 | `PersonalVehicleService.java` | Đăng ký, xóa xe |
| 6 | `BookingService.java` | ⭐ PV01, PV03, check-out, hủy, no-show |
| 7 | `BookingNoShowJob.java` | Job chạy nền |
| 8 | `*Request.java`, `*Response.java` | DTO |
| 9 | `PersonalVehicleController.java`, `BookingController.java` | URL |

---

## 4. API

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

Biển số, `type` và `connectorType` được tự động `trim` và viết hoa.

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
> Frontend tự đổi múi giờ khi hiển thị.

Frontend lấy `qrToken` trong response để vẽ mã QR. Khi tới Hub, người dùng quét mã đó và frontend gửi `qrToken` lên `/check-in`.

---

## 5. Luật nghiệp vụ → nằm ở đâu → lỗi gì

### Đăng ký / xóa xe (`PersonalVehicleService`)

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
| → | Hệ thống **tự chọn** ô/cổng trống đầu tiên (theo `code`), sinh `qrToken` ngẫu nhiên | | |

### PV03: `checkIn()`

| Luật | Lỗi | HTTP |
|---|---|---|
| QR đúng, của mình, đơn còn `BOOKED` | `CHECKIN_INVALID` | 422 |
| Giờ hiện tại trong `[startAt − 15', startAt + 15']` | `CHECKIN_INVALID` | 422 |
| Ô đỗ thực tế đang trống (người trước có thể chưa đi) | `SLOT_UNAVAILABLE` | 409 |
| Cổng sạc thực tế đang trống | `PORT_IN_USE` | 409 |

### No-show (`expireNoShow()`, chạy mỗi 60 giây)

Đơn còn `BOOKED` sau `startAt + no-show-minutes` (15 phút) thì chuyển `EXPIRED` và gửi thông báo cho chủ xe.

Cấu hình trong `application.yml`:

```yaml
app:
  booking:
    no-show-minutes: 15
    check-in-grace-minutes: 15
```

---

## 6. Kiến thức rút ra từ module này

### 6.1. Bài toán "hai khoảng thời gian có trùng nhau không"

Hai khoảng `[a, b)` và `[c, d)` **giao nhau** khi và chỉ khi:

```
a < d  VÀ  c < b
```

```
Đơn cũ:      [====08:00────10:00====)
Đơn mới:                 [====09:00────11:00====)   → trùng   (08 < 11 và 09 < 10)
Đơn mới:                            [10:00────12:00)  → KHÔNG trùng (10 < 10 sai)
```

Dấu `)` nghĩa là **không tính điểm cuối**, nên người A đặt 08–10 và người B đặt 10–12 vẫn hợp lệ.
Cả 3 query trong `SlotBookingRepository` đều dùng đúng công thức này:

```sql
b.startAt < :endAt and b.endAt > :startAt
```

### 6.2. Exclusion constraint: luật "không trùng giờ" nằm ngay trong DB

Trong `V1__init.sql`:

```sql
ALTER TABLE slot_booking ADD CONSTRAINT ex_slot_no_overlap
    EXCLUDE USING gist (slot_id WITH =, tstzrange(start_at, end_at) WITH &&)
    WHERE (status IN ('BOOKED', 'IN_USE'));
```

Đọc là: *"Không được có 2 dòng mà `slot_id` **bằng nhau** VÀ khoảng thời gian **giao nhau** (`&&`), xét trong các đơn còn hiệu lực."*

Unique index (dùng ở RE) chỉ chặn được giá trị **bằng nhau**. Exclusion constraint chặn được cả **giao nhau**.
Đây là tính năng riêng của PostgreSQL, cần extension `btree_gist`.

Tại sao code Java đã kiểm tra rồi mà DB vẫn cần constraint? Vì có khoảng hở giữa lúc **tìm thấy ô trống** và lúc **lưu**:

```
Người A: tìm ô trống → thấy SLOT_1_01 ─────────────────► lưu ✅
Người B:        tìm ô trống → cũng thấy SLOT_1_01 ──────────► lưu ❌ (DB chặn)
```

Code bắt lỗi đó và đổi thành lỗi dễ hiểu:

```java
try {
    return bookings.saveAndFlush(booking);      // flush = gửi INSERT xuống DB NGAY, không đợi commit
} catch (DataIntegrityViolationException ex) {
    throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE);
}
```

Dùng `saveAndFlush` thay vì `save` vì nếu đợi tới lúc commit mới gửi INSERT, lỗi sẽ xảy ra **sau khi** đã ra khỏi khối `try`, và không bắt được nữa.

### 6.3. Query tìm chỗ trống: `NOT EXISTS`

```sql
select s from ParkingSlot s
where s.hubId = :hubId and s.kind = PERSONAL and s.status not in (FAULTY, MAINTENANCE, DISABLED)
  and not exists ( một đơn còn hiệu lực trên ô s mà trùng giờ )
```

Dịch ra tiếng Việt: "lấy các ô của Hub này, loại cá nhân, không hỏng, và **không tồn tại** đơn nào đang chiếm ô đó trong khung giờ đã chọn".
Đây là JPQL: viết theo **tên class/field Java** (`ParkingSlot`, `s.hubId`), không theo tên bảng/cột. Hibernate tự dịch sang SQL.

### 6.4. Spring Data tự sinh query từ tên hàm

```java
Optional<PersonalVehicle> findByIdAndOwnerId(Long id, Long ownerId);
// Spring tự hiểu:  SELECT * FROM personal_vehicle WHERE id = ? AND owner_id = ?

boolean existsByPlateNumber(String plateNumber);
// → SELECT 1 FROM personal_vehicle WHERE plate_number = ? LIMIT 1
```

Hàm đơn giản thì đặt tên đúng quy tắc là đủ. Hàm phức tạp thì viết `@Query`.

### 6.5. Lọc theo chủ sở hữu ngay trong query

```java
personalVehicles.findByIdAndOwnerId(req.personalVehicleId(), ownerId)
```

Không dùng `findById(id)` rồi mới so `ownerId`, vì nếu quên bước so sánh thì sinh viên A xem/sửa được xe của sinh viên B.
Lỗi bảo mật kiểu này gọi là **IDOR**, rất hay gặp. Đưa `ownerId` vào điều kiện query thì không thể quên được.

---

## 7. Phần tự quyết / chưa làm

- **Mã yêu cầu**: chỉ PV01 và PV03 là chắc chắn (có ghi trong `AppProperties` và `V1__init.sql`). Các chức năng còn lại chưa rõ mã. `V1__init.sql` có nhắc PV04 dùng exclusion constraint, nên có thể PV04 là "đổi/gia hạn giờ đặt", chức năng này **chưa làm**.
- **Chưa tính tiền**: `energy_kwh` và `cost` để `null`. Chưa có bảng giá trong config, và điện năng thực tế phải lấy từ IoT.
- **Ai quét QR**: hiện tại chủ xe tự gửi `qrToken` (ví dụ app quét mã dán ở cổng Hub). Nếu thiết kế là *thiết bị ở Hub quét mã trên điện thoại sinh viên*, thì nên chuyển check-in sang `/api/v1/iot/**` (dùng API key thay vì JWT).
- **Ở lố giờ**: chưa có job xử lý đơn `IN_USE` đã quá `endAt`.
- ⚠️ **Dữ liệu seed chưa có ô `PERSONAL`**: `2__seed.sql` chỉ tạo ô `SHARED`, nên `book()` sẽ luôn báo `SLOT_UNAVAILABLE`. Muốn test thì thêm vào seed, ví dụ:
  ```sql
  INSERT INTO parking_slot (hub_id, code, kind, status)
  SELECT h, 'PSLOT_' || h || '_' || LPAD(i::text, 2, '0'), 'PERSONAL', 'AVAILABLE'
  FROM generate_series(1, 5) h, generate_series(1, 5) i;
  ```
  Cổng sạc trong seed có đầu cắm `TYPE_2`, nên khi đăng ký xe để test sạc thì nhập `"connectorType": "TYPE_2"`.
