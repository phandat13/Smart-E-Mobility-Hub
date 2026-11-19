import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from './api/types';
import { InternalLayout, OpsLayout, StudentLayout } from './components/Layouts';
import { homeFor, useAuth } from './lib/auth';
import { InternalLoginPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { DriverOrdersPage } from './pages/internal/DriverApp';
import { TechnicianOrdersPage } from './pages/internal/TechnicianApp';
import { ChargingPage } from './pages/ops/ChargingPage';
import { DashboardPage } from './pages/ops/DashboardPage';
import { HubDetailPage, HubManagementPage, PortManagementPage, VehicleCatalogPage } from './pages/ops/HubPages';
import { IncidentPage } from './pages/ops/IncidentPage';
import { ReconciliationPage } from './pages/ops/ReconciliationPage';
import { SimulationPage, SimulationRunPage } from './pages/ops/SimulationPages';
import { TransferPage } from './pages/ops/TransferPage';
import { AccountPage, MyVehiclesPage, ReportIncidentPage } from './pages/student/AccountPages';
import { BookingDetailPage, BookingsPage, NewBookingPage } from './pages/student/BookingPages';
import { HomePage } from './pages/student/HomePage';
import { LiveTripPage } from './pages/student/LiveTripPage';
import { PickupPage } from './pages/student/PickupPage';
import { ReservationPage } from './pages/student/ReservationPage';
import { RatingPage, TripsPage } from './pages/student/TripsPage';

/** Góp ý #2: vai trò lấy từ tài khoản – route chỉ mở cho đúng vai trò đang hoạt động (backend cũng kiểm tra lại). */
function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={role === 'STUDENT' ? '/login' : '/internal/login'} state={{ from: loc.pathname }} replace />;
  if (user.activeRole !== role) return <Navigate to={homeFor(user.activeRole)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/internal/login" element={<InternalLoginPage />} />

      <Route element={<Guard role="STUDENT"><StudentLayout /></Guard>}>
        <Route index element={<HomePage />} />
        <Route path="reservations/:id" element={<ReservationPage />} />
        <Route path="pickup" element={<PickupPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:id/live" element={<LiveTripPage />} />
        <Route path="trips/:id/rate" element={<RatingPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/new" element={<NewBookingPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="vehicles" element={<MyVehiclesPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="report" element={<ReportIncidentPage />} />
      </Route>

      <Route path="/ops" element={<Guard role="OPERATOR"><OpsLayout /></Guard>}>
        <Route index element={<DashboardPage />} />
        <Route path="hubs" element={<HubManagementPage />} />
        <Route path="hubs/:id" element={<HubDetailPage />} />
        <Route path="hubs/:id/ports" element={<PortManagementPage />} />
        <Route path="vehicles" element={<VehicleCatalogPage />} />
        <Route path="transfers" element={<TransferPage />} />
        <Route path="incidents" element={<IncidentPage />} />
        <Route path="charging" element={<ChargingPage />} />
        <Route path="simulation" element={<SimulationPage />} />
        <Route path="simulation/runs/:id" element={<SimulationRunPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
      </Route>

      <Route path="/driver" element={<Guard role="DRIVER"><InternalLayout title="TÀI XẾ ĐIỀU CHUYỂN" tabs={[{ to: '/driver', label: 'Lệnh của tôi', end: true }]} /></Guard>}>
        <Route index element={<DriverOrdersPage />} />
      </Route>
      <Route path="/tech" element={<Guard role="TECHNICIAN"><InternalLayout title="KỸ THUẬT VIÊN" tabs={[{ to: '/tech', label: 'Lệnh bảo trì', end: true }]} /></Guard>}>
        <Route index element={<TechnicianOrdersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
