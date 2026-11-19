package vn.edu.hcmut.emobility.personal;

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
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.charging.ChargingSession;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.charging.SessionStatus;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.iot.*;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.core.payment.PaymentSimulator;
import vn.edu.hcmut.emobility.fleet.FleetEvents;
import vn.edu.hcmut.emobility.fleet.ResourceVerifier;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.maintenance.IncidentService;
import vn.edu.hcmut.emobility.maintenance.Severity;
import vn.edu.hcmut.emobility.maintenance.TargetType;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;
import vn.edu.hcmut.emobility.personal.PersonalDtos.BookingView;

/**
 * PV03 – Check-in / Check-out phiên đỗ & sạc xe cá nhân.
 * Góp ý #8: check-out theo thứ tự vật lý: yêu cầu dừng sạc → thiết bị xác nhận ngắt điện an toàn
 * → cảm biến xác nhận xe rời vị trí → mới giải phóng chỗ đỗ / cổng sạc. Không giải phóng chỉ vì người dùng bấm Check-out.
 */
@Service
public class CheckInService {

    private static final Logger log = LoggerFactory.getLogger(CheckInService.class);
    private static final Set<SessionStatus> LIVE = Set.of(SessionStatus.STARTING, SessionStatus.ACTIVE, SessionStatus.STOPPING);
    public static final String CTX = "BOOKING";

    private final SlotBookingRepository bookings;
    private final PersonalVehicleRepository personalVehicles;
    private final ChargingSessionRepository sessions;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final PortReservationService portService;
    private final DeviceCommandService commands;
    private final IotGateway gateway;
    private final PaymentSimulator payment;
    private final ResourceVerifier verifier;
    private final IncidentService incidents;
    private final AlertService alerts;
    private final NotificationService notifications;
    private final BookingMapper mapper;
    private final FleetEvents events;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public CheckInService(SlotBookingRepository bookings, PersonalVehicleRepository personalVehicles, ChargingSessionRepository sessions,
                          ParkingSlotRepository slots, ChargingPortRepository ports, PortReservationService portService,
                          DeviceCommandService commands, IotGateway gateway, PaymentSimulator payment, ResourceVerifier verifier,
                          IncidentService incidents, AlertService alerts, NotificationService notifications, BookingMapper mapper,
                          FleetEvents events, AuditService audit, TxRunner tx, AppProperties props, Clock clock) {
        this.bookings = bookings;
        this.personalVehicles = personalVehicles;
        this.sessions = sessions;
        this.slots = slots;
        this.ports = ports;
        this.portService = portService;
        this.commands = commands;
        this.gateway = gateway;
        this.payment = payment;
        this.verifier = verifier;
        this.incidents = incidents;
        this.alerts = alerts;
        this.notifications = notifications;
        this.mapper = mapper;
        this.events = events;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    /** Thiết bị quét tại Hub gửi mã QR. ownerId = null khi gọi từ thiết bị. */
    public BookingView checkInByToken(String qrToken, String plate) {
        Long id = tx.inNewTx(() -> bookings.findByQrToken(qrToken).map(SlotBooking::getId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECKIN_INVALID)));
        return checkIn(null, id, plate);
    }

    public BookingView checkIn(Long ownerId, Long bookingId, String plate) {
        record Prep(Long slotId, Long portId, Long hubId, boolean already) {}
        Prep p = tx.inNewTx(() -> {
            SlotBooking b = BookingService.owned(ownerId, bookings.lockById(bookingId).orElse(null), bookingId);
            if (b.getStatus() == BookingStatus.IN_USE) return new Prep(null, null, b.getHubId(), true);
            if (b.getStatus() != BookingStatus.BOOKED) throw new BusinessException(ErrorCode.CHECKIN_INVALID);
            Instant now = clock.instant();
            long grace = props.booking().checkInGraceMinutes() * 60L;
            if (now.isBefore(b.getStartAt().minusSeconds(grace)) || now.isAfter(b.getStartAt().plusSeconds(grace))) {
                throw new BusinessException(ErrorCode.CHECKIN_INVALID, "Ngoài khung giờ check-in (trước giờ hẹn hoặc trễ tối đa "
                        + props.booking().checkInGraceMinutes() + " phút)");
            }
            if (plate != null && !plate.isBlank()) {
                String expected = personalVehicles.findById(b.getPersonalVehicleId()).map(PersonalVehicle::getPlateNumber).orElse("");
                if (!expected.equalsIgnoreCase(plate.trim())) throw new BusinessException(ErrorCode.CHECKIN_INVALID, "Biển số xe không khớp với đơn đặt");
            }
            return new Prep(b.getSlotId(), b.getPortId(), b.getHubId(), false);
        });
        if (p.already()) return tx.inNewTx(() -> mapper.view(bookings.findById(bookingId).orElseThrow(), "Phiên đã check-in trước đó"));

        if (p.slotId() != null) {
            DeviceCommandService.Result gate = commands.execute(DeviceType.SLOT, p.slotId(), CommandType.OPEN_GATE, CTX, bookingId);
            if (!gate.ok()) {
                deviceProblem(p.hubId(), TargetType.PARKING_SLOT, p.slotId(), "Thiết bị tại ô đỗ không phản hồi khi check-in");
                throw new BusinessException(ErrorCode.IOT_COMMAND_FAILED, "Thiết bị tại ô đỗ không phản hồi – trạng thái phiên không thay đổi, sự cố đã được ghi nhận");
            }
        }
        if (p.portId() == null) {
            return tx.inNewTx(() -> {
                SlotBooking b = bookings.lockById(bookingId).orElseThrow();
                b.checkIn(clock.instant());
                slots.lockById(p.slotId()).ifPresent(s -> s.setStatus(SlotStatus.OCCUPIED));
                events.hubChanged(b.getHubId());
                audit.record(b.getOwnerId(), "CHECK_IN", "BOOKING", b.getId(), null);
                return mapper.view(b, "Check-in thành công – mời bạn đỗ xe vào ô " + slots.findById(p.slotId()).map(ParkingSlot::getCode).orElse(""));
            });
        }
        // Có sạc: tạo phiên STARTING, chỉ ACTIVE khi thiết bị xác nhận cấp điện
        Long sessionId = tx.inNewTx(() -> sessions.saveAndFlush(new ChargingSession(p.portId(), null, bookingId, null, clock.instant(), null)).getId());
        DeviceCommandService.Result charge = commands.execute(DeviceType.PORT, p.portId(), CommandType.START_CHARGE, CTX, bookingId);
        if (!charge.ok() && p.slotId() == null) {
            tx.runInNewTx(() -> sessions.lockById(sessionId).ifPresent(ChargingSession::fail));
            deviceProblem(p.hubId(), TargetType.CHARGING_PORT, p.portId(), "Cổng sạc không xác nhận cấp điện khi check-in");
            throw new BusinessException(ErrorCode.IOT_COMMAND_FAILED, "Cổng sạc không phản hồi – trạng thái phiên không thay đổi, sự cố đã được ghi nhận");
        }
        return tx.inNewTx(() -> {
            Instant now = clock.instant();
            SlotBooking b = bookings.lockById(bookingId).orElseThrow();
            ChargingSession s = sessions.lockById(sessionId).orElseThrow();
            b.checkIn(now);
            if (p.slotId() != null) slots.lockById(p.slotId()).ifPresent(sl -> sl.setStatus(SlotStatus.OCCUPIED));
            String msg;
            if (charge.ok()) {
                s.confirmPowerOn(now);
                ports.lockById(p.portId()).ifPresent(pt -> pt.setStatus(PortStatus.OCCUPIED));
                msg = "Check-in thành công – thiết bị đã xác nhận bắt đầu sạc";
            } else {
                s.fail();
                b.setNote("Cổng sạc chưa xác nhận cấp điện – có thể thử khởi động lại sạc");
                alerts.raise(AlertType.DEVICE_ERROR, b.getHubId(), "PORT", p.portId(), AlertSeverity.WARNING,
                        "Cổng #" + p.portId() + " không xác nhận cấp điện cho đặt chỗ " + b.getCode());
                msg = "Đã check-in chỗ đỗ, nhưng cổng sạc chưa xác nhận cấp điện. Bạn có thể thử lại sạc";
            }
            events.hubChanged(b.getHubId());
            audit.record(b.getOwnerId(), "CHECK_IN", "BOOKING", b.getId(), Map.of("charging", charge.outcome().name()));
            return mapper.view(b, msg);
        });
    }

    /** Thử khởi động lại sạc cho phiên đã check-in mà sạc thất bại. */
    public BookingView retryCharging(Long ownerId, Long bookingId) {
        Long[] ids = tx.inNewTx(() -> {
            SlotBooking b = BookingService.owned(ownerId, bookings.lockById(bookingId).orElse(null), bookingId);
            if (b.getStatus() != BookingStatus.IN_USE || b.getPortId() == null) throw new BusinessException(ErrorCode.BOOKING_NOT_ACTIVE);
            if (sessions.findFirstBySlotBookingIdAndStatusIn(bookingId, LIVE).isPresent()) throw new BusinessException(ErrorCode.INVALID_STATE, "Phiên sạc đang chạy");
            ChargingSession s = sessions.saveAndFlush(new ChargingSession(b.getPortId(), null, bookingId, null, clock.instant(), null));
            return new Long[]{s.getId(), b.getPortId()};
        });
        DeviceCommandService.Result res = commands.execute(DeviceType.PORT, ids[1], CommandType.START_CHARGE, CTX, bookingId);
        return tx.inNewTx(() -> {
            SlotBooking b = bookings.lockById(bookingId).orElseThrow();
            ChargingSession s = sessions.lockById(ids[0]).orElseThrow();
            if (res.ok()) {
                s.confirmPowerOn(clock.instant());
                ports.lockById(ids[1]).ifPresent(pt -> pt.setStatus(PortStatus.OCCUPIED));
                b.setNote(null);
                return mapper.view(b, "Thiết bị đã xác nhận bắt đầu sạc");
            }
            s.fail();
            return mapper.view(b, "Cổng sạc vẫn chưa xác nhận cấp điện");
        });
    }

    /** Check-out bước 1–2: yêu cầu dừng sạc, chờ thiết bị xác nhận ngắt điện an toàn. */
    public BookingView checkOut(Long ownerId, Long bookingId) {
        record Prep(Long sessionId, Long portId, boolean done) {}
        Prep p = tx.inNewTx(() -> {
            SlotBooking b = BookingService.owned(ownerId, bookings.lockById(bookingId).orElse(null), bookingId);
            if (b.getStatus() == BookingStatus.AWAITING_EXIT || b.getStatus() == BookingStatus.COMPLETED) return new Prep(null, null, true);
            if (b.getStatus() != BookingStatus.IN_USE && b.getStatus() != BookingStatus.CHECKOUT_REQUESTED) {
                throw new BusinessException(ErrorCode.BOOKING_NOT_ACTIVE);
            }
            b.setStatus(BookingStatus.CHECKOUT_REQUESTED);
            Optional<ChargingSession> s = sessions.findFirstBySlotBookingIdAndStatusIn(bookingId, Set.of(SessionStatus.ACTIVE, SessionStatus.STOPPING));
            if (s.isEmpty()) {
                b.chargingStopped(clock.instant(), sessions.findFirstBySlotBookingIdOrderByIdDesc(bookingId).map(ChargingSession::getEnergyKwh).orElse(0.0));
                return new Prep(null, null, true);
            }
            sessions.lockById(s.get().getId()).ifPresent(ChargingSession::stopping);
            return new Prep(s.get().getId(), s.get().getPortId(), false);
        });
        if (p.done()) {
            return tx.inNewTx(() -> mapper.view(bookings.findById(bookingId).orElseThrow(),
                    "Vui lòng đưa xe rời vị trí. Phiên sẽ kết thúc khi cảm biến xác nhận xe đã rời đi"));
        }
        DeviceCommandService.Result res = commands.execute(DeviceType.PORT, p.portId(), CommandType.STOP_CHARGE, CTX, bookingId);
        if (!res.ok()) {
            return tx.inNewTx(() -> {
                SlotBooking b = bookings.findById(bookingId).orElseThrow();
                alerts.raise(AlertType.DEVICE_ERROR, b.getHubId(), "PORT", p.portId(), AlertSeverity.CRITICAL,
                        "Cổng #" + p.portId() + " chưa xác nhận ngắt điện khi check-out " + b.getCode() + " – chưa giải phóng tài nguyên");
                return mapper.view(b, "Chưa nhận được xác nhận ngắt điện an toàn – CHƯA rút cáp. Chỗ đỗ và cổng sạc chưa được giải phóng; hệ thống sẽ thử lại");
            });
        }
        return tx.inNewTx(() -> confirmPowerOff(bookingId, p.sessionId()));
    }

    /** Thiết bị xác nhận đã ngắt điện → chờ xe rời vị trí (chưa giải phóng tài nguyên). */
    private BookingView confirmPowerOff(Long bookingId, Long sessionId) {
        SlotBooking b = bookings.lockById(bookingId).orElseThrow();
        ChargingSession s = sessions.lockById(sessionId).orElseThrow();
        if (b.getStatus() != BookingStatus.CHECKOUT_REQUESTED) return mapper.view(b, null);
        Instant now = clock.instant();
        double hours = s.getStartedAt() == null ? 0 : Duration.between(s.getStartedAt(), now).toSeconds() / 3600.0;
        double cap = personalVehicles.findById(b.getPersonalVehicleId()).map(PersonalVehicle::getBatteryKwh).orElse(2.0);
        double power = ports.findById(s.getPortId()).map(ChargingPort::getPowerKw).orElse(3.3);
        double kwh = Math.round(Math.min(cap, Math.max(s.getEnergyKwh(), power * hours * 0.9)) * 100) / 100.0;
        s.complete(now, kwh, null);
        b.chargingStopped(now, kwh);
        audit.record(b.getOwnerId(), "CHARGING_POWER_OFF_CONFIRMED", "BOOKING", b.getId(), Map.of("kwh", kwh));
        return mapper.view(b, "Thiết bị đã ngắt điện an toàn. Vui lòng rút cáp và đưa xe rời vị trí – phiên sẽ kết thúc khi cảm biến xác nhận");
    }

    /** Đối soát check-out đang chờ xác nhận ngắt điện: đọc lại trạng thái cổng. */
    public void reconcileCheckouts() {
        List<Long[]> pending = tx.inNewTx(() -> bookings.findByStatusIn(Set.of(BookingStatus.CHECKOUT_REQUESTED)).stream()
                .filter(b -> b.getPortId() != null)
                .map(b -> new Long[]{b.getId(), b.getPortId()}).toList());
        for (Long[] x : pending) {
            Optional<DeviceState> st = gateway.query(DeviceType.PORT, x[1]);
            if (st.isPresent() && Boolean.FALSE.equals(st.get().powerOn())) {
                tx.runInNewTx(() -> sessions.findFirstBySlotBookingIdAndStatusIn(x[0], Set.of(SessionStatus.STOPPING, SessionStatus.ACTIVE))
                        .ifPresent(s -> confirmPowerOff(x[0], s.getId())));
            }
        }
    }

    /** Cảm biến báo ô/cổng trống: bước cuối của check-out – tính phí và giải phóng tài nguyên. */
    public void onResourceVacated(Long slotId, Long portId) {
        Long[] released = tx.inNewTx(() -> {
            Set<BookingStatus> st = Set.of(BookingStatus.AWAITING_EXIT, BookingStatus.IN_USE, BookingStatus.CHECKOUT_REQUESTED);
            Optional<SlotBooking> found = slotId != null
                    ? bookings.findBySlotIdAndStatusIn(slotId, st).stream().findFirst()
                    : portId == null ? Optional.empty()
                    : bookings.findByPortIdAndStatusIn(portId, st).stream().filter(b -> b.getSlotId() == null).findFirst();
            if (found.isEmpty()) return null;
            SlotBooking b = bookings.lockById(found.get().getId()).orElseThrow();
            if (b.getStatus() != BookingStatus.AWAITING_EXIT) {
                alerts.raise(AlertType.DEVICE_ERROR, b.getHubId(), "BOOKING", b.getId(), AlertSeverity.WARNING,
                        "Xe rời vị trí khi phiên " + b.getCode() + " chưa hoàn tất ngắt sạc/check-out – cần kiểm tra");
                return null;
            }
            Instant now = clock.instant();
            long minutes = Math.max(1, Duration.between(b.getCheckedInAt(), now).toMinutes());
            BigDecimal cost = BigDecimal.ZERO;
            if (b.getServiceType() != ServiceType.CHARGE) cost = cost.add(payment.parkingCost(minutes));
            if (b.getEnergyKwh() != null && b.getEnergyKwh() > 0) cost = cost.add(payment.chargingCost(b.getEnergyKwh()));
            b.complete(now, cost);
            if (b.getSlotId() != null) slots.lockById(b.getSlotId()).ifPresent(s -> s.setStatus(SlotStatus.PENDING_CHECK));
            if (b.getPortId() != null) {
                ports.lockById(b.getPortId()).ifPresent(p -> p.setStatus(PortStatus.PENDING_CHECK));
                portService.release(PortReservationSource.BOOKING, b.getId(), PortReservationStatus.RELEASED);
            }
            events.hubChanged(b.getHubId());
            audit.record(b.getOwnerId(), "CHECK_OUT_COMPLETED", "BOOKING", b.getId(), Map.of("cost", cost.toPlainString()));
            notifications.notify(b.getOwnerId(), "BOOKING_COMPLETED", "Phiên đỗ/sạc đã kết thúc",
                    "Phiên " + b.getCode() + ": " + minutes + " phút" + (b.getEnergyKwh() != null ? ", " + b.getEnergyKwh() + " kWh" : "")
                            + ", chi phí " + cost.toBigInteger() + "đ.");
            return new Long[]{b.getSlotId(), b.getPortId()};
        });
        if (released == null) return;
        try {
            if (released[0] != null) tx.runInNewTx(() -> verifier.verifySlot(released[0]));
            if (released[1] != null) tx.runInNewTx(() -> verifier.verifyPort(released[1]));
        } catch (RuntimeException e) {
            log.warn("Xác minh sau check-out thất bại: {}", e.getMessage());
        }
    }

    private void deviceProblem(Long hubId, TargetType type, Long id, String description) {
        try {
            tx.runInNewTx(() -> incidents.createSystem(hubId, type, id, "Thiết bị không phản hồi", description, Severity.MEDIUM));
        } catch (RuntimeException e) {
            log.warn("Không tạo được sự cố thiết bị: {}", e.getMessage());
        }
    }
}
