# UniGo – Frontend

React 19 + TypeScript + Vite, React Router, TanStack Query, MSW (mock API).

## Chạy

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # kiểm tra type + build
npm run lint
```

`VITE_API_MOCK` trong `.env.development`:
- `true` (mặc định): API do MSW giả lập trong trình duyệt, không cần backend.
- `false`: gọi backend thật qua proxy `/api` → `http://localhost:8080`. Chưa có API đăng nhập, nên phải đặt JWT thủ công: `localStorage.setItem('unigo.token', '<jwt>')`.

## Cấu trúc

```
src/
├── main.tsx              khởi tạo QueryClient, Router, bật MSW khi mock
├── app/                  router + shell tạm (FE1 sẽ thay shell dùng chung)
├── shared/
│   ├── api/http.ts       fetch wrapper, ApiError {status, code, details}, giờ server
│   ├── hooks/            useServerNow (đếm ngược theo giờ server)
│   ├── i18n/             nhãn tiếng Việt cho enum/mã lỗi, định dạng giờ
│   └── styles/           token màu + class dùng chung
├── mocks/browser.ts      gom handler MSW của các module
└── features/
    └── re/               module RE (FE2)
        ├── CONTRACT.md   contract FE đang dùng + đề xuất cho BE
        ├── api.ts        hook TanStack Query
        ├── types.ts
        ├── mocks/        dữ liệu + handler giả
        ├── components/
        └── pages/
```

Mỗi module thêm vào `src/features/<module>/` theo cùng khuôn, rồi đăng ký route trong `app/router.tsx` và handler trong `mocks/browser.ts`.
