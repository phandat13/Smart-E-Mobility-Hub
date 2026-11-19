// Kiểu dữ liệu khớp DTO của backend (vn.edu.hcmut.emobility.*Dtos)
export type Role = 'STUDENT' | 'OPERATOR' | 'DRIVER' | 'TECHNICIAN';

export interface ApiError { code: string; message: string; details: Record<string, unknown>; path: string; timestamp: string }

export interface UserView { id: number; username: string; fullName: string; activeRole: Role; roles: Role[]; studentCode?: string | null }
export interface TokenResponse { accessToken: string; expiresAt: string; user: UserView; requiresContextSelection: boolean }
export interface RegisterResult { profileCode: string; fullName: string; email: string; maskedPhone: string; status: string; message: string }
export interface ProfileView { userId: number; username: string; fullName: string; studentCode: string; email: string; phone: string; school: string; address: string | null; verified: boolean }

export interface HubSummary {
  id: number; code: string; name: string; address: string | null; area: string | null; type: string; status: 'ACTIVE' | 'INACTIVE';
  latitude: number; longitude: number; availableVehicles: number; avgBattery: number | null; totalVehicles: number;
  freeSharedSlots: number; sharedCapacity: number; freePersonalSlots: number; personalCapacity: number;
  freePorts: number; totalPorts: number; faultyPorts: number; dataUpdatedAt: string | null; stale: boolean; servedAt: string;
}
export interface HubVehicleView { id: number; code: string; type: string; model: string | null; batteryPercent: number; rangeKm: number; status: string }
export interface HubDetail { hub: HubSummary; vehicles: HubVehicleView[] }
export interface SearchResult { items: HubSummary[]; suggestions: HubSummary[]; servedAt: string; refreshSeconds: number }
export interface SlotView { id: number; code: string; kind: 'SHARED' | 'PERSONAL'; status: string; vehicleCode: string | null; freeInWindow: boolean }
export interface PortView { id: number; code: string; powerKw: number; connectorType: string; status: string; disableAfterSession: boolean; freeInWindow: boolean }

export interface AlternativeView { id: number; code: string; type: string; batteryPercent: number; rangeKm: number }
export interface ExtensionView { oldExpiresAt: string; newExpiresAt: string; at: string }
export interface ReservationView {
  id: number; code: string; status: string; direct: boolean; vehicleId: number; vehicleCode: string; vehicleType: string | null;
  batteryPercent: number; rangeKm: number; hubId: number; hubName: string; hubLat: number; hubLng: number;
  reservedAt: string; expiresAt: string; secondsLeft: number; extensionCount: number; maxExtensions: number;
  closeReason: string | null; closedAt: string | null; extensions: ExtensionView[]; tripCode: string | null; message: string | null;
}
export interface TripView {
  id: number; code: string; status: string; returnMode: string | null; vehicleId: number; vehicleCode: string; vehicleType: string | null; vehicleModel: string | null;
  startHubId: number; startHubName: string; endHubId: number | null; endHubName: string | null; endSlotCode: string | null;
  startedAt: string; endedAt: string | null; durationMinutes: number; distanceKm: number; startBattery: number; endBattery: number | null;
  currentBattery: number | null; cost: number | null; rated: boolean; reconciliationNote: string | null; offlineSecret: string | null;
}
export interface PickupResult { state: 'STARTED' | 'RECONCILING'; message: string; reservationId: number; trip: TripView | null }
export interface ReturnResult { state: 'COMPLETED' | 'PENDING_RECONCILIATION'; message: string; trip: TripView; nextVehicleStatus: string | null }
export interface ActiveState { reservation: ReservationView | null; trip: TripView | null }
export interface RatingResult { tripId: number; incidentCode: string | null; message: string }

export interface PersonalVehicleView { id: number; plateNumber: string; type: string; model: string | null; batteryKwh: number; connectorType: string; hasActiveBooking: boolean }
export interface SlotOption { id: number; code: string }
export interface PortOption { id: number; code: string; powerKw: number; connectorType: string }
export interface QuoteResult { hubName: string; serviceType: string; startAt: string; endAt: string; freeSlots: SlotOption[]; freePorts: PortOption[]; suggestedSlotId: number | null; suggestedPortId: number | null; estimatedCost: number; demandLevel: string; checkedAt: string }
export interface SessionView { id: number; status: string; startedAt: string | null; endedAt: string | null; energyKwh: number }
export interface BookingView {
  id: number; code: string; status: string; serviceType: 'PARK' | 'CHARGE' | 'BOTH'; hubId: number; hubName: string; slotId: number | null; slotCode: string | null;
  portId: number | null; portCode: string | null; portPowerKw: number | null; personalVehicleId: number; plateNumber: string; startAt: string; endAt: string;
  qrToken: string | null; checkedInAt: string | null; chargingStoppedAt: string | null; vehicleLeftAt: string | null; energyKwh: number | null;
  cost: number | null; estimatedCost: number; note: string | null; charging: SessionView | null; message: string | null;
}
export interface ExtendQuote { minutes: number; currentEndAt: string; newEndAt: string; available: boolean; reason: string | null; extraCost: number }

export interface NotificationView { id: number; type: string; title: string; body: string; createdAt: string; read: boolean }

export interface ReportResult { incidentId: number; code: string; duplicated: boolean; targetLabel: string; status: string; message: string }
export interface IncidentView {
  id: number; code: string; hubId: number; hubName: string; targetType: string; targetId: number; targetLabel: string; category: string;
  severity: string; source: string; description: string; photoUrls: string[]; status: string; followUps: number; reporterName: string;
  createdAt: string; followUpNotes: string[]; maintenanceOrders: string[];
}
export interface TicketView { id: number; targetType: string; targetId: number; targetLabel: string; progress: string; diagnosis: string | null; repairItems: string | null; replacedParts: string | null; verificationNote: string | null }
export interface MaintenanceOrderView { id: number; code: string; technicianName: string | null; technicianId: number | null; status: string; priority: string; dueAt: string | null; incidentCode: string | null; note: string | null; createdAt: string; tickets: TicketView[] }
export interface TechnicianView { id: number; fullName: string; openOrders: number }
export interface ProgressResult { ticket: TicketView; resourceStatus: string | null; verification: string | null; orderClosed: boolean }

export interface AlertView { id: number; type: string; hubId: number | null; hubName: string | null; resourceType: string | null; resourceId: number | null; severity: string; status: string; message: string; createdAt: string }
export interface HubRow { hub: HubSummary; occupancyPercent: number; portUsagePercent: number; loadLevel: 'LOW' | 'MEDIUM' | 'HIGH'; openAlerts: number; disconnected: boolean; vehiclesByStatus: Record<string, number> }
export interface Totals { activeHubs: number; totalHubs: number; disconnectedHubs: number; totalVehicles: number; availableVehicles: number; inUse: number; charging: number; pendingCheck: number; faulty: number; other: number; avgOccupancyPercent: number; hubsOverThreshold: number; portsInUse: number; portsTotal: number; portsFaulty: number }
export interface Overview { totals: Totals; hubs: HubRow[]; alerts: AlertView[]; servedAt: string; refreshSeconds: number }
export interface VehicleRow { id: number; code: string; type: string; model: string | null; batteryPercent: number; rangeKm: number; status: string; slotCode: string | null; lockState: string; lastSeenAt: string | null; errorCode: string | null; rating: number | null }
export interface SlotRow { id: number; code: string; kind: string; status: string; vehicleCode: string | null; bookingCode: string | null }
export interface PortRow { id: number; code: string; powerKw: number; connectorType: string; status: string; disableAfterSession: boolean; chargingWhat: string | null; errorCode: string | null }
export interface OpsHubDetail { hub: HubSummary; vehicles: VehicleRow[]; slots: SlotRow[]; ports: PortRow[]; alerts: AlertView[]; stale: boolean; lastSyncAt: string | null }
export interface ImpactReport { reassigned: number; cancelled: number; moved: number; needsReschedule: number; details: string[] }
export interface PortChangeResult { port: PortView; message: string; impact: ImpactReport }
export interface VehicleAdminView { id: number; code: string; type: string; model: string | null; hubId: number | null; hubName: string | null; slotCode: string | null; status: string; batteryPercent: number; batteryCapacityKwh: number; rangeKm: number; errorCode: string | null; rating: number | null; odometerKm: number }

export interface TransferCounts { total: number; locked: number; loaded: number; inTransit: number; delivered: number; failed: number; removed: number }
export interface TransferItemView { id: number; vehicleId: number; vehicleCode: string; batteryPercent: number; status: string; heldSlotCode: string | null; deliveredHubName: string | null; loadedAt: string | null; deliveredAt: string | null; note: string | null }
export interface TransferOrderView { id: number; code: string; sourceHubId: number; sourceHubName: string; targetHubId: number; targetHubName: string; driverId: number | null; driverName: string | null; status: string; counts: TransferCounts; createdAt: string; startedAt: string | null; completedAt: string | null; alertId: number | null; recommendationId: number | null; note: string | null; items: TransferItemView[]; message: string | null }
export interface CandidateView { id: number; code: string; type: string; batteryPercent: number; status: string }
export interface DriverView { id: number; userId: number; fullName: string; status: string; truckPlate: string | null; capacity: number }

export interface ChargingItemView { id: number; vehicleId: number; vehicleCode: string; batteryPercent: number; portId: number; portCode: string; powerKw: number; startAt: string; endAt: string; priority: number; targetBattery: number; status: string; sessionStatus: string | null; sessionStartedAt: string | null }
export interface UnmetView { vehicleId: number; code: string; battery: number; reason: string }
export interface ScheduleView { id: number; code: string; hubId: number; hubName: string; status: string; horizonStart: string; horizonEnd: string; confirmedAt: string | null; confirmedBy: string | null; items: ChargingItemView[]; unmet: UnmetView[]; vehiclesNeedingCharge: number; portsAvailable: number; message: string | null }
export interface AdjustCheck { ok: boolean; conflicts: string[]; warnings: string[] }

export type ScenarioType = 'DEMAND_SURGE' | 'INFRA_FAILURE' | 'REBALANCE' | 'CHARGING_CAPACITY';
export interface ScenarioView { id: number; name: string; description: string | null; type: ScenarioType; params: Record<string, unknown>; horizonMinutes: number; createdAt: string; summary: string }
export interface ScenarioSummary { valid: boolean; errors: string[]; summary: string }
export interface HubMetrics { hubId: number; name: string; requested: number; served: number; unmet: number; serviceRatePct: number; shortageVehicles: number; peakOccupancyPct: number; overloadRisk: boolean; redirected: number; minAvailable: number; endAvailable: number; endLowBattery: number }
export interface SeriesPoint { minute: number; occupancyPct: Record<string, number> }
export interface SimResult { serviceRatePct: number; requested: number; served: number; unmet: number; hubsAtRisk: number; totalShortage: number; hubs: HubMetrics[]; series: SeriesPoint[]; summary: string }
export interface RecommendationView { id: number; type: 'TRANSFER' | 'ADJUST_CHARGING'; payload: Record<string, unknown>; rationale: string; status: string; appliedRef: string | null; applyResult: string | null; appliedAt: string | null }
export interface RunView { id: number; code: string; scenarioId: number; scenarioName: string; scenarioType: ScenarioType; status: string; snapshotTakenAt: string; finishedAt: string | null; result: SimResult | null; error: string | null; recommendations: RecommendationView[] }
export interface RunListItem { id: number; code: string; scenarioName: string; status: string; snapshotTakenAt: string; serviceRatePct: number | null; shortage: number | null; recommendations: number; applied: number }
export interface HubDiff { hubId: number; hubName: string; snapshotAvailable: number; liveAvailable: number; snapshotFreeSlots: number; liveFreeSlots: number; snapshotWorkingPorts: number; liveWorkingPorts: number; significant: boolean }
export interface Feasibility { recommendationId: number; type: string; summary: string; feasible: boolean; reason: string }
export interface Preview { runId: number; runCode: string; snapshotTakenAt: string; liveAt: string; stale: boolean; staleWarning: string | null; diffs: HubDiff[]; items: Feasibility[]; previewToken: string; tokenExpiresAt: string }
export interface ApplyItemResult { recommendationId: number; status: string; appliedRef: string | null; message: string }
export interface ApplyResult { runId: number; results: ApplyItemResult[]; applied: number; failed: number }
export interface CommandRow { id: number; deviceType: string; deviceId: number; command: string; status: string; contextType: string; contextId: number; requestedAt: string; attempts: number; detail: string | null }
