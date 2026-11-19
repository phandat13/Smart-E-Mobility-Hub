package vn.edu.hcmut.emobility.simulation;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "simulation_run")
public class SimulationRun extends BaseEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "scenario_id", nullable = false) private Long scenarioId;
    @Column(name = "snapshot_taken_at", nullable = false) private Instant snapshotTakenAt;
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String snapshot;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RunStatus status;
    @Column(columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String metrics;
    private String error;
    @Column(name = "created_by") private Long createdBy;
    @Column(name = "finished_at") private Instant finishedAt;

    protected SimulationRun() {}

    public SimulationRun(String code, Long scenarioId, Instant snapshotTakenAt, String snapshot, Long createdBy) {
        this.code = code;
        this.scenarioId = scenarioId;
        this.snapshotTakenAt = snapshotTakenAt;
        this.snapshot = snapshot;
        this.createdBy = createdBy;
        this.status = RunStatus.RUNNING;
    }

    public String getCode() { return code; }
    public Long getScenarioId() { return scenarioId; }
    public Instant getSnapshotTakenAt() { return snapshotTakenAt; }
    public String getSnapshot() { return snapshot; }
    public RunStatus getStatus() { return status; }
    public String getMetrics() { return metrics; }
    public String getError() { return error; }
    public Long getCreatedBy() { return createdBy; }
    public Instant getFinishedAt() { return finishedAt; }

    public void completed(String metrics, Instant at) { this.metrics = metrics; this.status = RunStatus.COMPLETED; this.finishedAt = at; }
    public void failed(String error, Instant at) { this.error = error; this.status = RunStatus.FAILED; this.finishedAt = at; }
}
