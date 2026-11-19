package vn.edu.hcmut.emobility.rental;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.common.JsonSupport;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.maintenance.IncidentService;
import vn.edu.hcmut.emobility.maintenance.IncidentSource;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.ReportRequest;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.ReportResult;
import vn.edu.hcmut.emobility.maintenance.TargetType;
import vn.edu.hcmut.emobility.rental.RentalDtos.RatingRequest;
import vn.edu.hcmut.emobility.rental.RentalDtos.RatingResult;

/** AC06: đánh giá chuyến đi; ≤ 2 sao hoặc có báo sự cố → tạo ticket cho Đơn vị vận hành. */
@Service
public class RatingService {

    private final TripRepository trips;
    private final RatingRepository ratings;
    private final VehicleRepository vehicles;
    private final IncidentService incidents;
    private final JsonSupport json;

    public RatingService(TripRepository trips, RatingRepository ratings, VehicleRepository vehicles, IncidentService incidents, JsonSupport json) {
        this.trips = trips;
        this.ratings = ratings;
        this.vehicles = vehicles;
        this.incidents = incidents;
        this.json = json;
    }

    @Transactional
    public RatingResult rate(Long studentId, Long tripId, RatingRequest r) {
        Trip t = trips.lockById(tripId).filter(x -> x.getStudentId().equals(studentId))
                .orElseThrow(() -> BusinessException.notFound("Chuyến đi", tripId));
        if (t.getStatus() != TripStatus.COMPLETED) throw new BusinessException(ErrorCode.INVALID_STATE, "Chỉ đánh giá được chuyến đi đã hoàn thành");
        if (t.isRated() || ratings.findByTripId(tripId).isPresent()) throw new BusinessException(ErrorCode.TRIP_ALREADY_RATED);
        List<String> photos = r.photoUrls() == null ? List.of() : r.photoUrls();
        ratings.saveAndFlush(new Rating(tripId, r.vehicleStars(), r.hubStars(), r.comment(), r.reportIssue() ? r.issueType() : null,
                photos.isEmpty() ? null : json.write(photos)));
        Vehicle v = vehicles.lockById(t.getVehicleId()).orElseThrow();
        v.addRating(r.vehicleStars());
        t.markRated();
        String incident = null;
        if (r.reportIssue() || r.vehicleStars() <= 2 || r.hubStars() <= 2) {
            String category = r.reportIssue() && r.issueType() != null ? r.issueType() : "Đánh giá thấp";
            String desc = (r.comment() == null || r.comment().isBlank()) ? "Đánh giá " + r.vehicleStars() + "★ xe / " + r.hubStars() + "★ Hub" : r.comment();
            ReportResult rr = incidents.report(studentId, new ReportRequest(t.getEndHubId(), TargetType.VEHICLE, v.getId(), null,
                    category, desc, photos, tripId, r.safetyCritical()), IncidentSource.RATING);
            incident = rr.code();
        }
        return new RatingResult(tripId, incident, incident == null ? "Cảm ơn bạn đã đánh giá!"
                : "Cảm ơn bạn! Ticket hỗ trợ " + incident + " đã được gửi tới Đơn vị vận hành" + (r.safetyCritical() ? " với mức ưu tiên cao nhất" : ""));
    }
}
