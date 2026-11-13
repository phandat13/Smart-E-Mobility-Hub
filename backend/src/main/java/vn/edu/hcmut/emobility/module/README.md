# `module/`: code nghiệp vụ RE, PV, RB

> Folder này chứa toàn bộ code nghiệp vụ đã viết cho RE, PV, RB.
> `core/` nằm bên cạnh là **phần khung của nhóm** (security, lỗi, event, cấu hình): module chỉ **dùng**, không sửa.
>
> README này gom **kiến thức dùng chung**. README trong từng module chỉ nói phần riêng của module đó.

---

## 1. Cấu trúc

```
module/
├── README.md              ← file này
│
├── hub/                   Tài nguyên của Hub, dùng chung cho cả RE, PV, RB
│   ├── Hub.java             + HubRepository.java
│   ├── ParkingSlot.java     + ParkingSlotRepository.java     (ô đỗ)
│   ├── ChargingPort.java    + ChargingPortRepository.java    (cổng sạc)
│   ├── ResourceStatus.java    trạng thái chung của ô đỗ và cổng sạc
│   └── Vehicle.java         + VehicleRepository.java         (xe điện dùng chung)
│
├── rental/                RE: thuê xe dùng chung        → đọc rental/README.md
├── parking/               PV: xe cá nhân đặt chỗ        → đọc parking/README.md
└── rebalancing/           RB: điều chuyển xe giữa Hub   → đọc rebalancing/README.md
```

`hub/` thuộc về module MO (quản lý Hub) nhưng MO chưa ai làm. Ở đây mới có **entity + repository**, chưa có API.

---

## 2. Quy ước: module nào cũng theo cùng một khuôn

| Loại file | Đặt tên | Chứa gì | Annotation hay gặp |
|---|---|---|---|
| **Entity** | `Reservation`, `SlotBooking`... | 1 class = 1 bảng DB. Enum trạng thái **lồng bên trong** | `@Entity`, `@Table`, `@Column` |
| **Repository** | `<Entity>Repository` | Các câu query | `@Query`, `@Lock` |
| **Service** | `<Module>Service` | **Toàn bộ luật nghiệp vụ** + job chạy nền | `@Service`, `@Transactional`, `@Scheduled` |
| **Controller** | `<Module>Controller` | URL → gọi service → trả JSON | `@RestController`, `@PostMapping`... |
| **DTO** | `<Module>Dto` | Mọi dữ liệu JSON vào/ra của module, gom trong 1 file | `@NotNull`, `@Valid`... |

| Module | Controller | Service | Dto | Entity |
|---|---|---|---|---|
| RE | `RentalController` | `RentalService` | `RentalDto` | `Reservation` |
| PV | `ParkingController` | `ParkingService` | `ParkingDto` | `PersonalVehicle`, `SlotBooking` |
| RB | `RebalancingController` | `RebalancingService` | `RebalancingDto` | `Driver`, `TransferOrder`, `TransferItem` |

**Muốn biết một API làm gì:** mở `<Module>Controller`, tìm URL, rồi nhảy sang hàm cùng tên trong `<Module>Service`. Luật nằm hết ở đó.

---

## 3. Một request đi qua những đâu

```
 Frontend ── POST /api/v1/reservations  {"vehicleId": 1}  + header Authorization: Bearer <JWT>
     │
     ▼
 core/security/JwtAuthFilter      đọc JWT → biết user id, role          (khung của nhóm)
     │
     ▼
 RentalController.reserve()       @PreAuthorize kiểm tra role STUDENT,
     │                            @Valid kiểm tra body, lấy user id từ CurrentUser
     ▼
 RentalService.reserve()          ⭐ kiểm tra luật, đổi trạng thái           (mở transaction)
     │
     ├──► VehicleRepository / ReservationRepository ──► PostgreSQL
     │
     └──► events.publishEvent(VehicleAvailabilityChanged)
                  │  (sau khi commit thành công)
                  ▼
          core/event/RealtimePublisher ──► WebSocket ──► Dashboard cập nhật số xe

 Có lỗi ở bất kỳ đâu ──► throw BusinessException(ErrorCode.X)
                     ──► core/exception/GlobalExceptionHandler ──► JSON lỗi + HTTP status
```

JSON lỗi luôn có cùng một dạng:

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

## 4. Kiến thức dùng chung (ví dụ lấy từ cả 3 module)

### 4.1. Chia tầng

| Tầng | Làm gì | KHÔNG làm gì |
|---|---|---|
| Controller | Nhận request, gọi service, trả JSON | Không chứa `if` nghiệp vụ |
| Service | Kiểm tra luật, đổi trạng thái, mở transaction | Không biết gì về HTTP |
| Repository | Đọc/ghi DB | Không chứa luật |
| Entity | Ánh xạ 1 bảng; vài hàm đổi trạng thái nhỏ (`expire()`, `release()`...) | Không gọi repository |

### 4.2. `@Transactional`: hoặc làm hết, hoặc không làm gì

```java
@Transactional
public Reservation reserve(...) {
    vehicle.changeStatus(Vehicle.Status.RESERVED);   // bước 1
    reservations.save(...);                          // bước 2
}
```

Nếu bước 2 lỗi (hoặc `throw` ở bất kỳ đâu), bước 1 **tự hoàn tác** (rollback). Không bao giờ có chuyện "xe bị đánh dấu RESERVED nhưng không có đơn nào".

Bạn cũng sẽ để ý là không có dòng `vehicles.save(vehicle)` nào. Trong một transaction, Hibernate **tự theo dõi** mọi entity đã đọc ra: bạn sửa field, đến lúc commit nó tự sinh câu `UPDATE`. Cơ chế này gọi là *dirty checking*.

### 4.3. Job chạy nền: `@Scheduled` + `TransactionTemplate`

Cả RE (hết hạn giữ xe) và PV (người đặt không tới) đều cần một job chạy định kỳ. Job nằm luôn trong service:

```java
@Scheduled(fixedDelay = 30, timeUnit = TimeUnit.SECONDS)
public void expireOverdue() {
    for (Long id : reservations.findIdsExpiredAt(...)) {
        try {
            tx.executeWithoutResult(t -> expire(id));   // mỗi đơn một transaction riêng
        } catch (RuntimeException ex) {
            log.warn(...);                              // đơn này lỗi thì bỏ qua, lượt sau thử lại
        }
    }
}
```

**Vì sao không gắn `@Transactional` lên `expire()` cho gọn?** `@Transactional` hoạt động nhờ **proxy**: Spring bọc service bằng một lớp vỏ, và transaction chỉ được mở khi lời gọi **đi qua vỏ** đó. Gọi `this.expire(id)` từ trong cùng class thì lời gọi không đi qua vỏ, nên `@Transactional` bị **lờ đi mà không báo gì**.

`TransactionTemplate` là cách mở transaction **bằng code**, không cần proxy, nên gọi từ đâu cũng chạy đúng.

### 4.4. Hai người cùng sửa một thứ: hai kiểu khóa

| | Optimistic (`@Version`) | Pessimistic (`@Lock(PESSIMISTIC_WRITE)`) |
|---|---|---|
| SQL | `UPDATE ... WHERE id = ? AND version = ?` | `SELECT ... FOR UPDATE` |
| Cách làm | Cứ làm, lúc lưu mới kiểm tra có ai sửa chen vào không | Khóa dòng trước rồi mới làm |
| Khi tranh chấp | Người sau bị lỗi → HTTP 409 | Người sau phải **đợi** người trước xong |
| Dùng ở đâu | `Vehicle`, `ParkingSlot`, `ChargingPort` (kế thừa `VersionedEntity`) | Mọi hàm `findByIdForUpdate()`: gia hạn vs job hết hạn, check-in vs job no-show |
| Hợp với | Ít khi tranh chấp | Chắc chắn có tranh chấp |

RB còn dùng thêm biến thể `SKIP LOCKED` (xem `rebalancing/README.md`).

### 4.5. Code kiểm tra để báo lỗi dễ hiểu, DB ràng buộc để chắc chắn đúng

Luật quan trọng luôn được bảo vệ **hai lớp**:

| Luật | Lớp 1: code Java (báo lỗi dễ hiểu) | Lớp 2: ràng buộc trong `V1__init.sql` |
|---|---|---|
| 1 xe chỉ 1 đơn RE đang chạy | `existsByStudentIdAndStatusIn`, `@Version` | `UNIQUE INDEX ... WHERE status IN (...)` |
| Ô đỗ không bị đặt trùng giờ | Query `findFreeSlots` | `EXCLUDE USING gist (...)` |
| Biển số không trùng | `existsByPlateNumber` | `UNIQUE` |
| Gia hạn tối đa 2 lần | `canExtend()` | `CHECK (extension_count <= 2)` |

Code kiểm tra trước để trả lỗi rõ ràng như "Biển số đã được đăng ký". Nhưng giữa lúc **kiểm tra** và lúc **lưu** luôn có một khoảng hở, và trong khoảng đó người khác có thể chen vào. DB là lớp cuối cùng không ai lách qua được.

### 4.6. Spring Data tự viết SQL từ tên hàm

```java
Optional<PersonalVehicle> findByIdAndOwnerId(Long id, Long ownerId);
// → SELECT * FROM personal_vehicle WHERE id = ? AND owner_id = ?

boolean existsByStudentIdAndStatusIn(Long studentId, Collection<Reservation.Status> statuses);
// → SELECT 1 FROM reservation WHERE student_id = ? AND status IN (...) LIMIT 1
```

Hàm đơn giản thì chỉ cần đặt tên đúng quy tắc. Hàm phức tạp thì viết `@Query` bằng **JPQL**: giống SQL nhưng dùng **tên class/field Java** (`Reservation`, `r.expiresAt`) thay vì tên bảng/cột. Hibernate tự dịch sang SQL.

### 4.7. Lọc theo chủ sở hữu ngay trong query

```java
personalVehicles.findByIdAndOwnerId(vehicleId, ownerId)        // PV
reservations.findByIdForUpdate(id).filter(r -> r.getStudentId().equals(studentId))   // RE
```

`ownerId` / `studentId` luôn lấy từ **JWT** (`CurrentUser.require().id()`), **không bao giờ** lấy từ request body. Nhờ vậy sinh viên A không thể xem hay sửa đồ của sinh viên B bằng cách đổi id trong URL. Lỗ hổng kiểu này gọi là **IDOR**, rất hay gặp.

Khi không phải đồ của mình, API trả `404 NOT_FOUND` chứ không trả `403`, để không lộ cho người ngoài biết là id đó có tồn tại.

### 4.8. `Clock` thay cho `Instant.now()`

Service dùng `clock.instant()`, với `Clock` được inject từ `core/config/TimeConfig`. Khi viết test, bạn truyền vào một `Clock` cố định để giả lập "đã 16 phút trôi qua" mà không phải ngồi chờ thật.

### 4.9. Vì sao enum lồng trong entity và DTO gom một file

Mục đích là **ít file hơn, và nhìn tên là biết thứ đó thuộc về ai**:

```java
Reservation.Status.RESERVED      // trạng thái của đơn RE
Vehicle.Status.RESERVED          // trạng thái của xe; cùng chữ RESERVED nhưng không thể nhầm
TransferItem.Status.MOVING       // tập trạng thái "còn đang chở", khai báo ngay trong enum
```

DTO là các `record` vài dòng, gom trong `<Module>Dto`. Muốn dùng ngắn gọn thì import thẳng tên lồng:

```java
import vn.edu.hcmut.emobility.module.rental.RentalDto.ReservationResponse;
// sau đó chỉ cần viết ReservationResponse.from(...)
```

JSON gửi/nhận **không đổi gì**: Jackson chỉ nhìn các field của record, không quan tâm record nằm lồng trong class nào.

---

## 5. Thêm module mới (AC, MO, MT, SC, SI...)

1. Tạo `module/<tên>/`.
2. Entity cho từng bảng trong `V1__init.sql`: kế thừa `BaseEntity`, hoặc `VersionedEntity` nếu bảng có cột `version`. Enum trạng thái để lồng bên trong.
3. Mỗi entity một `Repository`.
4. Một `<Module>Service`: luật nghiệp vụ, `throw new BusinessException(ErrorCode.X)` khi sai luật. `ErrorCode` của từng module đã có sẵn trong `core/exception/ErrorCode.java`.
5. Một `<Module>Dto` + một `<Module>Controller`. Phân quyền bằng `@PreAuthorize`, hoặc đặt URL dưới `/api/v1/ops/**`, `/driver/**`, `/tech/**` để dùng luật trong `SecurityConfig`.
6. Cần dữ liệu entity của module khác (Hub, xe...) thì dùng repository trong `module/hub/`, đừng tạo entity thứ hai cho cùng một bảng.

---

## 6. ⚠️ Trước khi chạy được

Code mới chỉ được kiểm tra bằng `mvnw compile`, **chưa chạy thật lần nào** và **chưa có test**. Các vấn đề đang chặn:

1. **Tên file migration sai**: `• V1__init.sql` (thừa `• `) và `2__seed.sql` (thiếu `V`). Flyway sẽ bỏ qua cả hai, DB trống, app không khởi động được.
2. **Chưa có API đăng nhập** (module AC): không lấy được JWT thì không gọi được API nào.
3. **Seed chưa có ô đỗ `PERSONAL`**: PV đặt chỗ sẽ luôn báo hết chỗ (xem `parking/README.md`).
4. Cần PostgreSQL thật (qua `docker-compose.yml`). PV và RB dùng tính năng chỉ PostgreSQL mới có (exclusion constraint, `SKIP LOCKED`).

---

## 7. Tra cứu tên cũ → tên mới

Lần refactor gom folder đã đổi tên một số file. API URL và JSON **giữ nguyên**.

| Trước | Bây giờ |
|---|---|
| `vehicle/Vehicle`, `VehicleStatus`, `VehicleType` | `module/hub/Vehicle` (+ `Vehicle.Status`, `Vehicle.Type`) |
| `hub/HubType`, `hub/SlotKind` | `Hub.Type`, `ParkingSlot.Kind` |
| `rental/ReservationService` + `ReservationExpiryJob` | `RentalService` |
| `rental/ReservationController` | `RentalController` |
| `rental/ReserveRequest`, `ReservationResponse` | `RentalDto.ReserveRequest`, `RentalDto.ReservationResponse` |
| `parking/PersonalVehicleService` + `BookingService` + `BookingNoShowJob` | `ParkingService` |
| `parking/PersonalVehicleController` + `BookingController` | `ParkingController` |
| `parking/BookingStatus`, `ServiceType` | `SlotBooking.Status`, `SlotBooking.ServiceType` |
| `parking/*Request`, `*Response` | `ParkingDto.*` |
| `rebalancing/TransferService` | `RebalancingService` |
| `rebalancing/OpsTransferController` + `DriverTransferController` | `RebalancingController` |
| `rebalancing/*Status` | `Driver.Status`, `TransferOrder.Status`, `TransferItem.Status` |
| `rebalancing/*Request`, `TransferOrderResponse` | `RebalancingDto.*` |
