package vn.edu.hcmut.emobility.module.parking;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.event.UserNotification;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.module.hub.ChargingPort;
import vn.edu.hcmut.emobility.module.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.module.hub.HubRepository;
import vn.edu.hcmut.emobility.module.hub.ParkingSlot;
import vn.edu.hcmut.emobility.module.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.module.hub.ResourceStatus;
import vn.edu.hcmut.emobility.module.parking.ParkingDto.BookRequest;
import vn.edu.hcmut.emobility.module.parking.ParkingDto.RegisterVehicleRequest;

@Service
public class ParkingService {

    private static final Logger log = LoggerFactory.getLogger(ParkingService.class);

    private final PersonalVehicleRepository personalVehicles;
    private final SlotBookingRepository bookings;
    private final HubRepository hubs;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final AppProperties props;
    private final Clock clock;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;

    public ParkingService(PersonalVehicleRepository personalVehicles, SlotBookingRepository bookings,
                          HubRepository hubs, ParkingSlotRepository slots, ChargingPortRepository ports,
                          AppProperties props, Clock clock, ApplicationEventPublisher events,
                          PlatformTransactionManager txManager) {
        this.personalVehicles = personalVehicles;
        this.bookings = bookings;
        this.hubs = hubs;
        this.slots = slots;
        this.ports = ports;
        this.props = props;
        this.clock = clock;
        this.events = events;
        this.tx = new TransactionTemplate(txManager);
    }

    // ===================== Xe cá nhân =====================

    /** Đăng ký xe cá nhân; biển số là duy nhất trên toàn hệ thống. */
    @Transactional
    public PersonalVehicle registerVehicle(Long ownerId, RegisterVehicleRequest req) {
        String plate = normalize(req.plateNumber());
        if (personalVehicles.existsByPlateNumber(plate)) {
            throw new BusinessException(ErrorCode.PLATE_NUMBER_TAKEN);
        }
        PersonalVehicle v = PersonalVehicle.register(ownerId, plate, normalize(req.type()),
                req.batteryKwh(), normalize(req.connectorType()));
        try {
            return personalVehicles.saveAndFlush(v);
        } catch (DataIntegrityViolationException ex) {
            // Hai người đăng ký cùng biển số cùng lúc: unique constraint trên DB chặn người sau.
            throw new BusinessException(ErrorCode.PLATE_NUMBER_TAKEN);
        }
    }

    @Transactional(readOnly = true)
    public List<PersonalVehicle> myVehicles(Long ownerId) {
        return personalVehicles.findByOwnerIdOrderByIdDesc(ownerId);
    }

    @Transactional
    public void deleteVehicle(Long ownerId, Long vehicleId) {
        PersonalVehicle v = personalVehicles.findByIdAndOwnerId(vehicleId, ownerId)
                .orElseThrow(() -> BusinessException.notFound("Xe cá nhân", vehicleId));
        if (bookings.existsByPersonalVehicleIdAndStatusIn(v.getId(), SlotBooking.Status.ACTIVE)) {
            throw new BusinessException(ErrorCode.VEHICLE_HAS_BOOKINGS);
        }
        // slot_booking tham chiếu khóa ngoại tới xe, nên xe đã có lịch sử thì không xóa cứng được.
        if (bookings.existsByPersonalVehicleId(v.getId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Xe đã có lịch sử đặt chỗ nên không thể xóa");
        }
        personalVehicles.delete(v);
    }

    // ===================== Đặt chỗ =====================

    /** PV01: đặt trước ô đỗ (kèm cổng sạc nếu CHARGE/BOTH) tại một Hub trong một khung giờ. */
    @Transactional
    public SlotBooking book(Long ownerId, BookRequest req) {
        PersonalVehicle vehicle = personalVehicles.findByIdAndOwnerId(req.personalVehicleId(), ownerId)
                .orElseThrow(() -> BusinessException.notFound("Xe cá nhân", req.personalVehicleId()));
        if (!hubs.existsById(req.hubId())) {
            throw BusinessException.notFound("Hub", req.hubId());
        }

        Instant start = req.startAt();
        Instant end = req.endAt();
        if (!end.isAfter(start)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Giờ kết thúc phải sau giờ bắt đầu");
        }
        if (start.isBefore(clock.instant().minus(props.booking().checkInGrace()))) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Giờ bắt đầu đã qua");
        }
        if (bookings.countVehicleOverlap(vehicle.getId(), SlotBooking.Status.ACTIVE, start, end) > 0) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Xe này đã có lịch đặt trùng khung giờ");
        }

        ParkingSlot slot = bookings.findFreeSlots(req.hubId(), ParkingSlot.Kind.PERSONAL, ResourceStatus.OUT_OF_ORDER,
                        SlotBooking.Status.ACTIVE, start, end)
                .stream().findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE));
        ChargingPort port = null;
        if (req.serviceType().needsPort()) {
            port = bookings.findFreePorts(req.hubId(), vehicle.getConnectorType(), ResourceStatus.OUT_OF_ORDER,
                            SlotBooking.Status.ACTIVE, start, end)
                    .stream().findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE,
                            "Không còn cổng sạc " + vehicle.getConnectorType() + " trống trong khung giờ này"));
        }

        SlotBooking booking = SlotBooking.book(ownerId, vehicle, slot, port, req.serviceType(), start, end);
        try {
            return bookings.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            // Hai người cùng đặt một ô cùng lúc: exclusion constraint ex_slot_no_overlap / ex_port_no_overlap
            // trong V1__init.sql chặn người đến sau.
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE);
        }
    }

    @Transactional(readOnly = true)
    public List<SlotBooking> myBookings(Long ownerId) {
        return bookings.findByOwnerIdOrderByStartAtDesc(ownerId);
    }

    /** PV03: quét QR tại Hub, chỉ hợp lệ trong khoảng giờ bắt đầu ± check-in-grace-minutes. */
    @Transactional
    public SlotBooking checkIn(Long ownerId, String qrToken) {
        SlotBooking b = bookings.findByQrTokenAndOwnerId(qrToken, ownerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECKIN_INVALID));
        Instant now = clock.instant();
        Duration grace = props.booking().checkInGrace();
        if (b.getStatus() != SlotBooking.Status.BOOKED
                || now.isBefore(b.getStartAt().minus(grace))
                || now.isAfter(b.getStartAt().plus(grace))) {
            throw new BusinessException(ErrorCode.CHECKIN_INVALID);
        }

        ParkingSlot slot = slots.findById(b.getSlotId()).orElseThrow();
        if (slot.getStatus() != ResourceStatus.AVAILABLE) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Ô đỗ đang có xe khác hoặc đang bảo trì");
        }
        slot.changeStatus(ResourceStatus.OCCUPIED);
        if (b.getPortId() != null) {
            ChargingPort port = ports.findById(b.getPortId()).orElseThrow();
            if (port.getStatus() != ResourceStatus.AVAILABLE) {
                throw new BusinessException(ErrorCode.PORT_IN_USE);
            }
            port.changeStatus(ResourceStatus.OCCUPIED);
        }

        b.checkIn();
        return b;
    }

    /** Rời Hub: trả ô đỗ và cổng sạc. Chưa tính tiền vì chưa có bảng giá và dữ liệu điện năng từ IoT. */
    @Transactional
    public SlotBooking checkOut(Long ownerId, Long bookingId) {
        SlotBooking b = ownedForUpdate(ownerId, bookingId);
        if (b.getStatus() != SlotBooking.Status.IN_USE) {
            throw new BusinessException(ErrorCode.CONFLICT, "Đơn chưa check-in hoặc đã kết thúc");
        }
        releaseResources(b);
        b.complete();
        return b;
    }

    @Transactional
    public SlotBooking cancel(Long ownerId, Long bookingId) {
        SlotBooking b = ownedForUpdate(ownerId, bookingId);
        if (b.getStatus() != SlotBooking.Status.BOOKED) {
            throw new BusinessException(ErrorCode.CONFLICT, "Chỉ hủy được đơn chưa check-in");
        }
        b.cancel();
        return b;
    }

    // ===================== Job chạy nền =====================

    /** Mỗi đơn chạy trong transaction riêng: một đơn lỗi không kéo các đơn khác rollback theo, lượt sau thử lại. */
    @Scheduled(fixedDelay = 60, timeUnit = TimeUnit.SECONDS)
    public void expireNoShows() {
        Instant cutoff = clock.instant().minus(props.booking().noShowDuration());
        for (Long id : bookings.findIdsStartedBefore(SlotBooking.Status.BOOKED, cutoff)) {
            try {
                tx.executeWithoutResult(t -> expireNoShow(id));
            } catch (RuntimeException ex) {
                log.warn("Không hủy được đơn no-show {}: {}", id, ex.getMessage());
            }
        }
    }

    /** PV01: quá no-show-minutes sau giờ bắt đầu mà chưa check-in thì nhả chỗ cho người khác. */
    private void expireNoShow(Long bookingId) {
        SlotBooking b = bookings.findByIdForUpdate(bookingId).orElse(null);
        Instant cutoff = clock.instant().minus(props.booking().noShowDuration());
        if (b == null || b.getStatus() != SlotBooking.Status.BOOKED || b.getStartAt().isAfter(cutoff)) {
            return;
        }
        b.expire();
        events.publishEvent(new UserNotification(b.getOwnerId(), "BOOKING_EXPIRED",
                "Đơn đặt chỗ đã bị hủy", "Bạn không check-in đúng giờ nên chỗ đỗ đã được nhả.",
                Map.of("bookingId", b.getId())));
    }

    // ===================== Hàm phụ =====================

    private SlotBooking ownedForUpdate(Long ownerId, Long bookingId) {
        return bookings.findByIdForUpdate(bookingId)
                .filter(b -> b.getOwnerId().equals(ownerId))
                .orElseThrow(() -> BusinessException.notFound("Đơn đặt chỗ", bookingId));
    }

    private void releaseResources(SlotBooking b) {
        slots.findById(b.getSlotId())
                .filter(s -> s.getStatus() == ResourceStatus.OCCUPIED)
                .ifPresent(s -> s.changeStatus(ResourceStatus.AVAILABLE));
        if (b.getPortId() != null) {
            ports.findById(b.getPortId())
                    .filter(p -> p.getStatus() == ResourceStatus.OCCUPIED)
                    .ifPresent(p -> p.changeStatus(ResourceStatus.AVAILABLE));
        }
    }

    private static String normalize(String s) {
        return s.trim().toUpperCase(Locale.ROOT);
    }
}
