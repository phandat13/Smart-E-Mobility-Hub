package vn.edu.hcmut.emobility.account.service;

import java.time.Duration;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.account.dto.*;
import vn.edu.hcmut.emobility.account.entity.Rating;
import vn.edu.hcmut.emobility.account.repository.RatingRepository;
import vn.edu.hcmut.emobility.core.common.PageResponse;
import vn.edu.hcmut.emobility.core.event.IncidentReportRequested;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.hub.service.ResourceStateService;
import vn.edu.hcmut.emobility.hub.entity.Hub;
import vn.edu.hcmut.emobility.hub.entity.Vehicle;
import vn.edu.hcmut.emobility.hub.repository.HubRepository;
import vn.edu.hcmut.emobility.hub.repository.VehicleRepository;
import vn.edu.hcmut.emobility.rental.entity.Trip;
import vn.edu.hcmut.emobility.rental.entity.TripStatus;
import vn.edu.hcmut.emobility.rental.repository.TripRepository;

/** AC05 */
@Service
public class TripService {

    private static final int LOW_STARS = 2;

    private final TripRepository tripRepo;
    private final RatingRepository ratingRepo;
    private final VehicleRepository vehicleRepo;
    private final HubRepository hubRepo;
    private final ResourceStateService resourceState;
    private final ApplicationEventPublisher events;

    public TripService(TripRepository tripRepo, RatingRepository ratingRepo, VehicleRepository vehicleRepo,
                       HubRepository hubRepo, ResourceStateService resourceState, ApplicationEventPublisher events) {
        this.tripRepo = tripRepo;
        this.ratingRepo = ratingRepo;
        this.vehicleRepo = vehicleRepo;
        this.hubRepo = hubRepo;
        this.resourceState = resourceState;
        this.events = events;
    }

    /** AC05 */
    @Transactional(readOnly = true)
    public PageResponse<TripSummary> getTripHistory(Long studentId, Pageable pageable) {
        return PageResponse.of(tripRepo.findByStudentIdAndStatus(studentId, TripStatus.COMPLETED, pageable),
                TripSummary::of);
    }

    /** AC05 */
    @Transactional(readOnly = true)
    public TripDetail getTripDetail(Long studentId, Long tripId) {
        Trip t = ownedTrip(studentId, tripId);
        String vehicleCode = vehicleRepo.findById(t.getVehicleId()).map(Vehicle::getCode).orElse(null);
        String startHub = hubRepo.findById(t.getStartHubId()).map(Hub::getName).orElse(null);
        String endHub = t.getEndHubId() == null ? null : hubRepo.findById(t.getEndHubId()).map(Hub::getName).orElse(null);
        long minutes = t.getEndedAt() == null ? 0 : Duration.between(t.getStartedAt(), t.getEndedAt()).toMinutes();
        RatingResponse rating = ratingRepo.findByTripId(tripId).map(RatingResponse::of).orElse(null);
        return new TripDetail(t.getId(), t.getVehicleId(), vehicleCode, t.getStartHubId(), startHub,
                t.getEndHubId(), endHub, t.getStartedAt(), t.getEndedAt(), minutes, t.getDistanceKm(),
                t.getStartBattery(), t.getEndBattery(), t.getCost(), rating);
    }

    /** AC06 */
    @Transactional
    public RatingResponse rateTrip(Long studentId, Long tripId, RatingRequest req) {
        Trip trip = ownedTrip(studentId, tripId);
        if (ratingRepo.existsByTripId(tripId)) throw new BusinessException(ErrorCode.TRIP_ALREADY_RATED);
        trip.markRated();

        boolean lowScore = req.vehicleStars() <= LOW_STARS || req.hubStars() <= LOW_STARS;
        boolean incident = req.reportIncident() || req.safetyIssue() || lowScore;
        List<String> photos = req.photoUrls() == null ? List.of() : req.photoUrls();

        Rating rating = ratingRepo.save(new Rating(tripId, studentId, req.vehicleStars(), req.hubStars(),
                req.comment(), String.join("\n", photos), incident));

        if (incident) {
            String severity = req.safetyIssue() ? "CRITICAL" : (lowScore ? "MEDIUM" : "LOW");
            String category = req.incidentCategory() != null ? req.incidentCategory()
                    : (req.safetyIssue() ? "SAFETY" : "LOW_RATING");
            Long hubId = trip.getEndHubId() != null ? trip.getEndHubId() : trip.getStartHubId();
            events.publishEvent(new IncidentReportRequested(studentId, hubId, "VEHICLE", trip.getVehicleId(),
                    category, severity, req.comment(), photos));
            if (req.safetyIssue()) {
                resourceState.markVehicleFaulty(trip.getVehicleId());
            }
        }
        return RatingResponse.of(rating);
    }

    private Trip ownedTrip(Long studentId, Long tripId) {
        return tripRepo.findByIdAndStudentId(tripId, studentId)
                .orElseThrow(() -> BusinessException.notFound("Chuyến đi", tripId));
    }
}
