package vn.edu.hcmut.emobility.maintenance;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MaintenanceDtos {
    private MaintenanceDtos() {}

    /** MT01 */
    public record ReportRequest(@NotNull Long hubId, @NotNull TargetType targetType, Long targetId, @Size(max = 20) String targetCode,
                                @NotBlank @Size(max = 50) String category, @NotBlank @Size(max = 1000) String description,
                                @Size(max = 3) List<String> photoUrls, Long tripId, Boolean safetyCritical) {}

    public record ReportResult(Long incidentId, String code, boolean duplicated, String targetLabel, String status, String message) {}

    public record IncidentView(Long id, String code, Long hubId, String hubName, TargetType targetType, Long targetId, String targetLabel,
                               String category, Severity severity, IncidentSource source, String description, List<String> photoUrls,
                               IncidentStatus status, int followUps, String reporterName, Instant createdAt, List<String> followUpNotes,
                               List<String> maintenanceOrders) {}

    /** MT02: phân công kỹ thuật viên cho phiếu sự cố; MT03: tạo lệnh bảo trì cho danh sách xe. */
    public record AssignRequest(@NotNull Long technicianId, Severity priority, Instant dueAt, @Size(max = 500) String note) {}

    public record MaintenanceOrderRequest(@NotEmpty List<Long> vehicleIds, @NotNull Long technicianId, Severity priority,
                                          Instant dueAt, Long alertId, @Size(max = 500) String note) {}

    public record TicketView(Long id, TargetType targetType, Long targetId, String targetLabel, TicketProgress progress,
                             String diagnosis, String repairItems, String replacedParts, String verificationNote) {}

    public record OrderView(Long id, String code, String technicianName, Long technicianId, MaintenanceOrderStatus status,
                            Severity priority, Instant dueAt, String incidentCode, String note, Instant createdAt, List<TicketView> tickets) {}

    /** MT04 */
    public record TicketFillRequest(@NotBlank @Size(max = 1000) String diagnosis, @Size(max = 1000) String repairItems,
                                    @Size(max = 1000) String replacedParts) {}

    /** MT05 */
    public record ProgressRequest(@NotNull TicketProgress progress, @Size(max = 500) String note) {}

    public record ProgressResult(TicketView ticket, String resourceStatus, String verification, boolean orderClosed) {}

    public record TechnicianView(Long id, String fullName, long openOrders) {}

    public record ImpactReport(int reassigned, int cancelled, int moved, int needsReschedule, List<String> details) {
        public static ImpactReport empty() { return new ImpactReport(0, 0, 0, 0, List.of()); }
    }
}
