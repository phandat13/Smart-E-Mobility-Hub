import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import AppLayout from './layouts/AppLayout';
import StudentLayout from './layouts/StudentLayout';
import InternalDriverLayout from './layouts/InternalDriverLayout';
import NetworkOverviewPage from './features/mo/pages/NetworkOverviewPage';
import { ChargerManagementPage, HubDetailPage, HubManagementPage, VehicleCatalogPage } from './features/mo/pages/HubOperationsPages';
import { AdjustChargingSchedulePage, ChargingSchedulePage } from './features/sc/pages/ChargingSchedulePages';
import { ApplyRecommendationsPage, SimulationResultsPage, WhatIfScenarioPage } from './features/si/pages/WhatIfSimulationPages';
import Placeholder from './pages/Placeholder';
import LoginStudentPage from './features/auth/pages/LoginStudentPage';
import LoginInternalPage from './features/auth/pages/LoginInternalPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import RegisterSuccessPage from './features/auth/pages/RegisterSuccessPage';
import ProfilePage from './features/ac/pages/ProfilePage';
import TripHistoryPage from './features/ac/pages/TripHistoryPage';
import RateTripPage from './features/ac/pages/RateTripPage';
import SearchHubPage from './features/ac/pages/SearchHubPage';
import DispatchBoardPage from './features/rb/pages/DispatchBoardPage';
import DriverOrdersPage from './features/rb/pages/DriverOrdersPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginStudentPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/success" element={<RegisterSuccessPage />} />
        <Route path="/internal/login" element={<LoginInternalPage />} />

        {/* Student portal */}
        <Route element={<StudentLayout />}>
          <Route element={<RequireAuth roles={['STUDENT']} />}>
            <Route path="/student" element={<Navigate to="/student/hubs" replace />} />
            <Route path="/student/hubs" element={<SearchHubPage />} /> {/* AC01 - Search Hub */}
            <Route path="/account" element={<Navigate to="/account/profile" replace />} />
            <Route path="/account/profile" element={<ProfilePage />} /> {/* AC04 - Profile */}
            <Route path="/account/trips" element={<TripHistoryPage />} /> {/* AC05 - Trip History */}
            <Route path="/account/trips/:id/rate" element={<RateTripPage />} /> {/* AC06 - Rate Trip */}
            <Route path="/student/booking" element={<Placeholder />} /> {/* RE placeholder */}
          </Route>
        </Route>

        {/* Operator portal (AppLayout dùng chung với TV4). Các route MO/SC/SI giữ nguyên, chưa bọc guard;
            chỉ RB01 yêu cầu vai trò OPERATOR. */}
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<NetworkOverviewPage />} />
          <Route element={<RequireAuth roles={['OPERATOR']} fallbackPathname="/internal/login" />}>
            <Route path="/rebalance" element={<DispatchBoardPage />} /> {/* RB01 - Dispatch Board */}
          </Route>
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
        </Route>

        {/* Driver portal */}
        <Route element={<InternalDriverLayout />}>
          <Route element={<RequireAuth roles={['DRIVER']} fallbackPathname="/internal/login" />}>
            <Route path="/driver" element={<DriverOrdersPage />} /> {/* RB02 - Driver Orders */}
            <Route path="/driver/history" element={<DriverOrdersPage view="history" />} /> {/* RB02 - History tab */}
            <Route path="/driver/incidents" element={<DriverOrdersPage view="incidents" />} /> {/* RB02 - Incidents tab */}
          </Route>
        </Route>

        {/* Technician placeholder */}
        <Route element={<RequireAuth roles={['TECHNICIAN']} fallbackPathname="/internal/login" />}>
          <Route path="/technician" element={<Placeholder />} />
        </Route>

        <Route path="*" element={<Placeholder />} />
      </Routes>
    </AuthProvider>
  );
}
