package vn.edu.hcmut.emobility.simulation;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "recommendation")
public class Recommendation extends VersionedEntity {
    @Column(name = "run_id", nullable = false) private Long runId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RecommendationType type;
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String payload;
    private String rationale;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RecommendationStatus status;
    @Column(name = "applied_ref") private String appliedRef;
    @Column(name = "apply_result") private String applyResult;
    @Column(name = "applied_by") private Long appliedBy;
    @Column(name = "applied_at") private Instant appliedAt;

    protected Recommendation() {}

    public Recommendation(Long runId, RecommendationType type, String payload, String rationale) {
        this.runId = runId;
        this.type = type;
        this.payload = payload;
        this.rationale = rationale;
        this.status = RecommendationStatus.PROPOSED;
    }

    public Long getRunId() { return runId; }
    public RecommendationType getType() { return type; }
    public String getPayload() { return payload; }
    public String getRationale() { return rationale; }
    public RecommendationStatus getStatus() { return status; }
    public String getAppliedRef() { return appliedRef; }
    public String getApplyResult() { return applyResult; }
    public Long getAppliedBy() { return appliedBy; }
    public Instant getAppliedAt() { return appliedAt; }

    public void applied(String ref, String result, Long by, Instant at) {
        this.status = RecommendationStatus.APPLIED;
        this.appliedRef = ref;
        this.applyResult = result;
        this.appliedBy = by;
        this.appliedAt = at;
    }

    public void failed(String result, Long by, Instant at) {
        this.status = RecommendationStatus.FAILED;
        this.applyResult = result;
        this.appliedBy = by;
        this.appliedAt = at;
    }
}
