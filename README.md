# UniGo – Smart E-Mobility Hub (CO3001 – Công nghệ Phần mềm)

Hệ thống quản lý mạng lưới Hub xe điện dùng chung trong khu ĐHQG-HCM: sinh viên thuê xe đạp/xe máy điện, đặt chỗ đỗ & lịch sạc cho xe cá nhân; đơn vị vận hành giám sát mạng lưới, điều chuyển xe, quản lý sự cố – bảo trì, lập lịch sạc thông minh và mô phỏng What-if.

Mã nguồn hiện thực toàn bộ **35 use case** của Submission 1 (AC01–06, RE01–06, PV01–04, MO01–05, RB01–02, MT01–05, SC01–02, SI01–05), các chức năng nền ở §2.3 và các yêu cầu phi chức năng ở §3, đồng thời sửa theo **17 góp ý của giảng viên** cho Submission 2 (bảng truy vết ở cuối).

| Thành phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 4.1 (Web MVC, Data JPA/Hibernate 7, Security 7, Validation, WebSocket/STOMP), Flyway, JWT (jjwt 0.12) |
| CSDL | PostgreSQL 16 (khóa dòng, exclusion constraint `btree_gist`, partial unique index) |
| Frontend | React 19 + TypeScript 5.9 + Vite 7, React Router 7, Leaflet (OpenStreetMap), STOMP.js, qrcode |
| Thiết bị IoT | Cổng giả lập (`app.iot.mode=simulated`) – có thể thay bằng gateway thật qua interface `IotGateway` |

---

## 1. Chạy hệ thống

Yêu cầu: **JDK 21**, **Docker** (cho PostgreSQL), **Node.js ≥ 20**. Maven dùng qua wrapper `mvnw` có sẵn.

```bash
# 1) CSDL (PostgreSQL 16, cổng 5433)
docker compose up -d postgres

# 2) Backend – Flyway tự tạo bảng (V1__init.sql) và nạp dữ liệu mẫu (V2__seed.sql)
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
# API: http://localhost:8080/api/v1/...   Swagger UI: http://localhost:8080/swagger-ui.html

# 3) Frontend (cửa sổ terminal khác)
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxy /api và /ws sang :8080)
```

Build bản production cho frontend: `npm run build` (kết quả trong `frontend/dist`).

### Tài khoản demo (mật khẩu chung `123456`)

| Cổng đăng nhập | Tài khoản | Vai trò |
|---|---|---|
| Sinh viên `/login` | `anh.nm2410717` | Sinh viên (có 2 xe cá nhân, lịch sử chuyến) |
| Sinh viên `/login` | `bao.tq2410001` | Sinh viên |
| Nội bộ `/internal/login` | `vanhanh.trangle` | Đơn vị vận hành |
| Nội bộ `/internal/login` | `taixe.vanbinh`, `taixe.minhtuan` | Tài xế điều chuyển |
| Nội bộ `/internal/login` | `kythuat.vannam` | Kỹ thuật viên |
| Nội bộ `/internal/login` | `truongca.hoang` | Vận hành **và** kỹ thuật – được hỏi chọn ngữ cảnh làm việc |

Vai trò lấy từ tài khoản (góp ý #2): không có ô "chọn vai trò" khi đăng nhập; tài khoản sinh viên đăng nhập ở cổng nội bộ (và ngược lại) bị từ chối `PORTAL_MISMATCH`.

### Panel "Giả lập thiết bị" (khung viền tím trên giao diện)

Vì không có phần cứng thật, các màn hình có panel giả lập để trình diễn đủ luồng chính/ngoại lệ:

- **Kết quả lệnh kế tiếp** cho khóa xe / cổng sạc / ô đỗ: `Thành công`, `Thất bại`, `Mất phản hồi` (lệnh đã tới thiết bị nhưng không nhận được kết quả) hoặc `Quá thời gian` → dùng để demo RE05/RE06/PV03 rơi vào trạng thái **chờ đối soát**.
- Cảm biến ô đỗ (đỗ xe / xe rời ô), rút cáp sạc, báo lỗi thiết bị, đổi % pin, Hub mất kết nối.
- Tiến trình nền `DeviceSimulator` gửi telemetry định kỳ (30 s) cho mọi thiết bị.

API tương ứng: `/api/v1/sim/**` – chỉ được bật khi `app.iot.mode=simulated`.

---

## 2. Kiến trúc

Modular monolith, mỗi module là một gói Java độc lập (entity – repository – service – controller – DTO):

```
backend/src/main/java/vn/edu/hcmut/emobility/
├── core/          cấu hình, bảo mật JWT, lỗi chuẩn hóa, audit, thông báo, mã hóa, thanh toán giả lập,
│                  core/iot (IotGateway, DeviceCommandService – ghi nhận mọi lệnh gửi thiết bị)
├── account/       AC02–AC04: đăng ký, đăng nhập theo cổng, chọn ngữ cảnh, hồ sơ
├── hub/           AC01, MO02–MO04: Hub, ô đỗ, cổng sạc, tra cứu và quản trị
├── fleet/         MO05: danh mục xe dùng chung, CAS trạng thái xe
├── rental/        RE01–RE06, AC05–AC06: đặt trước, nhận xe, chuyến đi, trả xe (online/offline), đánh giá
├── personal/      PV01–PV04: xe cá nhân, đặt chỗ đỗ/sạc, check-in/out, gia hạn
├── monitoring/    MO01: dashboard, cảnh báo tự động, màn hình đối soát
├── rebalance/     RB01–RB02: lệnh điều chuyển, ứng dụng tài xế
├── maintenance/   MT01–MT05: sự cố, lệnh bảo trì, phiếu kỹ thuật, xử lý cam kết phụ thuộc (ImpactService)
├── charging/      SC01–SC02: lập lịch sạc (ChargingPlanner), điều chỉnh, phiên sạc thực tế
├── simulation/    SI01–SI05: kịch bản, snapshot, SimulationEngine (thuần, tất định), áp dụng khuyến nghị
├── iot/           nhận telemetry/heartbeat, check-in tại cổng, bộ giả lập thiết bị
└── jobs/          tiến trình nền §2.3 (hết hạn đơn, đối soát, phát hiện cảnh báo, lịch sạc, hàng đợi điều chuyển)

frontend/src/
├── api/           client fetch + kiểu dữ liệu khớp DTO backend (kiểm bằng tools/check_contract.py)
├── components/    layout 3 cổng (sinh viên / vận hành / nội bộ), bản đồ, panel giả lập, UI chung
├── lib/           xác thực, realtime STOMP, OTP offline (WebCrypto), định dạng
└── pages/         student/, ops/, internal/ (tài xế, kỹ thuật viên)
```

### Nguyên tắc nhất quán dữ liệu (áp dụng cho mọi thao tác giữ tài nguyên)

1. **Kiểm tra lại ngay tại thời điểm xác nhận** trong cùng giao dịch ghi – dữ liệu hiển thị chỉ để tham khảo, luôn kèm thời điểm cập nhật.
2. **Giữ tài nguyên nguyên tử**: `UPDATE … WHERE status = 'AVAILABLE'` (compare-and-set), `SELECT … FOR UPDATE [SKIP LOCKED]`, ràng buộc DB là chốt chặn cuối (partial unique index "mỗi xe/sinh viên chỉ 1 đơn hiệu lực", exclusion constraint chống trùng khung giờ ô đỗ/cổng sạc).
3. **Lệnh gửi thiết bị nằm ngoài giao dịch**: Tx1 giữ tài nguyên → gửi lệnh → Tx2 chốt theo kết quả `SUCCESS / FAILED / UNKNOWN`. Kết quả không xác định **không** được coi là thành công hay thất bại; tài nguyên ở trạng thái `*_RECONCILING` cho tới khi tiến trình đối soát truy vấn lại thiết bị hoặc nhân viên xác nhận.
4. **Idempotency** cho thao tác có thể bấm lặp (gia hạn RE04/PV04 dùng header `Idempotency-Key`).

---

## 3. Bản đồ use case → API → màn hình

| UC | API chính | Màn hình |
|---|---|---|
| AC01 Tra cứu Hub | `GET /hubs`, `/hubs/{id}` | `/` (bản đồ + danh sách + chi tiết Hub) |
| AC02 Đăng ký | `POST /auth/register` | `/register` |
| AC03 Đăng nhập | `POST /auth/login`, `POST /auth/context` | `/login`, `/internal/login` |
| AC04 Hồ sơ | `GET/PUT /me/profile`, `PUT /me/password` | `/account` |
| AC05 Lịch sử chuyến | `GET /trips` | `/trips` |
| AC06 Đánh giá | `POST /trips/{id}/rating` | `/trips/{id}/rate` (lưu nháp khi mất mạng) |
| RE01 Đặt trước | `POST /reservations` | `/` → `/reservations/{id}` |
| RE02 Lịch sử đặt | `GET /reservations` | `/trips?tab=reservations` |
| RE03 Hủy | `POST /reservations/{id}/cancel` | `/reservations/{id}` |
| RE04 Gia hạn | `POST /reservations/{id}/extend` (+`Idempotency-Key`) | `/reservations/{id}` |
| RE05 Nhận xe | `POST /trips/pickup` (200 / **202 chờ đối soát**) | `/pickup` |
| RE06 Trả xe | `POST /trips/{id}/return`, `/offline-return` | `/trips/{id}/live` |
| PV01 Đặt chỗ đỗ/sạc | `POST /bookings/quote`, `POST /bookings` | `/bookings/new` |
| PV02 Xe cá nhân | `/me/vehicles` CRUD | `/vehicles` |
| PV03 Check-in/out | `POST /bookings/{id}/check-in`, `/check-out`, `/charging/retry`; `POST /iot/checkin` (máy quét QR) | `/bookings/{id}` |
| PV04 Gia hạn | `GET /bookings/{id}/extend-quote`, `POST /bookings/{id}/extend` | `/bookings/{id}` |
| MO01 Tổng quan | `GET /ops/dashboard`, WS `/topic/alerts` | `/ops` |
| MO02 Chi tiết Hub | `GET /ops/hubs/{id}/detail`, WS `/topic/hubs/{id}` | `/ops/hubs/{id}` |
| MO03 Quản lý Hub | `/ops/hubs` (POST/PUT, `/deactivate`, `/activate`) | `/ops/hubs` |
| MO04 Cổng sạc | `/ops/hubs/{id}/ports`, `/ops/ports/{id}` (PUT/DELETE, `/status`) | `/ops/hubs/{id}/ports` |
| MO05 Danh mục xe | `/ops/vehicles` (GET/POST/PUT, `/retire`) | `/ops/vehicles` |
| RB01 Lệnh điều chuyển | `GET /ops/transfers/candidates`, `POST /ops/transfers` | `/ops/transfers` |
| RB02 Thực hiện điều chuyển | `/driver/orders/{id}/load|start|deliver|broken|reroute` | `/driver` |
| MT01 Báo sự cố | `POST /incidents` | `/report` |
| MT02 Phân công | `POST /ops/incidents/{id}/assign` | `/ops/incidents` |
| MT03 Lệnh bảo trì | `POST /ops/maintenance-orders` | `/ops/incidents` |
| MT04 Kết quả kiểm tra | `PUT /tech/tickets/{id}` | `/tech` |
| MT05 Cập nhật tiến độ | `GET /tech/tickets/{id}/precheck`, `POST /tech/tickets/{id}/progress` | `/tech` |
| SC01 Lập lịch sạc | `POST /ops/charging/schedules`, `/confirm`, `/discard` | `/ops/charging` |
| SC02 Điều chỉnh lịch | `POST /ops/charging/items/{id}/validate`, `PUT /ops/charging/items/{id}` | `/ops/charging` |
| SI01–SI03 Kịch bản & chạy | `/ops/simulation/scenarios` (`/validate`), `POST /ops/simulation/runs` | `/ops/simulation` |
| SI04 Kết quả | `GET /ops/simulation/runs/{id}` | `/ops/simulation/runs/{id}` |
| SI05 Áp dụng khuyến nghị | `POST /ops/simulation/runs/{id}/apply/preview`, `/apply` | `/ops/simulation/runs/{id}` |
| §2.3 Đối soát | `GET /ops/reconciliation`, `/commands/{id}/resolve`, `/trips/{id}/confirm` | `/ops/reconciliation` |

(Tất cả đường dẫn API có tiền tố `/api/v1`.)

---

## 4. Truy vết góp ý của giảng viên (Submission 2)

| # | Góp ý | Cách xử lý trong mã nguồn |
|---|---|---|
| 1 | Hiển thị thời điểm cập nhật; kiểm tra lại khi xác nhận | Mọi DTO tra cứu có `dataUpdatedAt/servedAt/stale` (`hub/HubDtos`, `HubQueryService`); UI dùng `<Updated>` + realtime STOMP; mọi thao tác ghi kiểm tra lại trong giao dịch. |
| 2 | Không tự chọn vai trò khi đăng nhập | `account/AuthService` lấy vai trò từ `user_role`; cổng đăng nhập tách biệt (`PORTAL_MISMATCH`); người nhiều vai trò chỉ chọn ngữ cảnh trong số vai trò được cấp (`ROLE_NOT_GRANTED`); `AuthorizationIT`. |
| 3 | RE01 kiểm tra lại → giữ → tạo đơn nguyên tử | `ReservationService.reserve`: CAS `VehicleRepository.casFromAvailable` + partial unique index; đề xuất xe thay thế khi thua tranh chấp; `ConsistencyIT` (100 yêu cầu đồng thời → 1 thành công). |
| 4 | RE04 gia hạn idempotent, xử lý tranh chấp hủy/hết hạn/nhận xe | Bảng `reservation_extension (reservation_id, request_id)` unique; khóa đơn `FOR UPDATE` rồi kiểm tra trạng thái/số lần/thời hạn. |
| 5 | RE05 kết quả mở khóa không rõ → không trả xe về Sẵn sàng | `CommandOutcome.UNKNOWN` → xe `UNLOCK_RECONCILING`, HTTP 202; job đối soát truy vấn lại khóa; `DeviceReconciliationIT`; màn hình `/ops/reconciliation`. |
| 6 | RE06 OTP offline chỉ xác thực, chuyến chờ bằng chứng vật lý | `OfflineOtp` + `TripService.offlineReturn` → `PENDING_RECONCILIATION`; chỉ hoàn tất khi cảm biến ô đỗ + khóa xác nhận hoặc nhân viên xác nhận tại chỗ. OTP phía client (`lib/otp.ts`) đã đối chiếu khớp với Java. |
| 7 | PV01 "Cả hai" nguyên tử | `BookingService.confirm`: giữ ô đỗ và cổng trong **một** giao dịch, exclusion constraint `ex_slot_no_overlap`, `ex_port_no_overlap`; lỗi một phần → rollback toàn bộ. |
| 8 | PV03 thứ tự check-out vật lý | `CheckInService.checkOut`: dừng sạc → thiết bị xác nhận ngắt điện (`AWAITING_EXIT`) → cảm biến báo xe rời → mới giải phóng & tính phí; lỗi ngắt điện giữ `CHECKOUT_REQUESTED`. |
| 9 | RB02 trạng thái theo từng xe | `transfer_item.status` (LOCKED/LOADED/IN_TRANSIT/DELIVERED/FAILED/REMOVED); trạng thái lệnh suy ra bởi `TransferStatusPolicy` (có unit test). |
| 10 | RB01 giữ chỗ tại Hub đích | `TransferService.create` khóa `FOR UPDATE SKIP LOCKED` các ô trống ở Hub đích → `HELD` (`held_for_item_id`); hủy/hỏng/đổi đích trả chỗ giữ. |
| 11 | Phân biệt lịch sạc và phiên sạc thực tế | `charging_schedule_item` (kế hoạch) tách khỏi `charging_session` (chỉ tạo khi thiết bị xác nhận cấp điện); UI hiển thị cả hai cột. |
| 12 | SC02 kiểm tra lại, không dời cam kết người dùng / ngắt phiên đang sạc | `SmartChargingService.validate/adjust`: chặn mục `ACTIVE`, kiểm tra `port_reservation` của sinh viên, kiểm tra lại lần nữa trong giao dịch lưu. |
| 13 | Snapshot mô phỏng | `SnapshotService` chụp trạng thái chỉ đọc; `SimulationEngine` thuần, tất định, không ghi dữ liệu thật (`SimulationIT` kiểm fingerprint không đổi). |
| 14 | Luồng SI05 Áp dụng khuyến nghị | `RecommendationApplyService`: xem trước (diff snapshot ↔ hiện tại, kiểm tra khả thi) → token HMAC có hạn → áp dụng, kiểm tra lại từng mục, không áp dụng lại mục đã áp dụng. |
| 15 | MT: xử lý đặt chỗ/lịch sạc phụ thuộc tài nguyên hỏng | `ImpactService.onVehicleUnavailable/onPortUnavailable`: chuyển cổng tương đương, hủy phần sạc và thông báo, đánh dấu mục lịch `NEEDS_RESCHEDULE`; dùng chung cho MO04, MT02/MT03 và cảnh báo tự động. |
| 16–17 | Nhất quán sơ đồ/tài liệu | Sẽ cập nhật sơ đồ activity/sequence (gồm SI05 mới) khi có mã nguồn sơ đồ; tên trạng thái trong mã nguồn đã thống nhất để vẽ lại. |

---

## 5. Kiểm thử

| Loại | Vị trí | Cách chạy |
|---|---|---|
| Unit (17 ca) | `backend/src/test/.../unit` – luật trạng thái điều chuyển, lập lịch sạc, engine mô phỏng, OTP, CCCD, tính phí | `./mvnw test` |
| Tích hợp (Testcontainers, cần Docker) | `backend/src/test/.../it` – 100 đặt xe đồng thời, gia hạn idempotent, BOTH rollback, mất phản hồi khi mở khóa, trả offline, phân quyền, mô phỏng/áp dụng | `./mvnw verify` (tự bỏ qua nếu không có Docker) |
| Ràng buộc DB đồng thời | `tools/db_concurrency_test.py` – chạy đúng các câu lệnh SQL của service với 20–100 kết nối song song | tạo CSDL riêng `emobility_test` rồi `pip install psycopg && python tools/db_concurrency_test.py` (**script xóa schema của CSDL đích**) |
| Hợp đồng API | `tools/check_contract.py` – so field DTO Java với kiểu TypeScript | `python tools/check_contract.py .` |
| Giao diện | `tools/ui-smoke/` – chụp 30 màn hình với API giả lập, bắt lỗi runtime/console | `npm run build` rồi `python tools/ui-smoke/smoke.py` → `docs/screenshots/` |

Kết quả lần chạy gần nhất: unit 17/17 đạt; 10/10 kịch bản DB đồng thời đạt; 30 màn hình hiển thị không lỗi; OTP Java ↔ JS khớp 12/12 vector.

Ảnh trong `docs/screenshots/` được chụp với **dữ liệu giả lập (fixture)**, chỉ dùng để xem bố cục giao diện.

---

## 6. Lưu ý

- Môi trường dùng để viết mã không truy cập được Maven Central, nên backend mới được biên dịch bằng bộ API thay thế (stub) và kiểm thử từng phần (unit, SQL, contract). **Lần build đầu tiên bằng `./mvnw` trên máy có mạng có thể còn lỗi biên dịch nhỏ** liên quan đến API Spring Boot 4 – sửa theo thông báo lỗi là được.
- `springdoc-openapi` được đặt ở phiên bản 3.0.0 (dòng tương thích Spring Boot 4). Nếu Maven không tìm thấy, đổi sang bản 3.x mới nhất hoặc tạm bỏ dependency này (chỉ phục vụ Swagger UI).
- Khóa bí mật trong `application.yml` (`app.jwt.secret`, `app.crypto.secret`, `app.iot.api-key`) chỉ dùng cho môi trường dev – đặt qua biến môi trường khi triển khai.
- Thanh toán là giả lập (`core/payment/PaymentSimulator`): mở khóa 3.000đ, xe đạp 300đ/phút, xe máy 500đ/phút, đỗ xe 3.000đ/giờ, sạc 3.500đ/kWh.
