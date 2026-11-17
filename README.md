# Smart E-Mobility Hub — PV / MT frontend

Nhánh `feat/pv-mt-frontend` thêm giao diện **PV01–04** (đặt chỗ đỗ, lịch sạc, quản lý xe cá nhân)
và **MT01–05** (báo cáo sự cố, hàng đợi và phân công, lệnh / phiếu bảo trì) lên nền frontend chung
của nhóm, nhánh `refactor/frontend-cleanup` (commit `e3b954e`). Các màn được làm theo thiết kế Figma
của nhóm. Bản trước đó nằm trên nhánh `pv-mt-frontend`.

## Chạy thử

```powershell
cd frontend
npm ci
npm run dev
```

Mở `/setup` để chọn cổng (sinh viên, vận hành, kỹ thuật viên) và điều khiển dữ liệu demo.
MT02–03 nằm trong layout vận hành tại `/maintenance`.
Mở địa chỉ Vite in ra (thường là http://localhost:5173) và xem các trang:

/setup: trang chọn cổng và điều khiển dữ liệu demo
/pv/book, /pv/vehicles: PV
/incidents/new, /maintenance, /tech/maintenance: MT
/overview: để thấy màn MO của nhóm vẫn như cũ

## Những gì đã thêm

- Code PV / MT theo cấu trúc của bản refactor: mỗi màn một file trong `features/pv/pages`,
  `features/mt/pages` (kèm `components`, `styles`, `types`, `utils`); dữ liệu và xử lý mock trong
  `mocks/pv-mt`; `api/pvApi.ts`, `api/mtApi.ts` gọi mock khi `USE_MOCK` bật. Thành phần UI dùng chung
  cho PV / MT nằm trong `shared`; `layouts/PortalLayout.tsx` và `pages/SetupPage.tsx` cho cổng demo.
- File chung chỉ sửa ít: thêm route trong `App.tsx`, 4 token màu trong `styles/tokens.css`,
  icon PV / MT trong `assets/icons/index.ts`, thư viện `qrcode` trong `package.json`.
  Sidebar, Topbar và các module MO / SC / SI giữ nguyên.
- PV / MT đang chạy trên dữ liệu mô phỏng (localStorage), chưa gọi backend; cần thống nhất API
  với backend PV (`RE-PV-RB`) và MT khi tích hợp.
