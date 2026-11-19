package vn.edu.hcmut.emobility.rental;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "rating")
public class Rating extends BaseEntity {
    @Column(name = "trip_id", nullable = false, unique = true) private Long tripId;
    @Column(name = "vehicle_stars", nullable = false) private short vehicleStars;
    @Column(name = "hub_stars", nullable = false) private short hubStars;
    private String comment;
    @Column(name = "issue_type") private String issueType;
    @Column(name = "photo_urls", columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String photoUrls;

    protected Rating() {}

    public Rating(Long tripId, int vehicleStars, int hubStars, String comment, String issueType, String photoUrls) {
        this.tripId = tripId;
        this.vehicleStars = (short) vehicleStars;
        this.hubStars = (short) hubStars;
        this.comment = comment;
        this.issueType = issueType;
        this.photoUrls = photoUrls;
    }

    public Long getTripId() { return tripId; }
    public int getVehicleStars() { return vehicleStars; }
    public int getHubStars() { return hubStars; }
    public String getComment() { return comment; }
    public String getIssueType() { return issueType; }
}
