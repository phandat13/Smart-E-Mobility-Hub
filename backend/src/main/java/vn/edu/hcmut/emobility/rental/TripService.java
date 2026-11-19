package vn.edu.hcmut.emobility.rental;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.charging.SessionStatus;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.crypto.OfflineOtp;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.iot.*;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.core.payment.PaymentSimulator;
import vn.edu.hcmut.emobility.fleet.*;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.maintenance.IncidentRepository;
import vn.edu.hcmut.emobility.maintenance.IncidentService;
import vn.edu.hcmut.emobility.maintenance.IncidentStatus;
import vn.edu.hcmut.emobility.maintenance.Severity;
import vn.edu.hcmut.emobility.maintenance.TargetType;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;
import vn.edu.hcmut.emobility.rental.RentalDtos.*;

/**
 * RE05 nhận xe, RE06 trả xe (online + offline OTP), AC05 lịch sử chuyến đi, đối soát thiết bị.
 * Mỗi luồng có gọi thiết bị gồm: Tx1 giữ tài nguyên → gửi lệnh (ngoài giao dịch) → Tx2 commit theo kết quả.
 * Kết quả UNKNOWN không bao giờ đưa xe về AVAILABLE (góp ý #5); trả xe chỉ COMPLETED khi có bằng chứng vật lý (góp ý #6).
 */
@Service
public class TripService {

    private static final Logger log = LoggerFactory.getLogger(TripService.class);
    private static final Set<TripStatus> CURRENT = Set.of(TripStatus.IN_PROGRESS, TripStatus.RETURNING, TripStatus.PENDING_RECONCILIATION);
    private static final Set<SessionStatus> LIVE_SESSION = Set.of(SessionStatus.ACTIVE, SessionStatus.STARTING);
    public static final String CTX_PICKUP = "RESERVATION";
    public static final String CTX_RETURN = "TRIP";

    private final TripRepository trips;
    private final ReservationRepository reservations;
    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final HubRepository hubs;
    private final IncidentRepository incidentRepo;
    private final IncidentService incidents;
    private final ChargingSessionRepository sessions;
    private final DeviceCommandService commands;
    private final IotGateway gateway;
    private final PaymentSimulator payment;
    private final ResourceVerifier verifier;
    private final RentalMapper mapper;
    private final AlertService alerts;
    private final NotificationService notifications;
    private final FleetEvents events;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public TripService(TripRepository trips, ReservationRepository reservations, VehicleRepository vehicles, ParkingSlotRepository slots,
                       HubRepository hubs, IncidentRepository incidentRepo, IncidentService incidents, ChargingSessionRepository sessions,
                       DeviceCommandService commands, IotGateway gateway, PaymentSimulator payment, ResourceVerifier verifier,
                       RentalMapper mapper, AlertService alerts, NotificationService notifications, FleetEvents events, AuditService audit,
                       TxRunner tx, AppProperties props, Clock clock) {
        this.trips = trips;
        this.reservations = reservations;
        this.vehicles = vehicles;
        this.slots = slots;
        this.hubs = hubs;
        this.incidentRepo = incidentRepo;
        this.incidents = incidents;
        this.sessions = sessions;
        this.commands = commands;
        this.gateway = gateway;
        this.payment = payment;
        this.verifier = verifier;
        this.mapper = mapper;
        this.alerts = alerts;
        this.notifications = notifications;
        this.events = events;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    // =================================================================== RE05 – Nhận xe
    public PickupResult pickup(Long studentId, PickupRequest req) {
        record Prep(Long reservationId, Long vehicleId) {}
        Prep p = tx.inNewTx(() -> {
            Long vehicleId = vehicles.findIdByCode(req.vehicleCode().trim().toUpperCase())
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy xe " + req.vehicleCode()));
            Instant now = clock.instant();
            if (req.reservationId() != null) {
                Reservation r = reservations.lockById(req.reservationId()).filter(x -> x.getStudentId().equals(studentId))
                        .orElseThrow(() -> BusinessException.notFound("Đơn đặt xe", req.reservationId()));
                if (r.getStatus() == ReservationStatus.EXPIRED || (r.getStatus() == ReservationStatus.RESERVED && !r.getExpiresAt().isAfter(now))) {
                    throw new BusinessException(ErrorCode.RESERVATION_EXPIRED);
                }
                if (r.getStatus() != ReservationStatus.RESERVED) throw new BusinessException(ErrorCode.RESERVATION_NOT_ACTIVE);
                if (!r.getVehicleId().equals(vehicleId)) {
                    throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE, "Mã QR không khớp với xe trong đơn đặt " + r.getCode());
                }
                Vehicle v = vehicles.lockById(vehicleId).orElseThrow();
                checkSensorState(v, r.getHubId());
                if (v.getStatus() != VehicleStatus.RESERVED) throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE);
                v.setStatus(VehicleStatus.PICKUP_PENDING);
                r.setStatus(ReservationStatus.PICKUP_PENDING);
                return new Prep(r.getId(), v.getId());
            }
            // Thuê trực tiếp: kiểm tra lần cuối "Sẵn sàng" và giữ xe trong cùng một câu lệnh (E3)
            if (reservations.existsByStudentIdAndStatusIn(studentId, ReservationService.OPEN)
                    || trips.existsByStudentIdAndStatusIn(studentId, ReservationService.ACTIVE_TRIP)) {
                throw new BusinessException(ErrorCode.ACTIVE_RESERVATION_EXISTS);
            }
            int held = vehicles.casFromAvailable(vehicleId, (short) props.vehicle().minBatteryPercent(), VehicleStatus.PICKUP_PENDING, now);
            if (held == 0) throw unavailable(vehicleId);
            Vehicle v = vehicles.findById(vehicleId).orElseThrow();
            checkSensorState(v, v.getHubId());
            Reservation r = reservations.saveAndFlush(new Reservation(Codes.next("TT", now), studentId, vehicleId, v.getHubId(),
                    ReservationStatus.PICKUP_PENDING, now, now.plusSeconds(props.reservation().holdMinutes() * 60L), true));
            events.hubChanged(v.getHubId());
            return new Prep(r.getId(), vehicleId);
        });

        DeviceCommandService.Result res = commands.execute(DeviceType.VEHICLE, p.vehicleId(), CommandType.UNLOCK, CTX_PICKUP, p.reservationId());
        switch (res.outcome()) {
            case SUCCESS -> {
                Trip t = tx.inNewTx(() -> startTrip(p.reservationId(), clock.instant()));
                return new PickupResult(PickupState.STARTED, "Mở khóa thành công – bắt đầu chuyến đi", p.reservationId(), tx.inNewTx(() -> mapper.trip(t, true)));
            }
            case FAILED -> {
                List<AlternativeView> alts = tx.inNewTx(() -> failPickup(p.reservationId()));
                throw new BusinessException(ErrorCode.IOT_COMMAND_FAILED,
                        "Thiết bị mở khóa báo thất bại. Không tạo chuyến đi; xe đã được báo lỗi, vui lòng đổi xe khác",
                        Map.of("alternatives", alts));
            }
            default -> {
                tx.runInNewTx(() -> markUnlockReconciling(p.reservationId()));
                return new PickupResult(PickupState.RECONCILING,
                        "Chưa xác định được kết quả mở khóa. Hệ thống đang xác minh lại thiết bị – vui lòng chờ, KHÔNG dắt xe đi",
                        p.reservationId(), null);
            }
        }
    }

    /** RE05 bước 3: đối chiếu dữ liệu cảm biến mới nhất (vị trí, pin, sự cố đang mở). */
    private void checkSensorState(Vehicle v, Long expectedHub) {
        Instant now = clock.instant();
        if (v.getLastSeenAt() == null || Duration.between(v.getLastSeenAt(), now).getSeconds() > 2L * props.iot().telemetryIntervalSeconds()) {
            throw new BusinessException(ErrorCode.DEVICE_DATA_STALE);
        }
        if (expectedHub == null || !expectedHub.equals(v.getHubId())) {
            throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE, "Vị trí xe không khớp với Hub");
        }
        if (v.getBatteryPercent() < props.vehicle().minBatteryPercent()) {
            List<AlternativeView> alts = vehicles.alternatives(v.getHubId(), (short) props.vehicle().minBatteryPercent(), v.getId(), PageRequest.of(0, 3))
                    .stream().map(mapper::alternative).toList();
            throw new BusinessException(ErrorCode.LOW_BATTERY, "Xe không đạt ngưỡng pin đề xuất (" + v.getBatteryPercent() + "%)", Map.of("alternatives", alts));
        }
        if (v.getErrorCode() != null || incidentRepo.existsByTargetTypeAndTargetIdAndStatusIn(TargetType.VEHICLE, v.getId(), Set.of(IncidentStatus.OPEN, IncidentStatus.ASSIGNED))) {
            throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE, "Xe đang có sự cố mở");
        }
    }

    private BusinessException unavailable(Long vehicleId) {
        Vehicle v = vehicles.findById(vehicleId).orElse(null);
        List<AlternativeView> alts = v == null ? List.of() : vehicles.alternatives(v.getHubId(), (short) props.vehicle().minBatteryPercent(), vehicleId, PageRequest.of(0, 3))
                .stream().map(mapper::alternative).toList();
        boolean lowBattery = v != null && v.getStatus() == VehicleStatus.AVAILABLE && v.getBatteryPercent() < props.vehicle().minBatteryPercent();
        ErrorCode c = lowBattery ? ErrorCode.LOW_BATTERY : ErrorCode.VEHICLE_UNAVAILABLE;
        return new BusinessException(c, c.getMessage(), Map.of("alternatives", alts));
    }

    /** Commit khi thiết bị xác nhận mở khóa (hoặc đối soát xác nhận). Idempotent. */
    private Trip startTrip(Long reservationId, Instant startedAt) {
        Reservation r = reservations.lockById(reservationId).orElseThrow();
        Optional<Trip> existing = trips.findByReservationId(reservationId);
        if (existing.isPresent()) return existing.get();
        Vehicle v = vehicles.lockById(r.getVehicleId()).orElseThrow();
        v.setStatus(VehicleStatus.IN_USE);
        v.setLockState(LockState.UNLOCKED);
        r.setStatus(ReservationStatus.PICKED_UP);
        slots.lockByVehicleId(v.getId()).ifPresent(ParkingSlot::vacate);
        Trip t = trips.saveAndFlush(new Trip(Codes.next("TR", startedAt), r.getId(), r.getStudentId(), v.getId(), r.getHubId(),
                startedAt, v.getBatteryPercent(), Codes.hexSecret(16)));
        alerts.resolveIfOpen(AlertType.RECONCILIATION, r.getHubId(), "VEHICLE", v.getId());
        events.hubChanged(r.getHubId());
        audit.record(r.getStudentId(), "TRIP_START", "TRIP", t.getId(), Map.of("vehicle", v.getCode()));
        notifications.notify(r.getStudentId(), "TRIP_STARTED", "Bắt đầu chuyến đi", "Xe " + v.getCode() + " đã mở khóa. Chúc bạn thượng lộ bình an!");
        return t;
    }

    /** E2: thiết bị phản hồi thất bại → không tạo chuyến, xe "Báo lỗi", tạo sự cố cho Đơn vị vận hành. */
    private List<AlternativeView> failPickup(Long reservationId) {
        Reservation r = reservations.lockById(reservationId).orElseThrow();
        r.close(ReservationStatus.CANCELLED, "DEVICE_FAILED", clock.instant());
        Vehicle v = vehicles.lockById(r.getVehicleId()).orElseThrow();
        v.setStatus(VehicleStatus.FAULTY);
        v.setErrorCode("UNLOCK_FAILED");
        incidents.createSystem(r.getHubId(), TargetType.VEHICLE, v.getId(), "Không mở được khóa",
                "Thiết bị khóa xe " + v.getCode() + " phản hồi thất bại khi sinh viên nhận xe", Severity.HIGH);
        events.hubChanged(r.getHubId());
        notifications.notify(r.getStudentId(), "PICKUP_FAILED", "Không mở được khóa xe", "Xe " + v.getCode() + " gặp lỗi thiết bị. Vui lòng chọn xe khác.");
        return vehicles.alternatives(v.getHubId(), (short) props.vehicle().minBatteryPercent(), v.getId(), PageRequest.of(0, 3))
                .stream().map(mapper::alternative).toList();
    }

    /** Góp ý #5: kết quả mở khóa không xác định → giữ trạng thái chờ đối soát, KHÔNG về Available. */
    private void markUnlockReconciling(Long reservationId) {
        Reservation r = reservations.lockById(reservationId).orElseThrow();
        Vehicle v = vehicles.lockById(r.getVehicleId()).orElseThrow();
        v.setStatus(VehicleStatus.UNLOCK_RECONCILING);
        v.setLockState(LockState.UNKNOWN);
        alerts.raise(AlertType.RECONCILIATION, r.getHubId(), "VEHICLE", v.getId(), AlertSeverity.WARNING,
                "Không xác định kết quả mở khóa xe " + v.getCode() + " (đơn " + r.getCode() + ") – đang đối soát thiết bị");
        events.hubChanged(r.getHubId());
    }

    // =================================================================== RE06 – Trả xe online
    public ReturnResult returnVehicle(Long studentId, Long tripId) {
        record Prep(Long slotId, Long hubId, Long vehicleId, boolean already) {}
        Prep p = tx.inNewTx(() -> {
            Trip t = owned(studentId, trips.lockById(tripId));
            if (t.getStatus() != TripStatus.IN_PROGRESS) return new Prep(null, null, t.getVehicleId(), true);
            // Bước 2: thiết bị tại Hub phải xác nhận xe nằm trong ô hợp lệ (cảm biến ô đỗ)
            ParkingSlot slot = slots.findByVehicleId(t.getVehicleId())
                    .filter(s -> s.getKind() == SlotKind.SHARED && s.getStatus() == SlotStatus.OCCUPIED)
                    .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_RETURN_LOCATION,
                            "Chưa nhận được xác nhận xe nằm trong ô đỗ hợp lệ. Vui lòng điều chỉnh vị trí đỗ hoặc liên hệ hỗ trợ"));
            Hub hub = hubs.findById(slot.getHubId()).orElseThrow();
            if (!hub.isActive()) throw new BusinessException(ErrorCode.HUB_INACTIVE);
            t.requestReturn(hub.getId(), slot.getId(), ReturnMode.ONLINE);
            return new Prep(slot.getId(), hub.getId(), t.getVehicleId(), false);
        });
        if (p.already()) return tx.inNewTx(() -> current(tripId, "Chuyến đi đã ở trạng thái xử lý trả xe"));

        DeviceCommandService.Result res = commands.execute(DeviceType.VEHICLE, p.vehicleId(), CommandType.LOCK, CTX_RETURN, tripId);
        if (res.ok()) {
            ReturnResult r = tx.inNewTx(() -> completeTrip(tripId, clock.instant(), "Trả xe thành công"));
            verifyAfter(p.vehicleId());
            return tx.inNewTx(() -> current(tripId, r.message()));
        }
        tx.runInNewTx(() -> markReturnReconciling(tripId, ReturnMode.ONLINE, null,
                res.outcome() == CommandOutcome.FAILED ? "Thiết bị báo khóa xe thất bại" : "Chưa nhận được xác nhận khóa xe"));
        return tx.inNewTx(() -> current(tripId, "Chưa xác nhận được xe đã khóa an toàn. Chuyến đi chuyển sang chờ đối soát, hệ thống sẽ tự hoàn tất khi xác minh được thiết bị"));
    }

    /** RE06-E2 – góp ý #6: OTP chỉ xác thực yêu cầu; chuyến đi chờ đối soát cho tới khi có bằng chứng vật lý. */
    @Transactional
    public ReturnResult offlineReturn(Long studentId, Long tripId, OfflineReturnRequest req) {
        Trip t = owned(studentId, trips.lockById(tripId));
        if (t.getStatus() == TripStatus.PENDING_RECONCILIATION || t.getStatus() == TripStatus.COMPLETED) {
            return current(tripId, "Yêu cầu trả xe đã được ghi nhận trước đó");
        }
        Instant now = clock.instant();
        if (req.clientEndedAt().isBefore(t.getStartedAt()) || req.clientEndedAt().isAfter(now.plusSeconds(120))) {
            throw new BusinessException(ErrorCode.OTP_INVALID, "Thời điểm trả xe không hợp lệ");
        }
        if (!OfflineOtp.verify(t.getOfflineSecret(), req.otp(), req.clientEndedAt())) throw new BusinessException(ErrorCode.OTP_INVALID);
        t.pendingReconciliation(ReturnMode.OFFLINE_OTP, req.clientEndedAt(),
                "Trả xe offline bằng OTP – chờ bằng chứng vật lý (xe trong ô hợp lệ + đã khóa)");
        Vehicle v = vehicles.lockById(t.getVehicleId()).orElseThrow();
        v.setStatus(VehicleStatus.RETURN_RECONCILING);
        audit.record(studentId, "OFFLINE_RETURN", "TRIP", tripId, Map.of("clientEndedAt", req.clientEndedAt().toString()));
        notifications.notify(studentId, "TRIP_PENDING", "Đã ghi nhận trả xe offline",
                "Chuyến " + t.getCode() + " sẽ hoàn tất khi hệ thống xác nhận xe đã vào đúng ô và khóa an toàn.");
        return current(tripId, "Đã ghi nhận yêu cầu trả xe offline. Chuyến đi đang chờ đối soát với dữ liệu thiết bị");
    }

    private void markReturnReconciling(Long tripId, ReturnMode mode, Instant clientEndedAt, String note) {
        Trip t = trips.lockById(tripId).orElseThrow();
        t.pendingReconciliation(mode, clientEndedAt, note);
        Vehicle v = vehicles.lockById(t.getVehicleId()).orElseThrow();
        v.setStatus(VehicleStatus.RETURN_RECONCILING);
        v.setLockState(LockState.UNKNOWN);
        alerts.raise(AlertType.RECONCILIATION, t.getEndHubId(), "TRIP", t.getId(), AlertSeverity.WARNING,
                "Chuyến " + t.getCode() + " (xe " + v.getCode() + "): " + note);
    }

    /** Hoàn tất chuyến đi: dữ liệu sử dụng → thanh toán mô phỏng → trạng thái xe theo dữ liệu thực tế (bước 6–7). */
    private ReturnResult completeTrip(Long tripId, Instant endedAt, String message) {
        Trip t = trips.lockById(tripId).orElseThrow();
        if (t.getStatus() == TripStatus.COMPLETED) return current(tripId, message);
        Vehicle v = vehicles.lockById(t.getVehicleId()).orElseThrow();
        ParkingSlot slot = slots.findByVehicleId(v.getId()).orElseThrow(() -> new BusinessException(ErrorCode.INVALID_RETURN_LOCATION));
        long minutes = Math.max(1, Duration.between(t.getStartedAt(), endedAt).toMinutes());
        BigDecimal cost = payment.tripCost(v.getType().name(), minutes, t.getDistanceKm());
        t.complete(endedAt, slot.getHubId(), slot.getId(), v.getBatteryPercent(), cost);
        v.setHubId(slot.getHubId());
        v.setLockState(LockState.LOCKED);
        VehicleStatus next;
        if (sessions.findFirstByVehicleIdAndStatusIn(v.getId(), LIVE_SESSION).isPresent()) next = VehicleStatus.CHARGING;
        else if (v.getBatteryPercent() < props.vehicle().minBatteryPercent()) next = VehicleStatus.NEEDS_CHARGE;
        else next = VehicleStatus.PENDING_CHECK;
        v.setStatus(next);
        if (t.getReservationId() != null) {
            reservations.lockById(t.getReservationId()).ifPresent(r -> r.close(ReservationStatus.COMPLETED, "TRIP_COMPLETED", endedAt));
        }
        alerts.resolveIfOpen(AlertType.RECONCILIATION, t.getEndHubId(), "TRIP", t.getId());
        events.hubChanged(slot.getHubId());
        audit.record(t.getStudentId(), "TRIP_COMPLETE", "TRIP", t.getId(), Map.of("cost", cost.toPlainString(), "minutes", minutes));
        notifications.notify(t.getStudentId(), "TRIP_COMPLETED", "Trả xe thành công",
                "Chuyến " + t.getCode() + ": " + minutes + " phút, chi phí " + cost.toBigInteger() + "đ. Hãy đánh giá chuyến đi nhé!");
        return new ReturnResult(ReturnState.COMPLETED, message, mapper.trip(t, false), next.name());
    }

    private void verifyAfter(Long vehicleId) {
        try {
            tx.runInNewTx(() -> verifier.verifyVehicle(vehicleId));
        } catch (RuntimeException e) {
            log.warn("Xác minh xe {} thất bại: {}", vehicleId, e.getMessage());
        }
    }

    private ReturnResult current(Long tripId, String message) {
        Trip t = trips.findById(tripId).orElseThrow();
        ReturnState st = t.getStatus() == TripStatus.COMPLETED ? ReturnState.COMPLETED : ReturnState.PENDING_RECONCILIATION;
        String vStatus = vehicles.findById(t.getVehicleId()).map(v -> v.getStatus().name()).orElse(null);
        return new ReturnResult(st, message, mapper.trip(t, false), vStatus);
    }

    // =================================================================== Đối soát (tiến trình nền + thủ công)
    /** Đối soát lệnh mở khóa UNKNOWN: đọc lại trạng thái khóa thực tế của thiết bị. */
    public void reconcileUnlock(DeviceCommand c) {
        Optional<DeviceState> st = gateway.query(DeviceType.VEHICLE, c.getDeviceId());
        if (st.isEmpty() || st.get().lockState() == LockState.UNKNOWN) {
            tx.runInNewTx(() -> {
                commands.incrementAttempts(c.getId());
                if (c.getAttempts() + 1 >= props.reconciliation().maxAttempts()) {
                    Long hubId = reservations.findById(c.getContextId()).map(Reservation::getHubId).orElse(null);
                    alerts.raise(AlertType.RECONCILIATION, hubId, "VEHICLE", c.getDeviceId(), AlertSeverity.CRITICAL,
                            "Không liên lạc được thiết bị xe #" + c.getDeviceId() + " sau " + (c.getAttempts() + 1) + " lần – cần kiểm tra thủ công");
                }
            });
            return;
        }
        resolveUnlock(c.getId(), st.get().lockState() == LockState.UNLOCKED, "Đối soát tự động: khóa " + st.get().lockState());
    }

    /** Kết luận đối soát mở khóa (tự động hoặc Đơn vị vận hành xác nhận thủ công). */
    public void resolveUnlock(Long commandId, boolean unlocked, String note) {
        DeviceCommand c = commands.get(commandId);
        if (unlocked) {
            Trip t = tx.inNewTx(() -> {
                commands.markReconciled(commandId, true, note);
                return startTrip(c.getContextId(), c.getRequestedAt());
            });
            log.info("Đối soát: xe #{} đã mở khóa, chuyến {} bắt đầu", c.getDeviceId(), t.getCode());
            return;
        }
        Long toVerify = tx.inNewTx(() -> {
            commands.markReconciled(commandId, false, note);
            Reservation r = reservations.lockById(c.getContextId()).orElseThrow();
            if (r.getStatus() != ReservationStatus.PICKUP_PENDING) return null;
            Vehicle v = vehicles.lockById(r.getVehicleId()).orElseThrow();
            v.setLockState(LockState.LOCKED);
            alerts.resolveIfOpen(AlertType.RECONCILIATION, r.getHubId(), "VEHICLE", v.getId());
            if (!r.isDirect() && r.getExpiresAt().isAfter(clock.instant())) {
                r.setStatus(ReservationStatus.RESERVED);
                v.setStatus(VehicleStatus.RESERVED);
                notifications.notify(r.getStudentId(), "PICKUP_RETRY", "Xe chưa được mở khóa",
                        "Hệ thống xác minh xe " + v.getCode() + " vẫn đang khóa. Đơn " + r.getCode() + " vẫn được giữ, vui lòng thử nhận xe lại.");
                return null;
            }
            r.close(ReservationStatus.CANCELLED, "UNLOCK_NOT_CONFIRMED", clock.instant());
            v.setStatus(VehicleStatus.PENDING_CHECK);
            notifications.notify(r.getStudentId(), "PICKUP_CANCELLED", "Nhận xe không thành công",
                    "Xe " + v.getCode() + " chưa được mở khóa; đơn " + r.getCode() + " đã đóng, bạn không bị tính phí.");
            events.hubChanged(r.getHubId());
            return v.getId();
        });
        if (toVerify != null) verifyAfter(toVerify);
    }

    /** Đối soát chuyến chờ trả: COMPLETED chỉ khi có bằng chứng vật lý (xe trong ô hợp lệ + khóa an toàn). */
    public void reconcileReturn(Long tripId) {
        record Evidence(boolean ok, Instant endedAt, boolean timeout, Long vehicleId) {}
        Evidence e = tx.inNewTx(() -> {
            Trip t = trips.findById(tripId).orElseThrow();
            if (t.getStatus() != TripStatus.PENDING_RECONCILIATION) return new Evidence(false, null, false, null);
            Vehicle v = vehicles.findById(t.getVehicleId()).orElseThrow();
            LockState lock = gateway.query(DeviceType.VEHICLE, v.getId()).map(DeviceState::lockState).orElse(v.getLockState());
            boolean inSlot = slots.findByVehicleId(v.getId())
                    .filter(s -> s.getKind() == SlotKind.SHARED && s.getStatus() == SlotStatus.OCCUPIED).isPresent();
            boolean fresh = v.getLastSeenAt() != null && Duration.between(v.getLastSeenAt(), clock.instant()).getSeconds() <= 2L * props.iot().telemetryIntervalSeconds();
            Instant end = t.getReturnMode() == ReturnMode.OFFLINE_OTP && t.getClientEndedAt() != null ? t.getClientEndedAt()
                    : commands.pendingReconciliation().stream().filter(c -> CTX_RETURN.equals(c.getContextType()) && tripId.equals(c.getContextId()))
                    .map(DeviceCommand::getRequestedAt).findFirst().orElse(clock.instant());
            boolean timeout = Duration.between(t.getUpdatedAt(), clock.instant()).toMinutes() >= props.reconciliation().evidenceTimeoutMinutes();
            return new Evidence(lock == LockState.LOCKED && inSlot && fresh, end, timeout, v.getId());
        });
        if (e.vehicleId() == null) return;
        if (e.ok()) {
            tx.runInNewTx(() -> {
                completeTrip(tripId, e.endedAt(), "Đối soát thành công – chuyến đi đã hoàn tất");
                commands.pendingReconciliation().stream()
                        .filter(c -> CTX_RETURN.equals(c.getContextType()) && tripId.equals(c.getContextId()))
                        .forEach(c -> commands.markReconciled(c.getId(), true, "Có bằng chứng vật lý"));
            });
            verifyAfter(e.vehicleId());
        } else if (e.timeout()) {
            tx.runInNewTx(() -> {
                Trip t = trips.findById(tripId).orElseThrow();
                alerts.raise(AlertType.RECONCILIATION, t.getEndHubId(), "TRIP", tripId, AlertSeverity.CRITICAL,
                        "Chuyến " + t.getCode() + " chờ đối soát quá " + props.reconciliation().evidenceTimeoutMinutes() + " phút – cần kiểm tra thực địa");
            });
        }
    }

    /** Đơn vị vận hành xác nhận bằng chứng vật lý sau khi kiểm tra thực địa (xe trong ô hợp lệ, đã khóa). */
    public ReturnResult operatorConfirmReturn(Long operatorId, Long tripId) {
        Long vehicleId = tx.inNewTx(() -> {
            Trip t = trips.lockById(tripId).orElseThrow(() -> BusinessException.notFound("Chuyến đi", tripId));
            if (t.getStatus() != TripStatus.PENDING_RECONCILIATION) throw new BusinessException(ErrorCode.INVALID_STATE, "Chuyến đi không ở trạng thái chờ đối soát");
            slots.findByVehicleId(t.getVehicleId()).filter(s -> s.getKind() == SlotKind.SHARED && s.getStatus() == SlotStatus.OCCUPIED)
                    .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_RETURN_LOCATION, "Cảm biến chưa ghi nhận xe trong ô hợp lệ – chưa thể hoàn tất"));
            Instant end = t.getClientEndedAt() != null ? t.getClientEndedAt() : clock.instant();
            completeTrip(tripId, end, "Đơn vị vận hành xác nhận bằng chứng vật lý");
            audit.record(operatorId, "RECONCILE_TRIP_MANUAL", "TRIP", tripId, null);
            return t.getVehicleId();
        });
        verifyAfter(vehicleId);
        return tx.inNewTx(() -> current(tripId, "Đã hoàn tất chuyến đi sau đối soát thủ công"));
    }

    public List<Long> pendingReturnIds() {
        return tx.inNewTx(() -> trips.findByStatus(TripStatus.PENDING_RECONCILIATION).stream().map(Trip::getId).toList());
    }

    /** Danh sách chuyến chờ bằng chứng vật lý cho màn hình đối soát (không kèm bí mật OTP). */
    public List<TripView> pendingReturns() {
        return tx.inNewTx(() -> trips.findByStatus(TripStatus.PENDING_RECONCILIATION).stream().map(t -> mapper.trip(t, false)).toList());
    }

    // =================================================================== AC05 + trạng thái hiện tại
    @Transactional(readOnly = true)
    public List<TripView> history(Long studentId) {
        return trips.findByStudentIdOrderByStartedAtDesc(studentId).stream().map(t -> mapper.trip(t, false)).toList();
    }

    @Transactional(readOnly = true)
    public TripView get(Long studentId, Long id) {
        Trip t = owned(studentId, trips.findById(id));
        return mapper.trip(t, CURRENT.contains(t.getStatus()));
    }

    @Transactional(readOnly = true)
    public ActiveState active(Long studentId) {
        ReservationView r = reservations.findFirstByStudentIdAndStatusInOrderByIdDesc(studentId, ReservationService.OPEN)
                .map(x -> mapper.reservation(x, null)).orElse(null);
        TripView t = trips.findFirstByStudentIdAndStatusInOrderByIdDesc(studentId, CURRENT).map(x -> mapper.trip(x, true)).orElse(null);
        return new ActiveState(r, t);
    }

    /** Dữ liệu thiết bị trong chuyến: cộng dồn quãng đường. */
    @Transactional
    public void addDistance(Long vehicleId, double km) {
        trips.findFirstByVehicleIdAndStatusInOrderByIdDesc(vehicleId, Set.of(TripStatus.IN_PROGRESS)).ifPresent(t -> t.addDistance(km));
    }

    private static Trip owned(Long studentId, Optional<Trip> t) {
        return t.filter(x -> x.getStudentId().equals(studentId)).orElseThrow(() -> BusinessException.notFound("Chuyến đi", "?"));
    }
}
