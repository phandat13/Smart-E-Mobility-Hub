package vn.edu.hcmut.emobility.simulation;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class SimulationDtos {
    private SimulationDtos() {}

    /** SI01/SI02: cấu hình kịch bản. params tùy loại: hubIds, demandIncreasePct, startHour, failedPortPct, failedVehicleCount, transfers, extraPorts. */
    public record ScenarioRequest(@NotBlank @Size(max = 100) String name, @Size(max = 500) String description,
                                  @NotNull ScenarioType type, @NotNull Map<String, Object> params,
                                  @NotNull @Min(15) @Max(1440) Integer horizonMinutes, boolean overwrite) {}

    public record ScenarioSummary(boolean valid, List<String> errors, String summary, SimModel.Params normalized) {}

    public record ScenarioView(Long id, String name, String description, ScenarioType type, Map<String, Object> params,
                               int horizonMinutes, Instant createdAt, String summary) {}

    public record RunRequest(Long scenarioId, ScenarioRequest inline) {}

    public record RecommendationView(Long id, RecommendationType type, Map<String, Object> payload, String rationale,
                                     RecommendationStatus status, String appliedRef, String applyResult, Instant appliedAt) {}

    public record RunView(Long id, String code, Long scenarioId, String scenarioName, ScenarioType scenarioType, RunStatus status,
                          Instant snapshotTakenAt, Instant finishedAt, SimModel.Result result, String error,
                          List<RecommendationView> recommendations, SimModel.Snapshot snapshot) {}

    public record RunListItem(Long id, String code, String scenarioName, RunStatus status, Instant snapshotTakenAt, Integer serviceRatePct,
                              Integer shortage, int recommendations, int applied) {}

    // ----- SI05
    public record PreviewRequest(@NotEmpty List<Long> recommendationIds) {}

    public record HubDiff(Long hubId, String hubName, int snapshotAvailable, int liveAvailable, int snapshotFreeSlots, int liveFreeSlots,
                          int snapshotWorkingPorts, int liveWorkingPorts, boolean significant) {}

    public record Feasibility(Long recommendationId, RecommendationType type, String summary, boolean feasible, String reason) {}

    public record Preview(Long runId, String runCode, Instant snapshotTakenAt, Instant liveAt, boolean stale, String staleWarning,
                          List<HubDiff> diffs, List<Feasibility> items, String previewToken, Instant tokenExpiresAt) {}

    public record ApplyRequest(@NotEmpty List<Long> recommendationIds, @NotBlank String previewToken) {}

    public record ApplyItemResult(Long recommendationId, RecommendationStatus status, String appliedRef, String message) {}

    public record ApplyResult(Long runId, List<ApplyItemResult> results, int applied, int failed) {}
}
