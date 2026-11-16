import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import SetupPage from './pages/SetupPage';
import NotImplementedPage from './pages/NotImplementedPage';
import PortalLayout from './layouts/PortalLayout';
import VehiclePage from './features/pv/VehiclePage';
import BookingPage from './features/pv/BookingPage';
import ConfirmationPage from './features/pv/ConfirmationPage';
import { SessionListPage, SessionPage } from './features/pv/SessionPages';
import { IncidentPage, IncidentReceivedPage } from './features/mt/IncidentPages';
import { IncidentQueuePage, ResourceMaintenancePage } from './features/mt/OperatorPages';
import { NewTicketPage, TechnicianListPage, TicketProgressPage } from './features/mt/TechnicianPages';
import { USE_MOCK } from './api/client';
import { Notice } from './shared/ui';

export default function App() {
  if (!USE_MOCK) return <main className="setup-page"><h1>API PV / MT chưa được kết nối</h1><Notice tone="warning">Backend chưa triển khai các endpoint PV / MT. Đặt VITE_USE_MOCK=true để chạy demo. Ứng dụng không gửi yêu cầu thay đổi dữ liệu tới backend.</Notice></main>;
  return (
    <Routes>
      <Route index element={<Navigate to="/setup" replace />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<PortalLayout />}>
        <Route path="/pv" element={<SessionListPage />} />
        <Route path="/pv/vehicles" element={<VehiclePage />} />
        <Route path="/pv/book" element={<BookingPage />} />
        <Route path="/pv/bookings/:id/qr" element={<ConfirmationPage />} />
        <Route path="/pv/sessions" element={<SessionListPage />} />
        <Route path="/pv/sessions/:id" element={<SessionPage />} />
        <Route path="/pv/sessions/:id/extend" element={<SessionPage />} />
        <Route path="/incidents/new" element={<IncidentPage />} />
        <Route path="/incidents/:id/received" element={<IncidentReceivedPage />} />
      </Route>
      <Route element={<PortalLayout technician />}>
        <Route path="/tech/maintenance" element={<TechnicianListPage />} />
        <Route path="/tech/maintenance/tickets" element={<TechnicianListPage ticketsOnly />} />
        <Route path="/tech/maintenance/history" element={<TechnicianListPage history />} />
        <Route path="/tech/maintenance/tickets/new/:orderId/:resourceId" element={<NewTicketPage />} />
        <Route path="/tech/maintenance/tickets/:id" element={<TicketProgressPage />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/maintenance" element={<IncidentQueuePage />} />
        <Route path="/maintenance/orders/new" element={<ResourceMaintenancePage />} />
        <Route path="*" element={<NotImplementedPage title="Màn hình ngoài phạm vi PV / MT" />} />
      </Route>
    </Routes>
  );
}
