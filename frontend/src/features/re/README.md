# RE (Frontend): Đặt trước, nhận và trả xe dùng chung

> Phụ trách FE: **FE2 – Tran Gia Huan**. Backend tương ứng: `backend/.../module/rental`.
> Đã làm đủ **RE01–RE06** (9 khung Figma), chạy trên mock (MSW).
>
> Cách chạy và cấu trúc chung của frontend: [`frontend/README.md`](../../../README.md).
> Contract API đang dùng và các đề xuất gửi BE: [`CONTRACT.md`](./CONTRACT.md).

---

## 1. Màn hình ↔ use case

| Route | Màn (Figma node) | UC | File |
|---|---|---|---|
| `/reserve` | Chọn xe (không có khung riêng) | trước RE01 | `pages/VehicleListPage.tsx` |
| `/reserve/current` | RE01 `400-220` – xác nhận & đếm ngược | RE01 | `pages/ReservationPage.tsx` |
| ↳ modal | RE04 `400-280` – gia hạn giữ chỗ | RE04 | `components/ExtendReservationModal.tsx` |
| ↳ modal | RE03 `400-358` – hủy đặt trước | RE03 | `components/CancelReservationModal.tsx` |
| `/trips/history` | RE02 `400-544` – lịch sử đặt xe + chi tiết + timeline | RE02 | `pages/ReservationHistoryPage.tsx` |
| `/pickup` | RE05a `400-717` – quét QR & checklist xác thực | RE05 | `pages/PickupPage.tsx` |
| `/pickup/success` | RE05b `15-1042` – mở khóa thành công | RE05 | `pages/PickupSuccessPage.tsx` |
| `/trips/current` | RE05c `15-1072` – chuyến đi đang diễn ra | RE05→06 | `pages/ActiveTripPage.tsx` |
| `/trips/current/return` | RE06a `400-841` – kiểm tra vị trí đỗ & xác nhận | RE06 | `pages/ReturnPage.tsx` |
| `/trips/:id/summary` | RE06b `15-1137` – tóm tắt & chi phí, đánh giá | RE06 | `pages/TripSummaryPage.tsx` |
| `/trips` | Tự chuyển: có chuyến → `/trips/current`, không → `/trips/history` | | `TripsIndexRedirect` |

```
/reserve ──Đặt trước──► /reserve/current (RE01) ──Gia hạn / Hủy (modal RE04 / RE03)
                              │ Nhận xe – quét mã QR
                              ▼
 (thuê trực tiếp) ───────► /pickup (RE05a) ──201──► /pickup/success (5b) ──► /trips/current (5c)
                              │ 4xx/5xx: đánh dấu bước trượt + gợi ý xe khác      │ Trả xe tại Hub
                              ▼                                                   ▼
                                                  /trips/:id/summary (6b) ◄── /trips/current/return (6a)
```

---

## 2. Các file khác

| File | Vai trò |
|---|---|
| `types.ts` | Kiểu dữ liệu (đơn, lịch sử, Trip, trả xe, sự cố, đánh giá), `RESERVATION_RULES`, `POLL_MS` |
| `api.ts` | Hook TanStack Query cho mọi API của RE |
| `offlineReturn.ts` | Hàng đợi trả xe offline (RE06 E2) + hook tự đồng bộ |
| `components/Modal.tsx` | Modal dùng chung trong module (chờ component chung của FE1) |
| `components/StepList.tsx` | Danh sách bước ✓ / đang chạy / ✕ (RE05a, RE06a) |
| `components/IncidentReportModal.tsx` | Báo sự cố xe/cổng sạc (5c), biên bản hư hỏng kèm ảnh (6a – A1) |
| `components/RatingModal.tsx` | Đánh giá chuyến đi (6b) |
| `components/StatusChip.tsx`, `HoldCountdown.tsx`, `HubDirections.tsx` | Chip trạng thái, đồng hồ giữ chỗ, khối bản đồ |
| `mocks/db.ts` | Dữ liệu giả + **simulator thiết bị** (kịch bản lỗi theo mã xe, Hub không có cảm biến, Hub có cổng sạc) |
| `mocks/handlers.ts` | Handler MSW: RE01/RE04 giống `RentalService`, phần còn lại theo `CONTRACT.md` |
| `re.css`, `re-flow.css` | Style RE01 / RE02–RE06 |

Ngoài module có sửa file dùng chung: `shared/api/http.ts` (thêm `postForm` cho multipart), `shared/i18n/format.ts` (tiền, km, thời gian đã đi), `shared/i18n/vi.ts` (nhãn + thông báo lỗi mới), `shared/styles/global.css` (`btn-danger`, `alert-success`, `sr-only`), `app/router.tsx` (route mới).

---

## 3. Chạy và thử

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173/reserve
```

Dữ liệu mock nằm trong bộ nhớ, **tải lại trang là về ban đầu** (riêng yêu cầu trả xe offline được lưu trong `localStorage`). Lịch sử có sẵn 4 đơn mẫu (2 hoàn tất, 1 hủy, 1 hết hạn).

| Muốn thử | Cách làm | Kết quả mong đợi |
|---|---|---|
| RE01 → RE04 | Đặt `UG-001`, bấm **Gia hạn** 2 lần | Hạn +10 phút mỗi lần, lần 3 nút bị tắt (0/2 → 2/2) |
| RE04 bị từ chối | Đặt `UG-005`, bấm **Gia hạn** | "Xe đang được ưu tiên cho quy trình vận hành khác…" |
| RE03 | Đặt xe, **Hủy đặt trước** → **Xác nhận hủy** | Báo đã hủy; xe "Chờ kiểm tra" ~30 s rồi mới hiện lại trong danh sách |
| RE02 | Menu **Chuyến đi** (khi không có chuyến) | Bảng đơn, lọc theo tab, bấm dòng để xem timeline |
| RE05 thành công | Từ RE01 bấm **Nhận xe**, **Nhận xe** | Checklist chạy lần lượt → 5b → 5c (chi phí/pin cập nhật mỗi 5 s) |
| Thuê trực tiếp | Không có đơn, vào `/pickup`, nhập `UG-011` | Checklist ghi "Thuê trực tiếp", tạo chuyến không gắn đơn |
| Pin thấp | Nhập `UG-004` | Bước "Mức pin đạt ngưỡng" ✕ + gợi ý xe khác cùng Hub |
| Xe không ở Hub / có sự cố | `UG-037` / `UG-048` | Bước tương ứng ✕ + gợi ý xe khác |
| Mở khóa lỗi / quá giờ | `UG-023` / `UG-012` (đợi ~5 s) | Bước mở khóa ✕, xe "Báo lỗi", không tạo chuyến, có gợi ý xe khác |
| RE06 bình thường | Ở 5c bấm **Trả xe tại Hub**, chọn *Nhà Văn hóa SV* | ~4 s sau bước 1 ✓ (ô đỗ) và bước 2 ✓ (sạc) → tick 2 ô → 6b, xe "Đang sạc" |
| RE06 E1 (không có xác nhận ô đỗ) | Chọn Hub *ĐH Bách khoa* | Bước 1 chờ mãi → **Xác nhận thủ công** bằng OTP 6 số (`000000` = OTP sai) hoặc ảnh |
| RE06 A1 hư hỏng | **Xe có hư hỏng? Lập biên bản…** (bắt buộc ảnh) | Ô "không hư hỏng" đổi thành dòng biên bản; sau trả xe "Bảo trì" |
| RE06 E2 offline | DevTools → Network → *Offline*, bấm **Trả xe bằng OTP offline**, nhập 6 số | "Đang chờ kết nối…"; bật lại mạng → tự đồng bộ (≤ 15 s) → 6b |
| Đánh giá | Ở 6b bấm **Đánh giá chuyến đi** | Chọn sao xe + Hub, gửi; nút đổi thành "Đã đánh giá" |

**Chạy với backend thật**: đặt `VITE_API_MOCK=false`. Hiện mới chạy được RE01/RE04; các API còn lại backend chưa có (xem `CONTRACT.md`).

---

## 4. Quyết định thiết kế

- **Đếm ngược theo giờ server** (`expiresAt − serverNow`, giờ server lấy từ header `Date`). Modal RE04 có hiển thị "Hạn giữ chỗ mới" = hạn hiện tại + 10 phút nhưng chỉ để xem trước; sau khi xác nhận FE dùng `expiresAt` server trả về.
- **Checklist RE05a là 1 request.** Server kiểm tra mọi điều kiện trong một transaction; FE chạy hiệu ứng từng bước trong lúc chờ, rồi dùng **mã lỗi** để biết bước nào trượt (`FAILED_STEP` trong `PickupPage.tsx`). Không cần thêm API "kiểm tra trước".
- **Gợi ý xe khác** khi nhận xe thất bại: dùng lại `GET /vehicles?hubId=&status=AVAILABLE` với `details.hubId` trong lỗi, không thêm API.
- **Trả xe: polling `return/check` 5 s** tới khi thiết bị xác nhận ô đỗ (A.2: polling, không WebSocket). Không có xác nhận thì backend trả `INVALID_RETURN_LOCATION`, FE mở luồng thủ công.
- **Trả xe offline**: yêu cầu lưu ở `localStorage` (sống qua reload), gửi lại khi trình duyệt báo `online` và mỗi 15 s. Lỗi 4xx (OTP sai) thì bỏ khỏi hàng đợi và báo người dùng; lỗi mạng/5xx thì giữ để thử lại. Thời điểm kết thúc lấy theo giờ server ước tính lúc bấm (`clientEndedAt`).
- **Chặn bấm đúp**: mọi nút gửi bị tắt khi đang chờ; `return` ở server cũng nên idempotent (mock đã làm).
- **Polling**: đơn 10 s, chuyến đi 5 s (`POLL_MS`).
- **Sau mỗi thao tác ghi làm mới cả module** (`queryKey: ['re']`) vì trạng thái đơn/xe/chuyến liên quan nhau và dữ liệu nhỏ.
- **Lỗi theo `code`**, không theo câu chữ; vài màn có câu riêng cho ngữ cảnh (vd. `VEHICLE_HAS_OPERATION` ở RE04 nghĩa là "xe đang được ưu tiên").

---

## 5. Chưa làm / cần chốt

- **Camera quét QR**: khung quét chỉ là giao diện, người dùng nhập mã xe. Có thể dùng `BarcodeDetector` hoặc thư viện như `@zxing/browser` khi nhóm đồng ý thêm dependency.
- **Bản đồ** (RE01, 5c, 6a) là khối giả + link Google Maps.
- **Lịch sử chuyến đi** (toggle ở RE02): chưa có API, chưa rõ module.
- Một số nhãn không có trong bảng B.8 nên tự đặt (cần đối chiếu Figma): tiêu đề form báo sự cố/đánh giá, nút "Nhận xe" ở cột checklist, "Thuê trực tiếp tại Hub", nội dung hướng dẫn an toàn.
- Các điểm lệch contract và mã lỗi mới: xem `CONTRACT.md` mục 3–4.

---

## 6. Ghi chú khai báo AI

Toàn bộ RE02–RE06 (màn hình, component, hook, mock, tài liệu này) và phần mở rộng các file dùng chung được sinh bởi **Claude Code** trong một phiên làm việc, dựa trên `CLAUDE_BTL_SmartEMobilityHub.md`, code RE01 có sẵn và backend `module/rental`. Luồng mock đã được kiểm tra tự động (41 kịch bản API qua `msw/node`); giao diện **chưa được người phụ trách bấm thử hết**. Người phụ trách cần đọc hiểu và chạy thử theo bảng mục 3 trước khi nộp.
