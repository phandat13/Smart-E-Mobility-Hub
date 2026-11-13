package vn.edu.hcmut.emobility.module.rental;

import java.time.Clock;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.event.UserNotification;
import vn.edu.hcmut.emobility.core.event.VehicleAvailabilityChanged;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.module.hub.Vehicle;
import vn.edu.hcmut.emobility.module.hub.VehicleRepository;

@Service
public class RentalService {

    private static final Logger log = LoggerFactory.getLogger(RentalService.class);

    private final ReservationRepository reservations;
    private final VehicleRepository vehicles;
    private final AppProperties props;
    private final Clock clock;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;

    public RentalService(ReservationRepository reservations, VehicleRepository vehicles, AppProperties props,
                         Clock clock, ApplicationEventPublisher events, PlatformTransactionManager txManager) {
        this.reservations = reservations;
        this.vehicles = vehicles;
        this.props = props;
        this.clock = clock;
        this.events = events;
        this.tx = new TransactionTemplate(txManager);
    }

    /** RE01: sinh viên giữ một xe trong {@code app.reservation.hold-minutes} phút. */
    @Transactional
    public Reservation reserve(Long studentId, Long vehicleId) {
        if (reservations.existsByStudentIdAndStatusIn(studentId, Reservation.Status.ACTIVE)) {
            throw new BusinessException(ErrorCode.ACTIVE_RESERVATION_EXISTS);
        }

        Vehicle vehicle = vehicles.findById(vehicleId)
                .orElseThrow(() -> BusinessException.notFound("Phương tiện", vehicleId));
        if (vehicle.getStatus().lockedByOperation()) {
            throw new BusinessException(ErrorCode.VEHICLE_HAS_OPERATION);
        }
        if (vehicle.getStatus() != Vehicle.Status.AVAILABLE || vehicle.getHubId() == null) {
            throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE);
        }
        int minBattery = props.vehicle().minBatteryPercent();
        if (vehicle.getBatteryPercent() < minBattery) {
            throw new BusinessException(ErrorCode.LOW_BATTERY, ErrorCode.LOW_BATTERY.getMessage(),
                    Map.of("batteryPercent", vehicle.getBatteryPercent(), "minBatteryPercent", minBattery));
        }

        // Hai sinh viên cùng giữ một xe: @Version của Vehicle và unique index trên DB chặn người đến sau (409).
        vehicle.changeStatus(Vehicle.Status.RESERVED);
        Reservation r = reservations.save(Reservation.hold(studentId, vehicle, clock.instant(),
                props.reservation().holdDuration()));

        events.publishEvent(new VehicleAvailabilityChanged(vehicle.getHubId()));
        return r;
    }

    /** RE04: gia hạn thêm {@code app.reservation.extend-minutes} phút, tối đa {@code max-extensions} lần. */
    @Transactional
    public Reservation extend(Long studentId, Long reservationId) {
        Reservation r = reservations.findByIdForUpdate(reservationId)
                .filter(x -> x.getStudentId().equals(studentId))
                .orElseThrow(() -> BusinessException.notFound("Đơn đặt xe", reservationId));
        if (r.getStatus() != Reservation.Status.RESERVED) {
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
        return reservations.findFirstByStudentIdAndStatusInOrderByReservedAtDesc(studentId, Reservation.Status.ACTIVE);
    }

    // ===================== Job chạy nền =====================

    /** Mỗi đơn chạy trong transaction riêng: một đơn lỗi không kéo các đơn khác rollback theo, lượt sau thử lại. */
    @Scheduled(fixedDelay = 30, timeUnit = TimeUnit.SECONDS)
    public void expireOverdue() {
        for (Long id : reservations.findIdsExpiredAt(Reservation.Status.RESERVED, clock.instant())) {
            try {
                tx.executeWithoutResult(t -> expire(id));
            } catch (RuntimeException ex) {
                log.warn("Không hết hạn được đơn {}: {}", id, ex.getMessage());
            }
        }
    }

    /** RE01: quá giờ giữ chỗ mà chưa lấy xe thì hủy đơn và trả xe về phục vụ. */
    private void expire(Long reservationId) {
        Reservation r = reservations.findByIdForUpdate(reservationId).orElse(null);
        if (r == null || r.getStatus() != Reservation.Status.RESERVED || !r.isExpiredAt(clock.instant())) {
            return;
        }

        r.expire();
        int minBattery = props.vehicle().minBatteryPercent();
        vehicles.findById(r.getVehicleId())
                .filter(v -> v.getStatus() == Vehicle.Status.RESERVED)
                .ifPresent(v -> v.release(minBattery));

        events.publishEvent(new VehicleAvailabilityChanged(r.getHubId()));
        events.publishEvent(new UserNotification(r.getStudentId(), "RESERVATION_EXPIRED",
                "Đơn đặt xe đã hết hạn", "Đơn " + r.getCode() + " đã hết thời gian giữ chỗ.",
                Map.of("reservationId", r.getId())));
    }
}
