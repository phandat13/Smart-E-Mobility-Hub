package vn.edu.hcmut.emobility.personal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.personal.PersonalDtos.*;

/** PV01 đặt chỗ đỗ / lịch sạc, PV04 gia hạn, hủy, tiến trình nền no-show. */
@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final SlotBookingRepository bookings;
    private final BookingExtensionRepository extensions;
    private final PersonalVehicleService vehicleService;
    private final PortReservationService portService;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final HubRepository hubs;
    private final BookingMapper mapper;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public BookingService(SlotBookingRepository bookings, BookingExtensionRepository extensions, PersonalVehicleService vehicleService,
                          PortReservationService portService, ParkingSlotRepository slots, ChargingPortRepository ports, HubRepository hubs,
                          BookingMapper mapper, NotificationService notifications, AuditService audit, TxRunner tx, AppProperties props, Clock clock) {
        this.bookings = bookings;
        this.extensions = extensions;
        this.vehicleService = vehicleService;
        this.portService = portService;
        this.slots = slots;
        this.ports = ports;
        this.hubs = hubs;
        this.mapper = mapper;
        this.notifications = notifications;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public QuoteResult quote(Long ownerId, QuoteRequest r) {
        Hub hub = validate(ownerId, r.hubId(), r.personalVehicleId(), r.startAt(), r.endAt());
        PersonalVehicle pv = vehicleService.owned(ownerId, r.personalVehicleId());
        List<SlotOption> freeSlots = r.serviceType() == ServiceType.CHARGE ? List.of()
                : slots.freePersonalSlots(hub.getId(), r.startAt(), r.endAt()).stream().map(s -> new SlotOption(s.getId(), s.getCode())).toList();
        List<PortOption> freePorts = r.serviceType() == ServiceType.PARK ? List.of()
                : ports.freePorts(hub.getId(), pv.getConnectorType(), r.startAt(), r.endAt()).stream()
                .map(p -> new PortOption(p.getId(), p.getCode(), p.getPowerKw(), p.getConnectorType())).toList();
        if (r.serviceType() != ServiceType.CHARGE && freeSlots.isEmpty()) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Hub không còn chỗ đỗ trống trong khung giờ này");
        }
        if (r.serviceType() != ServiceType.PARK && freePorts.isEmpty()) {
            throw new BusinessException(ErrorCode.CONNECTOR_INCOMPATIBLE, "Không còn cổng sạc " + pv.getConnectorType() + " trống trong khung giờ này");
        }
        long minutes = Duration.between(r.startAt(), r.endAt()).toMinutes();
        double power = freePorts.isEmpty() ? 0 : freePorts.get(0).powerKw();
        long total = slots.countByHubIdAndKind(hub.getId(), SlotKind.PERSONAL);
        String demand = total == 0 ? "—" : freeSlots.size() * 3 < total ? "Cao" : freeSlots.size() * 3 < total * 2 ? "Trung bình" : "Thấp";
        return new QuoteResult(hub.getName(), r.serviceType(), r.startAt(), r.endAt(), freeSlots, freePorts,
                freeSlots.isEmpty() ? null : freeSlots.get(0).id(), freePorts.isEmpty() ? null : freePorts.get(0).id(),
                mapper.estimate(r.serviceType(), minutes, power, pv.getBatteryKwh()), demand, clock.instant());
    }

    /**
     * PV01 bước 6 – góp ý #7: với "Cả hai", giữ ĐỒNG THỜI chỗ đỗ và cổng sạc trong cùng giao dịch:
     * khóa ô → kiểm tra lần cuối → khóa cổng → kiểm tra lần cuối → ghi đơn + cam kết cổng.
     * Bất kỳ bước nào thất bại → rollback toàn bộ, không có tài nguyên nào bị giữ dở dang.
     */
    @Transactional
    public BookingView confirm(Long ownerId, ConfirmRequest r) {
        Hub hub = validate(ownerId, r.hubId(), r.personalVehicleId(), r.startAt(), r.endAt());
        PersonalVehicle pv = vehicleService.owned(ownerId, r.personalVehicleId());
        Long slotId = null, portId = null;
        if (r.serviceType() != ServiceType.CHARGE) {
            slotId = r.slotId() != null ? r.slotId()
                    : slots.freePersonalSlotIds(hub.getId(), r.startAt(), r.endAt()).stream().findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Hub không còn chỗ đỗ trống trong khung giờ này"));
            ParkingSlot s = slots.lockById(slotId).orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE));
            if (!s.getHubId().equals(hub.getId()) || s.getKind() != SlotKind.PERSONAL
                    || s.getStatus() == SlotStatus.FAULTY || s.getStatus() == SlotStatus.DISABLED
                    || bookings.slotOverlaps(slotId, -1L, r.startAt(), r.endAt())) {
                throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Ô đỗ " + s.getCode() + " vừa được người khác giữ, không có tài nguyên nào bị giữ");
            }
        }
        if (r.serviceType() != ServiceType.PARK) {
            portId = r.portId() != null ? r.portId()
                    : ports.freePortIds(hub.getId(), pv.getConnectorType(), r.startAt(), r.endAt(), -1L).stream().findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Không còn cổng sạc tương thích trống – không có tài nguyên nào bị giữ"));
            ChargingPort p = ports.lockById(portId).orElseThrow(() -> new BusinessException(ErrorCode.SLOT_UNAVAILABLE));
            if (!p.getHubId().equals(hub.getId()) || !p.getConnectorType().equals(pv.getConnectorType())) {
                throw new BusinessException(ErrorCode.CONNECTOR_INCOMPATIBLE);
            }
        }
        Instant now = clock.instant();
        String code = Codes.next("BK", now);
        SlotBooking b = bookings.saveAndFlush(new SlotBooking(code, ownerId, pv.getId(), hub.getId(), slotId, portId, r.serviceType(),
                r.startAt(), r.endAt(), "BK:" + code + ":" + Codes.token(12)));
        if (portId != null) {
            // Ném SLOT_UNAVAILABLE nếu cổng vừa bị giữ → rollback cả đơn lẫn chỗ đỗ
            portService.reserve(portId, r.startAt(), r.endAt(), PortReservationSource.BOOKING, b.getId());
        }
        audit.record(ownerId, "BOOKING_CONFIRM", "BOOKING", b.getId(), Map.of("service", r.serviceType().name()));
        notifications.notify(ownerId, "BOOKING_CONFIRMED", "Đặt chỗ thành công",
                "Mã " + code + " tại " + hub.getName() + ". Vui lòng check-in trong vòng " + props.booking().checkInGraceMinutes() + " phút từ giờ hẹn.");
        return mapper.view(b, "Đặt chỗ thành công – đã giữ " + (slotId != null && portId != null ? "chỗ đỗ và cổng sạc" : slotId != null ? "chỗ đỗ" : "cổng sạc"));
    }

    private Hub validate(Long ownerId, Long hubId, Long vehicleId, Instant start, Instant end) {
        Instant now = clock.instant();
        if (start == null || end == null || !end.isAfter(start)) throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Khung thời gian không hợp lệ");
        if (start.isBefore(now.minusSeconds(300))) throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Giờ bắt đầu đã qua");
        long minutes = Duration.between(start, end).toMinutes();
        if (minutes < 30 || minutes > 12 * 60) throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Thời lượng đặt từ 30 phút đến 12 giờ");
        Hub hub = hubs.findById(hubId).orElseThrow(() -> BusinessException.notFound("Hub", hubId));
        if (!hub.isActive()) throw new BusinessException(ErrorCode.HUB_INACTIVE);
        vehicleService.owned(ownerId, vehicleId);
        return hub;
    }

    @Transactional(readOnly = true)
    public List<BookingView> list(Long ownerId) {
        return bookings.findByOwnerIdOrderByIdDesc(ownerId).stream().map(b -> mapper.view(b, null)).toList();
    }

    @Transactional(readOnly = true)
    public BookingView get(Long ownerId, Long id) {
        return mapper.view(owned(ownerId, bookings.findById(id).orElse(null), id), null);
    }

    @Transactional
    public BookingView cancel(Long ownerId, Long id) {
        SlotBooking b = owned(ownerId, bookings.lockById(id).orElse(null), id);
        if (b.getStatus() != BookingStatus.BOOKED) throw new BusinessException(ErrorCode.BOOKING_NOT_ACTIVE, "Chỉ hủy được đơn chưa check-in");
        b.setStatus(BookingStatus.CANCELLED);
        portService.release(PortReservationSource.BOOKING, b.getId(), PortReservationStatus.CANCELLED);
        audit.record(ownerId, "BOOKING_CANCEL", "BOOKING", id, null);
        return mapper.view(b, "Đã hủy đặt chỗ");
    }

    /** PV04 bước 1–3: kiểm tra khung giờ tiếp giáp, hiển thị giờ kết thúc mới + chi phí ước tính. */
    @Transactional(readOnly = true)
    public ExtendQuote extendQuote(Long ownerId, Long id, int minutes) {
        SlotBooking b = owned(ownerId, bookings.findById(id).orElse(null), id);
        Instant newEnd = b.getEndAt().plusSeconds(minutes * 60L);
        String reason = extensionConflict(b, newEnd);
        double power = b.getPortId() == null ? 0 : ports.findById(b.getPortId()).map(ChargingPort::getPowerKw).orElse(0.0);
        return new ExtendQuote(minutes, b.getEndAt(), newEnd, reason == null, reason,
                mapper.estimate(b.getServiceType(), minutes, power, 2.0));
    }

    /** PV04 bước 5: kiểm tra lại lần cuối + cập nhật trong cùng giao dịch; idempotent theo requestId. */
    @Transactional
    public BookingView extend(Long ownerId, Long id, int minutes, String requestId) {
        if (requestId == null || requestId.isBlank()) throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Thiếu Idempotency-Key");
        SlotBooking b = owned(ownerId, bookings.lockById(id).orElse(null), id);
        if (extensions.findByBookingIdAndRequestId(id, requestId).isPresent()) return mapper.view(b, "Yêu cầu gia hạn đã được xử lý trước đó");
        if (b.getStatus() != BookingStatus.IN_USE) throw new BusinessException(ErrorCode.BOOKING_NOT_ACTIVE, "Chỉ gia hạn được phiên đang sử dụng");
        if (Duration.between(clock.instant(), b.getEndAt()).toMinutes() < props.booking().minExtendBeforeEndMinutes()) {
            throw new BusinessException(ErrorCode.EXTEND_TOO_LATE);
        }
        Instant newEnd = b.getEndAt().plusSeconds(minutes * 60L);
        String reason = extensionConflict(b, newEnd);
        if (reason != null) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, reason + ". Vui lòng di chuyển xe đúng giờ để không ảnh hưởng lượt đặt kế tiếp");
        }
        Instant old = b.getEndAt();
        b.extendTo(newEnd);
        if (b.getPortId() != null) {
            portService.active(PortReservationSource.BOOKING, b.getId())
                    .ifPresent(pr -> portService.move(pr, pr.getPortId(), pr.getStartAt(), newEnd));
        }
        bookings.flush();
        extensions.save(new BookingExtension(id, requestId, old, newEnd));
        notifications.notify(ownerId, "BOOKING_EXTENDED", "Gia hạn thành công", "Phiên " + b.getCode() + " được kéo dài đến " + newEnd);
        return mapper.view(b, "Gia hạn thành công");
    }

    private String extensionConflict(SlotBooking b, Instant newEnd) {
        if (b.getSlotId() != null && bookings.slotOverlaps(b.getSlotId(), b.getId(), b.getEndAt(), newEnd)) {
            return "Ô đỗ đã có người đặt ở khung giờ kế tiếp";
        }
        if (b.getPortId() != null) {
            Long selfId = portService.active(PortReservationSource.BOOKING, b.getId()).map(PortReservation::getId).orElse(-1L);
            if (!portService.conflicts(b.getPortId(), b.getEndAt(), newEnd, selfId).isEmpty()) {
                return "Cổng sạc đã có lịch kế tiếp";
            }
        }
        return null;
    }

    /** Mục 2.3: không check-in trong 15 phút từ giờ hẹn → EXPIRED, giải phóng cam kết cổng, ghi vi phạm. */
    public int expireNoShows() {
        Instant cutoff = clock.instant().minusSeconds(props.booking().noShowMinutes() * 60L);
        int n = 0;
        for (Long id : tx.inNewTx(() -> bookings.findNoShow(cutoff))) {
            try {
                Boolean done = tx.inNewTx(() -> {
                    SlotBooking b = bookings.lockById(id).orElse(null);
                    if (b == null || b.getStatus() != BookingStatus.BOOKED || !b.getStartAt().isBefore(cutoff)) return false;
                    b.setStatus(BookingStatus.EXPIRED);
                    portService.release(PortReservationSource.BOOKING, b.getId(), PortReservationStatus.RELEASED);
                    audit.record(b.getOwnerId(), "NO_SHOW_VIOLATION", "BOOKING", b.getId(), null);
                    notifications.notify(b.getOwnerId(), "BOOKING_EXPIRED", "Đặt chỗ đã hết hạn",
                            "Bạn chưa check-in " + b.getCode() + " trong " + props.booking().noShowMinutes() + " phút từ giờ hẹn; tài nguyên đã được giải phóng.");
                    return true;
                });
                if (Boolean.TRUE.equals(done)) n++;
            } catch (RuntimeException e) {
                log.warn("Không hết hạn được đặt chỗ {}: {}", id, e.getMessage());
            }
        }
        return n;
    }

    static SlotBooking owned(Long ownerId, SlotBooking b, Long id) {
        if (b == null || (ownerId != null && !b.getOwnerId().equals(ownerId))) throw BusinessException.notFound("Đặt chỗ", id);
        return b;
    }
}
