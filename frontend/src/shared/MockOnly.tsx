import { Outlet } from 'react-router-dom';
import { USE_MOCK } from '../api/client';
import { Notice } from './ui';

/** PV / MT screens only run on the local mock store until their backend endpoints are agreed. */
export default function MockOnly() {
  if (USE_MOCK) return <Outlet />;
  return (
    <main className="setup-page">
      <h1>API PV / MT chưa được kết nối</h1>
      <Notice tone="warning">
        Backend chưa triển khai các endpoint PV / MT. Đặt VITE_USE_MOCK=true để chạy demo. Ứng dụng
        không gửi yêu cầu thay đổi dữ liệu tới backend.
      </Notice>
    </main>
  );
}
