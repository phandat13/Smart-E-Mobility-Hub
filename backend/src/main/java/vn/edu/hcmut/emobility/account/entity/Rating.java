package vn.edu.hcmut.emobility.account.entity;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "rating")
public class Rating extends BaseEntity {
    @Column(name = "trip_id", nullable = false, unique = true)
    private Long tripId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "vehicle_stars", nullable = false)
    private Integer vehicleStars;

    @Column(name = "hub_stars", nullable = false)
    private Integer hubStars;

    @Column(columnDefinition = "text")
    private String comment;

    @Column(name = "photo_urls", columnDefinition = "text")
    private String photoUrls;

    @Column(name = "incident_reported", nullable = false)
    private boolean incidentReported;

    protected Rating() {}

    public Rating(Long tripId, Long studentId, int vehicleStars, int hubStars, String comment, String photoUrls, boolean incidentReported) {
        this.tripId = tripId;
        this.studentId = studentId;
        this.vehicleStars = vehicleStars;
        this.hubStars = hubStars;
        this.comment = comment;
        this.photoUrls = photoUrls;
        this.incidentReported = incidentReported;
    }

    public Long getTripId() { return tripId; }
    public Long getStudentId() { return studentId; }
    public Integer getVehicleStars() { return vehicleStars; }
    public Integer getHubStars() { return hubStars; }
    public String getComment() { return comment; }
    public String getPhotoUrls() { return photoUrls; }
    public boolean isIncidentReported() { return incidentReported; }
}