import { icons } from '../../assets/icons';
import type { ScenarioKind } from '../../features/si/types';
export const mockScenarioKinds: { name: ScenarioKind; desc: string; icon: string }[] = [
  { name: 'Đột biến tải', desc: 'Ga Metro, KTX – tan học, tàu cập ga', icon: icons.chart },
  {
    name: 'Đứt gãy hạ tầng',
    desc: 'Hỏng cổng sạc, cúp điện, hỏng xe hàng loạt',
    icon: icons.charging,
  },
  {
    name: 'Điều chuyển tái cân bằng',
    desc: 'Thử nghiệm các lệnh điều chuyển',
    icon: icons.transfer,
  },
  { name: 'Phân bổ năng lực trạm sạc', desc: 'Thay đổi số cổng / công suất sạc', icon: icons.plug },
];
export const mockSavedScenarios = [
  { name: 'Cúp điện KTX A (2h)', detail: 'Đứt gãy hạ tầng · 06/10' },
  { name: 'Tái cân bằng sáng thứ 2', detail: 'Điều chuyển · 04/10' },
  { name: 'Thi cuối kỳ – Thư viện', detail: 'Đột biến tải · 01/10' },
];
export const mockHubShortages = [
  { hub: 'Ga Metro', value: 12, tone: 'red', label: 'thiếu 12' },
  { hub: 'KTX Khu B', value: 8, tone: 'red', label: 'thiếu 8' },
  { hub: 'KTX Khu A', value: 3, tone: 'orange', label: 'thiếu 3' },
  { hub: 'Thư viện TT', value: 0, tone: 'green', label: 'cân bằng' },
  { hub: 'Tòa VNU', value: -14, tone: 'green', label: 'dư 14' },
];
export const mockRecommendations = [
  {
    id: 'r1',
    title: 'Chuyển 12 xe Tòa VNU → Ga Metro',
    detail: 'Trước 16:55 · giảm thiếu hụt còn 0',
    type: 'move',
  },
  { id: 'r2', title: 'Chuyển 8 xe Thư viện TT → KTX Khu B', detail: 'Trước 17:10', type: 'move' },
  {
    id: 'r3',
    title: 'Ưu tiên sạc 6 xe tại KTX Khu A',
    detail: 'Điều chỉnh lịch sạc #LS-0710-03',
    type: 'charge',
  },
];
export const mockOccupancyTrend = [
  { t: 'T', v: 62 },
  { t: '+10', v: 74 },
  { t: '+20', v: 88 },
  { t: '+30', v: 98 },
  { t: '+45', v: 93 },
  { t: '+60', v: 81 },
];
export const mockSimulationHistory = [
  { id: 'SIM-0710-05', name: 'Tan học + Metro 17h', tag: 'Đang xem' },
  { id: 'SIM-0706-02', name: 'Cúp điện KTX A (2h)', tag: '06/10 · 71%' },
  { id: 'SIM-0704-01', name: 'Tái cân bằng sáng thứ 2', tag: '04/10 · 97%' },
];
export const mockSimulationHubOptions = [
  'Ga Metro ĐHQG',
  'KTX Khu A',
  'KTX Khu B',
  'Thư viện TT',
  'Tòa VNU',
];
export const mockSelectedSimulationHubs = ['Ga Metro ĐHQG', 'KTX Khu A', 'KTX Khu B'];
export const mockSelectedRecommendationIds = ['r1', 'r3'];
