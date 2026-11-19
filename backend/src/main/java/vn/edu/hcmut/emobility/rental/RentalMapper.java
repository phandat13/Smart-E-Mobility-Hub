package vn.edu.hcmut.emobility.rental;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.hub.Hub;
import vn.edu.hcmut.emobility.hub.HubRepository;
import vn.edu.hcmut.emobility.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.rental.RentalDtos.*;

/** Chuyển entity → DTO (tra tên Hub, mã xe...). */
@Component
public class RentalMapper {

    private final VehicleRepository vehicles;
    private final HubRepository hubs;
    private final ParkingSlotRepository slots;
    private final ReservationExtensionRepository extensions;
    private final TripRepository trips;
    private final AppProperties props;
    private final Clock clock;

    public RentalMapper(VehicleRepository vehicles, HubRepository hubs, ParkingSlotRepository slots,
                        ReservationExtensionRepository extensions, TripRepository trips, AppProperties props, Clock clock) {
        this.vehicles = vehicles;
        this.hubs = hubs;
        this.slots = slots;
        this.extensions = extensions;
        this.trips = trips;
        this.props = props;
        this.clock = clock;
    }

    public ReservationView reservation(Reservation r, String message) {
        Vehicle v = vehicles.findById(r.getVehicleId()).orElse(null);
        Hub h = hubs.findById(r.getHubId()).orElse(null);
        Instant now = clock.instant();
        long left = r.getStatus() == ReservationStatus.RESERVED ? Math.max(0, Duration.between(now, r.getExpiresAt()).getSeconds()) : 0;
        List<ExtensionView> ext = extensions.findByReservationIdOrderById(r.getId()).stream()
                .map(e -> new ExtensionView(e.getOldExpiresAt(), e.getNewExpiresAt(), e.getCreatedAt())).toList();
        String tripCode = trips.findByReservationId(r.getId()).map(Trip::getCode).orElse(null);
        return new ReservationView(r.getId(), r.getCode(), r.getStatus(), r.isDirect(),
                r.getVehicleId(), v == null ? "?" : v.getCode(), v == null ? null : v.getType().name(),
                v == null ? 0 : v.getBatteryPercent(), v == null ? 0 : v.getRangeKm(),
                r.getHubId(), h == null ? "?" : h.getName(), h == null ? 0 : h.getLatitude(), h == null ? 0 : h.getLongitude(),
                r.getReservedAt(), r.getExpiresAt(), left, r.getExtensionCount(), props.reservation().maxExtensions(),
                r.getCloseReason(), r.getClosedAt(), ext, tripCode, message);
    }

    public TripView trip(Trip t, boolean includeSecret) {
        Vehicle v = vehicles.findById(t.getVehicleId()).orElse(null);
        Instant end = t.getEndedAt() != null ? t.getEndedAt() : clock.instant();
        String slotCode = t.getEndSlotId() == null ? null : slots.findById(t.getEndSlotId()).map(s -> s.getCode()).orElse(null);
        return new TripView(t.getId(), t.getCode(), t.getStatus(), t.getReturnMode(),
                t.getVehicleId(), v == null ? "?" : v.getCode(), v == null ? null : v.getType().name(), v == null ? null : v.getModel(),
                t.getStartHubId(), hubName(t.getStartHubId()), t.getEndHubId(), hubName(t.getEndHubId()), slotCode,
                t.getStartedAt(), t.getEndedAt(), Math.max(0, Duration.between(t.getStartedAt(), end).toMinutes()),
                Math.round(t.getDistanceKm() * 10) / 10.0, t.getStartBattery(), t.getEndBattery(),
                v == null ? null : v.getBatteryPercent(), t.getCost(), t.isRated(), t.getReconciliationNote(),
                includeSecret ? t.getOfflineSecret() : null);
    }

    public AlternativeView alternative(Vehicle v) {
        return new AlternativeView(v.getId(), v.getCode(), v.getType().name(), v.getBatteryPercent(), v.getRangeKm());
    }

    public String hubName(Long id) {
        return id == null ? null : hubs.findById(id).map(Hub::getName).orElse("?");
    }
}
