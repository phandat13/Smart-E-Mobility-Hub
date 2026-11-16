# Smart E-Mobility Hub — PV / MT frontend

Branch `pv-mt-frontend`: giao diện PV01–04 và MT01–05 bằng React,
TypeScript, Vite và CSS. Backend có sẵn được giữ nguyên.

## Chạy frontend

Cần Node.js 22.12+ kèm npm. Sau khi cài Node, mở lại terminal.

```powershell
cd frontend
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị, vào `/setup` để chọn cổng. Giữ terminal mở;
Ctrl+C để dừng. Nếu đã có `node_modules` và chỉ có lệnh `node`, có thể chạy:

```powershell
node node_modules/vite/bin/vite.js
```

Kiểm tra TypeScript và build: `npm run build`. Xem bản build: `npm run preview`.

## Màn hình

| Đường dẫn | Nội dung |
| --- | --- |
| `/setup` | Chọn cổng, điều khiển đồng hồ / thiết bị mô phỏng, đặt lại dữ liệu |
| `/pv/vehicles` | PV02: quản lý xe cá nhân |
| `/pv/book` | PV01: đặt chỗ đỗ / sạc, chọn vị trí, nhận QR |
| `/pv/sessions` | PV03–04: danh sách phiên, check-in/out và gia hạn |
| `/incidents/new` | MT01: báo cáo sự cố và ảnh hiện trường |
| `/maintenance` | MT02: hàng đợi sự cố, phân công, ghi chú và nghiệm thu |
| `/maintenance/orders/new` | MT03: tạo lệnh bảo trì |
| `/tech/maintenance` | MT04–05: lệnh được giao, phiếu và tiến trình bảo trì |

## Dữ liệu và tích hợp

- Frontend hiện dùng mock lưu trong localStorage. Không cần chạy backend để xem
  giao diện; chưa kết nối auth, IoT, upload ảnh hoặc thanh toán thực.
- `/setup` cho phép tăng đồng hồ demo, mô phỏng lỗi thiết bị / xung đột, đổi kỹ
  thuật viên và xác minh cảm biến. Chuyển cổng không phải đăng nhập thật.
- Khi check-in/out, dùng “Mô phỏng quét QR của phiên này”. Ảnh được lưu cục bộ.
- `VITE_USE_MOCK` mặc định bật. Đặt thành `false` sẽ hiện thông báo chưa kết nối
  API; `VITE_API_BASE` dành cho tích hợp sau. Không gửi mutation tới backend.
- Mã nguồn nằm trong `frontend/src/`, theo các nhóm `features/pv`, `features/mt`,
  `layouts`, `shared`, `api` và `mocks`. `node_modules/` và `dist/` không đưa lên Git.
- Khi tích hợp, cần thống nhất routing, layout, design tokens, auth và DTO với
  nhóm. Backend PV trên branch `RE-PV-RB` hiện tự chọn chỗ/cổng, giới hạn check-in
  ±15 phút, nhả tài nguyên ngay khi check-out và chưa có API sửa xe / gia hạn;
  các hành vi đó khác mock hiện tại. Backend MT cũng cần hợp đồng API riêng.

## Nguồn tái sử dụng

Scaffold React/Vite, operator layout và design tokens được tái sử dụng có chỉnh
sửa từ `feat/mo-sc-si-frontend`, commit
`41c4375570ce7277e75a99e849449f7990efb092`, tác giả **SPKILLER2301**.
Các màn PV/MT được triển khai từ thiết kế Figma của nhóm; MT02 đã được cập nhật
lại ngày 16/11/2026. Không nhận các phần nền tảng trên là mã PV/MT viết mới.

Kho này đã bỏ launcher riêng, bộ kiểm thử Playwright và tài liệu phụ để giữ
cấu trúc gọn. Lệnh build vẫn kiểm tra TypeScript trước khi đóng gói.
