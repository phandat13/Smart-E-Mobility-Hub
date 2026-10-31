package vn.edu.hcmut.emobility.rental;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.event.UserNotification;
import vn.edu.hcmut.emobility.core.event.VehicleAvailabilityChanged;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.vehicle.Vehicle;
import vn.edu.hcmut.emobility.vehicle.VehicleRepository;
import vn.edu.hcmut.emobility.vehicle.VehicleStatus;

@Service
public class ReservationService {

    private static final Set<ReservationStatus> ACTIVE =
            EnumSet.of(ReservationStatus.RESERVED, ReservationStatus.PICKED_UP);

    private final ReservationRepository reservations;
    private final VehicleRepository vehicles;
    private final AppProperties props;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public ReservationService(ReservationRepository reservations, VehicleRepository vehicles,
                              AppProperties props, Clock clock, ApplicationEventPublisher events) {
        this.reservations = reservations;
        this.vehicles = vehicles;
        this.props = props;
        this.clock = clock;
        this.events = events;
    }

    /** RE01: sinh viên giữ một xe trong {@code app.reservation.hold-minutes} phút. */
    @Transactional
    public Reservation reserve(Long studentId, Long vehicleId) {
        if (reservations.existsByStudentIdAndStatusIn(studentId, ACTIVE)) {
            throw new BusinessException(ErrorCode.ACTIVE_RESERVATION_EXISTS);
        }

        Vehicle vehicle = vehicles.findById(vehicleId)
                .orElseThrow(() -> BusinessException.notFound("Phương tiện", vehicleId));
        if (vehicle.getStatus().lockedByOperation()) {
            throw new BusinessException(ErrorCode.VEHICLE_HAS_OPERATION);
        }
        if (vehicle.getStatus() != VehicleStatus.AVAILABLE || vehicle.getHubId() == null) {
            throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE);
        }
        int minBattery = props.vehicle().minBatteryPercent();
        if (vehicle.getBatteryPercent() < minBattery) {
            throw new BusinessException(ErrorCode.LOW_BATTERY, ErrorCode.LOW_BATTERY.getMessage(),
                    Map.of("batteryPercent", vehicle.getBatteryPercent(), "minBatteryPercent", minBattery));
        }

        // Hai sinh viên cùng giữ một xe: @Version của Vehicle và unique index trên DB chặn người đến sau (409).
        vehicle.changeStatus(VehicleStatus.RESERVED);
        Reservation r = reservations.save(Reservation.hold(newCode(), studentId, vehicle,
                clock.instant(), props.reservation().holdDuration()));

        events.publishEvent(new VehicleAvailabilityChanged(vehicle.getHubId()));
        return r;
    }

    /** RE04: gia hạn thêm {@code app.reservation.extend-minutes} phút, tối đa {@code max-extensions} lần. */
    @Transactional
    public Reservation extend(Long studentId, Long reservationId) {
        Reservation r = reservations.findByIdForUpdate(reservationId)
                .filter(x -> x.getStudentId().equals(studentId))
                .orElseThrow(() -> BusinessException.notFound("Đơn đặt xe", reservationId));
        if (r.getStatus() != ReservationStatus.RESERVED) {
            throw new BusinessException(ErrorCode.RESERVATION_NOT_ACTIVE);
        }
        if (r.isExpiredAt(clock.instant())) {
            throw new BusinessException(ErrorCode.RESERVATION_EXPIRED);
        }
        AppProperties.Reservation rules = props.reservation();
        if (!rules.canExtend(r.getExtensionCount())) {
            throw new BusinessException(ErrorCode.MAX_EXTENSIONS_REACHED,
                    ErrorCode.MAX_EXTENSIONS_REACHED.getMessage(), Map.of("maxExtensions", rules.maxExtensions()));
        }

        r.extend(rules.extendDuration());
        return r;
    }

    @Transactional(readOnly = true)
    public Optional<Reservation> current(Long studentId) {
        return reservations.findFirstByStudentIdAndStatusInOrderByReservedAtDesc(studentId, ACTIVE);
    }

    @Transactional(readOnly = true)
    public List<Long> findExpiredIds() {
        return reservations.findIdsExpiredAt(ReservationStatus.RESERVED, clock.instant());
    }

    /** RE01: quá giờ giữ chỗ mà chưa lấy xe thì hủy đơn và trả xe về AVAILABLE. */
    @Transactional
    public void expire(Long reservationId) {
        Reservation r = reservations.findByIdForUpdate(reservationId).orElse(null);
        if (r == null || r.getStatus() != ReservationStatus.RESERVED || !r.isExpiredAt(clock.instant())) {
            return;
        }

        r.expire();
        vehicles.findById(r.getVehicleId())
                .filter(v -> v.getStatus() == VehicleStatus.RESERVED)
                .ifPresent(v -> v.changeStatus(VehicleStatus.AVAILABLE));

        events.publishEvent(new VehicleAvailabilityChanged(r.getHubId()));
        events.publishEvent(new UserNotification(r.getStudentId(), "RESERVATION_EXPIRED",
                "Đơn đặt xe đã hết hạn", "Đơn " + r.getCode() + " đã hết thời gian giữ chỗ.",
                Map.of("reservationId", r.getId())));
    }

    private static String newCode() {
        return "RS" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
