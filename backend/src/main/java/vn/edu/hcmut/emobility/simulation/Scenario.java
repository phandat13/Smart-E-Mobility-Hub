package vn.edu.hcmut.emobility.simulation;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "scenario")
public class Scenario extends BaseEntity {
    @Column(nullable = false, unique = true) private String name;
    private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ScenarioType type;
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String params;
    @Column(name = "horizon_minutes", nullable = false) private int horizonMinutes;
    @Column(name = "created_by") private Long createdBy;

    protected Scenario() {}

    public Scenario(String name, String description, ScenarioType type, String params, int horizonMinutes, Long createdBy) {
        this.createdBy = createdBy;
        update(name, description, type, params, horizonMinutes);
    }

    public String getName() { return name; }
    public String getDescription() { return description; }
    public ScenarioType getType() { return type; }
    public String getParams() { return params; }
    public int getHorizonMinutes() { return horizonMinutes; }
    public Long getCreatedBy() { return createdBy; }

    public void update(String name, String description, ScenarioType type, String params, int horizonMinutes) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.params = params;
        this.horizonMinutes = horizonMinutes;
    }
}
