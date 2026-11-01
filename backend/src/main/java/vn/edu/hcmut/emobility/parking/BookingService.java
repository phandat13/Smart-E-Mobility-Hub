package vn.edu.hcmut.emobility.parking;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.event.UserNotification;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.hub.HubRepository;
import vn.edu.hcmut.emobility.hub.ParkingSlot;
import vn.edu.hcmut.emobility.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.hub.ResourceStatus;
import vn.edu.hcmut.emobility.hub.SlotKind;

@Service
public class BookingService {

    private final SlotBookingRepository bookings;
    private final PersonalVehicleRepository personalVehicles;
    private final HubRepository hubs;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final AppProperties props;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public BookingService(SlotBookingRepository bookings, PersonalVehicleRepository personalVehicles,
                          HubRepository hubs, ParkingSlotRepository slots, ChargingPortRepository ports,
                          AppProperties props, Clock clock, ApplicationEventPublisher events) {
        this.bookings = bookings;
        this.personalVehicles = personalVehicles;
        this.hubs = hubs;
        this.slots = slots;
        this.ports = ports;
        this.props = props;
        this.clock = clock;
        this.events = events;
    }

    /** PV01: đặt trước ô đỗ (kèm cổng sạc nếu CHARGE/BOTH) tại một Hub trong một khung giờ. */
    @Transactional
    public SlotBooking book(Long ownerId, CreateBookingRequest req) {
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
        if (bookings.countVehicleOverlap(vehicle.getId(), BookingStatus.ACTIVE, start, end) > 0) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Xe này đã có lịch đặt trùng khung giờ");
        }

        ParkingSlot slot = bookings.findFreeSlots(req.hubId(), SlotKind.PERSONAL, ResourceStatus.OUT_OF_ORDER,
                        BookingStatus.ACTIVE, start, end)
                .stream().findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE));
        ChargingPort port = null;
        if (req.serviceType().needsPort()) {
            port = bookings.findFreePorts(req.hubId(), vehicle.getConnectorType(), ResourceStatus.OUT_OF_ORDER,
                            BookingStatus.ACTIVE, start, end)
                    .stream().findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE,
                            "Không còn cổng sạc " + vehicle.getConnectorType() + " trống trong khung giờ này"));
        }

        SlotBooking booking = SlotBooking.book(ownerId, vehicle, slot, port, req.serviceType(), start, end,
                UUID.randomUUID().toString());
        try {
            return bookings.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            // Hai người cùng đặt một ô cùng lúc: exclusion constraint ex_slot_no_overlap / ex_port_no_overlap
            // trong V1__init.sql chặn người đến sau.
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE);
        }
    }

    @Transactional(readOnly = true)
    public List<SlotBooking> mine(Long ownerId) {
        return bookings.findByOwnerIdOrderByStartAtDesc(ownerId);
    }

    /** PV03: quét QR tại Hub, chỉ hợp lệ trong khoảng giờ bắt đầu ± check-in-grace-minutes. */
    @Transactional
    public SlotBooking checkIn(Long ownerId, String qrToken) {
        SlotBooking b = bookings.findByQrTokenAndOwnerId(qrToken, ownerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECKIN_INVALID));
        Instant now = clock.instant();
        Duration grace = props.booking().checkInGrace();
        if (b.getStatus() != BookingStatus.BOOKED
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
        if (b.getStatus() != BookingStatus.IN_USE) {
            throw new BusinessException(ErrorCode.CONFLICT, "Đơn chưa check-in hoặc đã kết thúc");
        }
        releaseResources(b);
        b.complete();
        return b;
    }

    @Transactional
    public SlotBooking cancel(Long ownerId, Long bookingId) {
        SlotBooking b = ownedForUpdate(ownerId, bookingId);
        if (b.getStatus() != BookingStatus.BOOKED) {
            throw new BusinessException(ErrorCode.CONFLICT, "Chỉ hủy được đơn chưa check-in");
        }
        b.cancel();
        return b;
    }

    @Transactional(readOnly = true)
    public List<Long> findNoShowIds() {
        return bookings.findIdsStartedBefore(BookingStatus.BOOKED,
                clock.instant().minus(props.booking().noShowDuration()));
    }

    /** PV01: quá no-show-minutes sau giờ bắt đầu mà chưa check-in thì nhả chỗ cho người khác. */
    @Transactional
    public void expireNoShow(Long bookingId) {
        SlotBooking b = bookings.findByIdForUpdate(bookingId).orElse(null);
        Instant cutoff = clock.instant().minus(props.booking().noShowDuration());
        if (b == null || b.getStatus() != BookingStatus.BOOKED || b.getStartAt().isAfter(cutoff)) {
            return;
        }
        b.expire();
        events.publishEvent(new UserNotification(b.getOwnerId(), "BOOKING_EXPIRED",
                "Đơn đặt chỗ đã bị hủy", "Bạn không check-in đúng giờ nên chỗ đỗ đã được nhả.",
                Map.of("bookingId", b.getId())));
    }

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
}
