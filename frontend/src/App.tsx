import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import NetworkOverviewPage from './features/mo/pages/NetworkOverviewPage';
import {
  ChargerManagementPage,
  HubDetailPage,
  HubManagementPage,
  VehicleCatalogPage,
} from './features/mo/pages/HubOperationsPages';
import {
  AdjustChargingSchedulePage,
  ChargingSchedulePage,
} from './features/sc/pages/ChargingSchedulePages';
import {
  ApplyRecommendationsPage,
  SimulationResultsPage,
  WhatIfScenarioPage,
} from './features/si/pages/WhatIfSimulationPages';
import Placeholder from './pages/Placeholder';
import PortalLayout from './layouts/PortalLayout';
import SetupPage from './pages/SetupPage';
import MockOnly from './shared/MockOnly';
import VehiclePage from './features/pv/pages/VehiclePage';
import BookingPage from './features/pv/pages/BookingPage';
import ConfirmationPage from './features/pv/pages/ConfirmationPage';
import { SessionListPage, SessionPage } from './features/pv/pages/SessionPages';
import { IncidentPage, IncidentReceivedPage } from './features/mt/pages/IncidentPages';
import { IncidentQueuePage, ResourceMaintenancePage } from './features/mt/pages/OperatorPages';
import {
  NewTicketPage,
  TechnicianListPage,
  TicketProgressPage,
} from './features/mt/pages/TechnicianPages';

export default function App() {
  return (
    <Routes>
      <Route element={<MockOnly />}>
        {/* PV / MT demo launcher and student / technician portals */}
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
          <Route
            path="/tech/maintenance/tickets/new/:orderId/:resourceId"
            element={<NewTicketPage />}
          />
          <Route path="/tech/maintenance/tickets/:id" element={<TicketProgressPage />} />
        </Route>
      </Route>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<NetworkOverviewPage />} />
        <Route path="/hubs" element={<HubManagementPage />} />
        <Route path="/hubs/manage" element={<HubManagementPage />} />
        <Route path="/hubs/:hubId/chargers" element={<ChargerManagementPage />} />
        <Route path="/hubs/:hubId" element={<HubDetailPage />} />
        <Route path="/vehicles" element={<VehicleCatalogPage />} />
        <Route path="/charging-schedules" element={<ChargingSchedulePage />} />
        <Route path="/charging-schedules/adjust" element={<AdjustChargingSchedulePage />} />
        <Route path="/simulations" element={<WhatIfScenarioPage />} />
        <Route path="/simulations/:simulationId/results" element={<SimulationResultsPage />} />
        <Route path="/simulations/:simulationId/apply" element={<ApplyRecommendationsPage />} />
        <Route element={<MockOnly />}>
          <Route path="/maintenance" element={<IncidentQueuePage />} />
          <Route path="/maintenance/orders/new" element={<ResourceMaintenancePage />} />
        </Route>
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
