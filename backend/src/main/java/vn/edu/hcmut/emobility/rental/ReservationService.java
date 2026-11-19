package vn.edu.hcmut.emobility.rental;

import java.time.Clock;
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
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.fleet.*;
import vn.edu.hcmut.emobility.maintenance.IncidentRepository;
import vn.edu.hcmut.emobility.maintenance.IncidentStatus;
import vn.edu.hcmut.emobility.maintenance.MaintenanceTicketRepository;
import vn.edu.hcmut.emobility.maintenance.TargetType;
import vn.edu.hcmut.emobility.rental.RentalDtos.*;

/** RE01 đặt trước, RE02 lịch sử, RE03 hủy, RE04 gia hạn, tiến trình nền hết hạn đơn (mục 2.3). */
@Service
public class ReservationService {

    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);
    static final Set<ReservationStatus> OPEN = Set.of(ReservationStatus.RESERVED, ReservationStatus.PICKUP_PENDING);
    static final Set<TripStatus> ACTIVE_TRIP = Set.of(TripStatus.IN_PROGRESS, TripStatus.RETURNING);

    private final ReservationRepository reservations;
    private final ReservationExtensionRepository extensions;
    private final TripRepository trips;
    private final VehicleRepository vehicles;
    private final IncidentRepository incidents;
    private final MaintenanceTicketRepository tickets;
    private final ResourceVerifier verifier;
    private final RentalMapper mapper;
    private final FleetEvents events;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public ReservationService(ReservationRepository reservations, ReservationExtensionRepository extensions, TripRepository trips,
                              VehicleRepository vehicles, IncidentRepository incidents, MaintenanceTicketRepository tickets,
                              ResourceVerifier verifier, RentalMapper mapper, FleetEvents events, NotificationService notifications,
                              AuditService audit, TxRunner tx, AppProperties props, Clock clock) {
        this.reservations = reservations;
        this.extensions = extensions;
        this.trips = trips;
        this.vehicles = vehicles;
        this.incidents = incidents;
        this.tickets = tickets;
        this.verifier = verifier;
        this.mapper = mapper;
        this.events = events;
        this.notifications = notifications;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    /**
     * RE01 – góp ý #3: "kiểm tra lần cuối → giữ xe → tạo đơn" là MỘT giao dịch nguyên tử.
     * Bước giữ xe là UPDATE có điều kiện (status = AVAILABLE): nếu hai sinh viên xác nhận gần như đồng thời,
     * DB tuần tự hóa trên dòng xe, chỉ một UPDATE trả về 1 dòng; giao dịch còn lại nhận VEHICLE_UNAVAILABLE.
     * Partial unique index (ux_reservation_active_vehicle/student) là chốt chặn cuối.
     */
    @Transactional
    public ReservationView reserve(Long studentId, ReserveRequest req) {
        if (reservations.existsByStudentIdAndStatusIn(studentId, OPEN) || trips.existsByStudentIdAndStatusIn(studentId, ACTIVE_TRIP)) {
            throw new BusinessException(ErrorCode.ACTIVE_RESERVATION_EXISTS, "Bạn đang có một đơn đặt xe còn hiệu lực. Vui lòng hoàn tất hoặc hủy đơn hiện tại trước khi đặt đơn mới");
        }
        Instant now = clock.instant();
        int held = vehicles.casFromAvailable(req.vehicleId(), (short) props.vehicle().minBatteryPercent(), VehicleStatus.RESERVED, now);
        if (held == 0) throw unavailable(req.vehicleId());
        Vehicle v = vehicles.findById(req.vehicleId()).orElseThrow();
        if (req.hubId() != null && !req.hubId().equals(v.getHubId())) throw unavailable(req.vehicleId());
        Reservation r = reservations.saveAndFlush(new Reservation(Codes.next("DX", now), studentId, v.getId(), v.getHubId(),
                ReservationStatus.RESERVED, now, now.plusSeconds(props.reservation().holdMinutes() * 60L), false));
        events.hubChanged(v.getHubId());
        audit.record(studentId, "RESERVE", "RESERVATION", r.getId(), Map.of("vehicle", v.getCode()));
        return mapper.reservation(r, "Đặt xe thành công, xe được giữ trong " + props.reservation().holdMinutes() + " phút");
    }

    /** E1: xe đã bị giữ – kèm gợi ý xe thay thế cùng Hub. */
    private BusinessException unavailable(Long vehicleId) {
        Optional<Vehicle> v = vehicles.findById(vehicleId);
        List<AlternativeView> alts = v.map(x -> vehicles.alternatives(x.getHubId(), (short) props.vehicle().minBatteryPercent(), vehicleId, PageRequest.of(0, 3))
                .stream().map(mapper::alternative).toList()).orElse(List.of());
        ErrorCode code = v.isPresent() && v.get().getStatus() == VehicleStatus.AVAILABLE
                && v.get().getBatteryPercent() < props.vehicle().minBatteryPercent() ? ErrorCode.LOW_BATTERY : ErrorCode.VEHICLE_UNAVAILABLE;
        return new BusinessException(code, code.getMessage(), Map.of("alternatives", alts));
    }

    @Transactional(readOnly = true)
    public List<ReservationView> history(Long studentId) {
        return reservations.findByStudentIdOrderByIdDesc(studentId).stream().map(r -> mapper.reservation(r, null)).toList();
    }

    @Transactional(readOnly = true)
    public ReservationView get(Long studentId, Long id) {
        return mapper.reservation(owned(studentId, reservations.findById(id)), null);
    }

    /** RE03 – kiểm tra trạng thái và hủy trong cùng giao dịch (khóa dòng đơn). */
    public ReservationView cancel(Long studentId, Long id) {
        record Res(ReservationView view, Long vehicleToVerify) {}
        Res res = tx.inNewTx(() -> {
            Reservation r = owned(studentId, reservations.lockById(id));
            switch (r.getStatus()) {
                case PICKUP_PENDING, PICKED_UP -> throw new BusinessException(ErrorCode.CANNOT_CANCEL_PICKED_UP);
                case CANCELLED, EXPIRED, COMPLETED -> {
                    return new Res(mapper.reservation(r, "Đơn đã ở trạng thái " + r.getStatus() + ", không xử lý lại"), null);
                }
                default -> { }
            }
            r.close(ReservationStatus.CANCELLED, "USER_CANCELLED", clock.instant());
            Vehicle v = vehicles.lockById(r.getVehicleId()).orElseThrow();
            if (v.getStatus() == VehicleStatus.RESERVED) v.setStatus(VehicleStatus.PENDING_CHECK);
            audit.record(studentId, "RESERVATION_CANCEL", "RESERVATION", r.getId(), null);
            events.hubChanged(r.getHubId());
            return new Res(mapper.reservation(r, "Hủy đơn thành công"), v.getId());
        });
        if (res.vehicleToVerify() != null) safeVerify(res.vehicleToVerify());
        return res.view();
    }

    /**
     * RE04 – góp ý #4: khóa dòng đơn rồi mới kiểm tra (còn hiệu lực, chưa bị hủy/hết hạn/nhận xe đồng thời).
     * requestId (Idempotency-Key) đảm bảo bấm lặp do mạng chậm không cộng thời gian hai lần.
     */
    @Transactional
    public ReservationView extend(Long studentId, Long id, String requestId) {
        if (requestId == null || requestId.isBlank() || requestId.length() > 64) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Thiếu Idempotency-Key cho yêu cầu gia hạn");
        }
        Reservation r = owned(studentId, reservations.lockById(id));
        if (extensions.findByReservationIdAndRequestId(id, requestId).isPresent()) {
            return mapper.reservation(r, "Yêu cầu gia hạn này đã được xử lý trước đó");
        }
        Instant now = clock.instant();
        if (r.getStatus() == ReservationStatus.EXPIRED || (r.getStatus() == ReservationStatus.RESERVED && !r.getExpiresAt().isAfter(now))) {
            throw new BusinessException(ErrorCode.RESERVATION_EXPIRED);
        }
        if (r.getStatus() != ReservationStatus.RESERVED) {
            throw new BusinessException(ErrorCode.RESERVATION_NOT_ACTIVE, "Đơn đã " + r.getStatus() + ", không thể gia hạn");
        }
        if (r.getExtensionCount() >= props.reservation().maxExtensions()) throw new BusinessException(ErrorCode.MAX_EXTENSIONS_REACHED);
        Vehicle v = vehicles.findById(r.getVehicleId()).orElseThrow();
        boolean operational = incidents.existsByTargetTypeAndTargetIdAndStatusIn(TargetType.VEHICLE, v.getId(), Set.of(IncidentStatus.OPEN, IncidentStatus.ASSIGNED))
                || tickets.hasOpenTicket(TargetType.VEHICLE, v.getId()) || v.getBatteryPercent() < props.vehicle().minBatteryPercent();
        if (operational) {
            List<AlternativeView> alts = vehicles.alternatives(v.getHubId(), (short) props.vehicle().minBatteryPercent(), v.getId(), PageRequest.of(0, 3))
                    .stream().map(mapper::alternative).toList();
            throw new BusinessException(ErrorCode.VEHICLE_HAS_OPERATION, ErrorCode.VEHICLE_HAS_OPERATION.getMessage(), Map.of("alternatives", alts));
        }
        Instant old = r.getExpiresAt();
        r.extend(props.reservation().extendMinutes());
        extensions.saveAndFlush(new ReservationExtension(id, requestId, old, r.getExpiresAt()));
        audit.record(studentId, "RESERVATION_EXTEND", "RESERVATION", id, Map.of("requestId", requestId, "newExpiresAt", r.getExpiresAt().toString()));
        return mapper.reservation(r, "Gia hạn thành công thêm " + props.reservation().extendMinutes() + " phút");
    }

    /** Tiến trình nền mỗi 1 phút: chuyển đơn quá hạn sang EXPIRED, xe sang PENDING_CHECK, ghi nhật ký vi phạm. */
    public int expireDue() {
        int n = 0;
        for (Long id : tx.inNewTx(() -> reservations.findDueForExpiry(clock.instant()))) {
            try {
                Long vehicleId = tx.inNewTx(() -> expireOne(id));
                if (vehicleId != null) {
                    n++;
                    safeVerify(vehicleId);
                }
            } catch (RuntimeException e) {
                log.warn("Không hết hạn được đơn {}: {}", id, e.getMessage());
            }
        }
        return n;
    }

    private Long expireOne(Long id) {
        Reservation r = reservations.lockById(id).orElse(null);
        Instant now = clock.instant();
        // Kiểm tra lại sau khi khóa: đơn có thể vừa được gia hạn/hủy/nhận xe
        if (r == null || r.getStatus() != ReservationStatus.RESERVED || r.getExpiresAt().isAfter(now)) return null;
        r.close(ReservationStatus.EXPIRED, "NO_SHOW", now);
        Vehicle v = vehicles.lockById(r.getVehicleId()).orElseThrow();
        if (v.getStatus() == VehicleStatus.RESERVED) v.setStatus(VehicleStatus.PENDING_CHECK);
        audit.record(r.getStudentId(), "NO_SHOW_VIOLATION", "RESERVATION", r.getId(), Map.of("vehicle", v.getCode()));
        notifications.notify(r.getStudentId(), "RESERVATION_EXPIRED", "Đơn đặt xe đã hết hạn",
                "Đơn " + r.getCode() + " đã hết thời gian giữ chỗ và được ghi nhận vi phạm. Vui lòng đặt lại nếu vẫn cần xe.");
        events.hubChanged(r.getHubId());
        return v.getId();
    }

    void safeVerify(Long vehicleId) {
        try {
            tx.runInNewTx(() -> verifier.verifyVehicle(vehicleId));
        } catch (RuntimeException e) {
            log.warn("Xác minh xe {} thất bại: {}", vehicleId, e.getMessage());
        }
    }

    private static Reservation owned(Long studentId, Optional<Reservation> r) {
        return r.filter(x -> x.getStudentId().equals(studentId)).orElseThrow(() -> BusinessException.notFound("Đơn đặt xe", "?"));
    }
}
