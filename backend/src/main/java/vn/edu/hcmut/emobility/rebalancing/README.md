# RB: Cân bằng xe giữa các Hub (Rebalancing)

> Hub ký túc xá hết xe trong khi Hub metro thừa xe. Operator tạo **lệnh điều chuyển**, hệ thống giao cho
> một **tài xế** rảnh. Tài xế tới Hub nguồn chất xe lên xe tải, chở tới Hub đích, rồi báo hoàn thành.

---

## 1. Bức tranh tổng thể

Module này có **2 vai** dùng, nên có 2 controller:

```
 Operator (điều phối)                          Tài xế
        │                                         │
        ▼                                         ▼
 OpsTransferController                   DriverTransferController
 /api/v1/ops/transfers                   /api/v1/driver/transfers
        │                                         │
        └──────────────► TransferService ◄────────┘
                               │
     ┌──────────────┬──────────┼──────────────┬──────────────┐
     ▼              ▼          ▼              ▼              ▼
TransferOrder  TransferItem  Driver       Vehicle          Hub
Repository     Repository    Repository   Repository       Repository
(transfer_order)(transfer_item)(driver)   (vehicle)        (hub)
```

Một **lệnh** (`TransferOrder`) gồm nhiều **dòng xe** (`TransferItem`), giống một hóa đơn có nhiều dòng hàng:

```
TransferOrder TO8A2F...   Hub 1 (Metro) → Hub 2 (KTX A)   tài xế #1   IN_PROGRESS
 ├── TransferItem  xe #3   LOADED
 ├── TransferItem  xe #5   LOADED
 └── TransferItem  xe #8   LOCKED   (chưa chất)
```

---

## 2. Ba máy trạng thái chạy cùng lúc

### Lệnh (`TransferOrderStatus`)

```
           có tài xế rảnh
create() ─────────────────► ASSIGNED ── load() xe đầu tiên ──► IN_PROGRESS ── complete() ──► COMPLETED
   │                           ▲   │                                                           
   │ không có tài xế           │   └── cancel() ──► CANCELLED
   ▼                           │
 PENDING ── tài xế khác xong ──┘
   │        việc thì nhận
   └── cancel() ──► CANCELLED
```

### Từng xe trong lệnh (`TransferItemStatus`)

```
LOCKED ── load() ──► LOADED ── complete() ──► DELIVERED
  │
  └── removeItem() / cancel() / complete() khi chưa chất ──► REMOVED
```

### Xe (`vehicle.status` + `vehicle.hub_id`)

| Lúc | `vehicle.status` | `vehicle.hub_id` |
|---|---|---|
| Trước khi tạo lệnh | `AVAILABLE` / `NEEDS_CHARGE` | Hub nguồn |
| Tạo lệnh | `TRANSFER_LOCKED` (RE không cho đặt nữa) | Hub nguồn |
| Chất lên xe tải | `TRANSFER_LOCKED` | `null` (đang trên đường) |
| Giao xong | `AVAILABLE`, hoặc `NEEDS_CHARGE` nếu pin < 20% | **Hub đích** |
| Bị gỡ khỏi lệnh | `AVAILABLE` / `NEEDS_CHARGE` | Hub nguồn |

### Tài xế (`DriverStatus`)

`FREE` ⇄ `BUSY`. Khi xong (hoặc lệnh bị hủy), tài xế **tự nhận luôn lệnh `PENDING` cũ nhất**. Nếu không còn lệnh nào thì về `FREE`.

---

## 3. Đọc file theo thứ tự nào

| # | File | Đọc để hiểu |
|---|---|---|
| 1 | `TransferOrderStatus.java`, `TransferItemStatus.java`, `DriverStatus.java` | Các trạng thái ở mục 2 |
| 2 | `TransferOrder.java`, `TransferItem.java`, `Driver.java` | Entity |
| 3 | `DriverRepository.java` | ⭐ `SKIP LOCKED`: cách chọn tài xế rảnh an toàn |
| 4 | `TransferOrderRepository.java`, `TransferItemRepository.java` | Query |
| 5 | `TransferService.java` | ⭐ Toàn bộ luật. Chia 3 phần: Operator / Tài xế / Dùng chung |
| 6 | `CreateTransferRequest.java`, `LoadVehicleRequest.java`, `TransferOrderResponse.java` | DTO |
| 7 | `OpsTransferController.java`, `DriverTransferController.java` | URL |

---

## 4. API

### Operator: cần JWT role **OPERATOR**

| Method | URL | Body | Kết quả |
|---|---|---|---|
| `POST` | `/api/v1/ops/transfers` | xem bên dưới | `201` nếu đã giao tài xế, **`202`** nếu đang xếp hàng chờ |
| `GET` | `/api/v1/ops/transfers?status=PENDING&page=0&size=20` | | Danh sách có phân trang |
| `GET` | `/api/v1/ops/transfers/{id}` | | Chi tiết lệnh |
| `POST` | `/api/v1/ops/transfers/{id}/items/{vehicleId}/remove` | | Gỡ 1 xe chưa chất |
| `POST` | `/api/v1/ops/transfers/{id}/cancel` | | Hủy lệnh (khi chưa chất xe nào) |

```json
{
  "sourceHubId": 1,
  "targetHubId": 2,
  "vehicleIds": [3, 5, 8],
  "alertId": null,
  "recommendationId": null
}
```

`alertId` / `recommendationId` để biết lệnh này sinh ra từ **cảnh báo mất cân đối** (module MO) hay **gợi ý mô phỏng** (module SI). Không có thì để `null`.

### Tài xế: cần JWT role **DRIVER**

| Method | URL | Body | Kết quả |
|---|---|---|---|
| `GET` | `/api/v1/driver/transfers/current` | | Lệnh đang chạy, hoặc `204` nếu rảnh |
| `POST` | `/api/v1/driver/transfers/{id}/load` | `{"vehicleId": 3}` | Chất 1 xe lên |
| `POST` | `/api/v1/driver/transfers/{id}/complete` | | Tới Hub đích, hoàn thành |

Ví dụ response:

```json
{
  "id": 12, "code": "TO8A2F01C9D3", "sourceHubId": 1, "targetHubId": 2,
  "driverId": 1, "status": "IN_PROGRESS", "alertId": null, "recommendationId": null,
  "createdAt": "2026-11-01T08:00:00Z",
  "items": [
    { "vehicleId": 3, "status": "LOADED" },
    { "vehicleId": 5, "status": "LOCKED" }
  ]
}
```

---

## 5. Luật nghiệp vụ → nằm ở đâu → lỗi gì

### Tạo lệnh: `create()`

| # | Luật | Lỗi | HTTP |
|---|---|---|---|
| 1 | Hub nguồn ≠ Hub đích | `VALIDATION_FAILED` | 400 |
| 2 | Hai Hub tồn tại | `NOT_FOUND` | 404 |
| 3 | Xe đang có + xe đang chở tới + xe mới ≤ sức chứa Hub đích | `HUB_FULL` | 409 |
| 4 | Mỗi xe phải đang ở Hub nguồn | `VEHICLE_UNAVAILABLE` | 409 |
| 5 | Xe chưa thuộc lệnh điều chuyển / bảo trì khác | `VEHICLE_HAS_OPERATION` | 409 |
| 6 | Xe đang `AVAILABLE` hoặc `NEEDS_CHARGE` (không ai đặt / đang đi) | `VEHICLE_UNAVAILABLE` | 409 |
| → | Có tài xế `FREE` thì giao ngay (`201`), không có thì `PENDING` (`202` = `NO_FREE_DRIVER`) | | |

### Tài xế chất xe: `load()`

| Luật | Lỗi | HTTP |
|---|---|---|
| Lệnh phải được giao cho **chính tài xế này** | `NOT_FOUND` | 404 |
| Lệnh đang `ASSIGNED` / `IN_PROGRESS` | `CONFLICT` | 409 |
| Xe có trong lệnh và chưa bị gỡ | `VEHICLE_NOT_IN_ORDER` | 422 |
| Quét lại xe đã chất thì bỏ qua, không báo lỗi | | |

### Hoàn thành: `complete()`

| Luật | Lỗi |
|---|---|
| Phải chất ít nhất 1 xe | `VALIDATION_FAILED` |
| Xe `LOADED` thì `DELIVERED`, chuyển sang Hub đích | |
| Xe `LOCKED` (không tìm thấy / không chất) thì `REMOVED`, mở khóa tại Hub nguồn | |
| Tài xế nhận lệnh `PENDING` kế tiếp, hoặc về `FREE` | |

### Gỡ xe / hủy lệnh (Operator)

| Luật | Lỗi |
|---|---|
| Lệnh chưa `COMPLETED`/`CANCELLED` | `CONFLICT` |
| Không gỡ được xe đã chất lên xe tải | `CONFLICT` |
| Không hủy được lệnh đã có xe trên xe tải | `CONFLICT` |
| Gỡ hết xe thì lệnh **tự hủy** | |

---

## 6. Kiến thức rút ra từ module này

### 6.1. HTTP 202 không phải lỗi

`ErrorCode.NO_FREE_DRIVER` có status `202 ACCEPTED`, nghĩa là *"đã nhận, sẽ xử lý sau"*. Vì vậy code **không `throw`** nó:

```java
// ❌ SAI: throw thì @Transactional rollback, lệnh vừa tạo biến mất!
throw new BusinessException(ErrorCode.NO_FREE_DRIVER);

// ✅ ĐÚNG (OpsTransferController): lưu lệnh PENDING bình thường, chỉ đổi mã HTTP trả về
HttpStatus status = order.getStatus() == ASSIGNED ? HttpStatus.CREATED : ErrorCode.NO_FREE_DRIVER.getStatus();
```

### 6.2. `SELECT ... FOR UPDATE SKIP LOCKED`: hàng đợi an toàn bằng chính database

Bài toán: 2 operator tạo lệnh **cùng lúc**, chỉ còn **1** tài xế rảnh.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)                                         // FOR UPDATE
@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))  // -2 = SKIP LOCKED
Optional<Driver> findFirstByStatusOrderByIdAsc(DriverStatus status);
```

```
Operator A: SELECT tài xế FREE ... FOR UPDATE SKIP LOCKED  → lấy tài xế #1, khóa dòng #1
Operator B: SELECT tài xế FREE ... FOR UPDATE SKIP LOCKED  → #1 đang bị khóa nên BỎ QUA → không có ai → PENDING
```

| Cách | Khi tranh chấp |
|---|---|
| Không khóa | Cả hai cùng nhận tài xế #1 ❌ |
| `FOR UPDATE` | B phải **đợi** A commit xong rồi mới đọc lại |
| `FOR UPDATE SKIP LOCKED` | B **bỏ qua** dòng bị khóa, đi tìm người khác ngay ✅ |

Lệnh `PENDING` cũng được lấy ra bằng cùng kỹ thuật (`TransferOrderRepository.findFirstByStatusOrderByIdAsc`), để 2 tài xế xong việc cùng lúc không nhận trùng một lệnh.

### 6.3. Tránh lỗi N+1 query khi lấy danh sách

Danh sách 20 lệnh, mỗi lệnh cần danh sách xe. Cách ngây thơ:

```java
for (TransferOrder o : page)            // 1 query lấy 20 lệnh
    items.findByOrderId(o.getId());     // + 20 query, mỗi lệnh 1 query  → tổng 21 query
```

Cách trong `TransferService.list()`:

```java
items.findByOrderIdIn(tất cả 20 id)     // 1 query: WHERE order_id IN (...)
     .stream().collect(groupingBy(TransferItem::getOrderId));   // tự chia nhóm trong Java
// → tổng 2 query
```

### 6.4. Phân quyền theo URL thay vì `@PreAuthorize`

RE và PV dùng `@PreAuthorize("hasRole('STUDENT')")` trên controller. RB thì không cần, vì `SecurityConfig` đã có sẵn:

```java
.requestMatchers("/api/v1/ops/**").hasRole(Role.OPERATOR.name())
.requestMatchers("/api/v1/driver/**").hasRole(Role.DRIVER.name())
```

Chỉ cần đặt URL đúng prefix là được bảo vệ. ⚠️ Mặt trái: nếu ai đó đổi URL ra ngoài prefix thì quyền **mất mà không báo lỗi gì**.

### 6.5. Tài xế chỉ thao tác được lệnh của mình

```java
orders.findByIdForUpdate(orderId)
      .filter(o -> driver.getId().equals(o.getDriverId()))   // không phải lệnh của mình thì coi như không tồn tại
```

`driver` lấy từ JWT (`CurrentUser`), **không** lấy từ request body, nên tài xế không giả mạo được.

---

## 7. Phần tự quyết / chưa làm

- **Mã yêu cầu**: báo cáo chưa được đối chiếu. Trong code chỉ thấy nhắc `RB02` (ở `VehicleAvailabilityChanged`), các chức năng ở đây chưa gắn mã.
- **Tự quyết**:
  - Trạng thái lệnh `PENDING / ASSIGNED / IN_PROGRESS / COMPLETED / CANCELLED` do mình đặt, vì `V1__init.sql` không ghi.
  - Giao một lần cho cả lệnh (`complete`), chưa có giao từng xe.
  - Xe đang trên xe tải có `hub_id = null`.
- **Chưa làm**:
  - **Tự sinh lệnh** khi Hub mất cân đối (`app.hub.imbalance-threshold`). Phần này thuộc MO (tạo `alert` loại `IMBALANCE`) hoặc SI (tạo `recommendation`). RB chỉ nhận `alertId` / `recommendationId`.
  - Job định kỳ giao lệnh `PENDING` khi có tài xế mới được thêm vào hệ thống. Hiện lệnh chờ chỉ được nhận khi một tài xế **khác** xong việc.
  - Tài xế từ chối lệnh, tài xế offline.
