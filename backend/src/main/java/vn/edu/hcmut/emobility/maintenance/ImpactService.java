package vn.edu.hcmut.emobility.maintenance;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.charging.ChargingScheduleItem;
import vn.edu.hcmut.emobility.charging.ChargingScheduleItemRepository;
import vn.edu.hcmut.emobility.charging.ScheduleItemStatus;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.ImpactReport;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;
import vn.edu.hcmut.emobility.personal.*;
import vn.edu.hcmut.emobility.rental.Reservation;
import vn.edu.hcmut.emobility.rental.ReservationRepository;
import vn.edu.hcmut.emobility.rental.ReservationStatus;

/**
 * Góp ý #15: khi một xe hoặc cổng sạc chuyển sang lỗi/bảo trì, tìm các đơn đặt xe, đặt chỗ sạc và lịch sạc
 * đang phụ thuộc vào tài nguyên đó → chuyển sang tài nguyên khác nếu được, nếu không thì hủy phần bị ảnh hưởng
 * và thông báo cho người dùng / Đơn vị vận hành.
 */
@Service
public class ImpactService {

    private static final Set<ScheduleItemStatus> PLANNED = Set.of(ScheduleItemStatus.SCHEDULED);

    private final ReservationRepository reservations;
    private final VehicleRepository vehicles;
    private final ChargingPortRepository ports;
    private final PortReservationRepository portReservations;
    private final PortReservationService portService;
    private final SlotBookingRepository bookings;
    private final PersonalVehicleRepository personalVehicles;
    private final ChargingScheduleItemRepository items;
    private final NotificationService notifications;
    private final AlertService alerts;
    private final AppProperties props;
    private final Clock clock;

    public ImpactService(ReservationRepository reservations, VehicleRepository vehicles, ChargingPortRepository ports,
                         PortReservationRepository portReservations, PortReservationService portService, SlotBookingRepository bookings,
                         PersonalVehicleRepository personalVehicles, ChargingScheduleItemRepository items,
                         NotificationService notifications, AlertService alerts, AppProperties props, Clock clock) {
        this.reservations = reservations;
        this.vehicles = vehicles;
        this.ports = ports;
        this.portReservations = portReservations;
        this.portService = portService;
        this.bookings = bookings;
        this.personalVehicles = personalVehicles;
        this.items = items;
        this.notifications = notifications;
        this.alerts = alerts;
        this.props = props;
        this.clock = clock;
    }

    /** Gọi trong giao dịch đã chuyển xe sang FAULTY/MAINTENANCE_LOCKED. */
    @Transactional(propagation = Propagation.MANDATORY)
    public ImpactReport onVehicleUnavailable(Vehicle faulty, String reason) {
        List<String> details = new ArrayList<>();
        int reassigned = 0, cancelled = 0;
        Instant now = clock.instant();
        Optional<Reservation> open = reservations.findFirstByVehicleIdAndStatusInOrderByIdDesc(faulty.getId(), Set.of(ReservationStatus.RESERVED));
        if (open.isPresent()) {
            Reservation r = reservations.lockById(open.get().getId()).orElseThrow();
            if (r.getStatus() == ReservationStatus.RESERVED && r.getVehicleId().equals(faulty.getId())) {
                Vehicle alt = findAlternative(faulty);
                if (alt != null) {
                    alt.setStatus(VehicleStatus.RESERVED);
                    r.reassignVehicle(alt.getId());
                    reassigned++;
                    details.add("Đơn " + r.getCode() + ": chuyển từ " + faulty.getCode() + " sang " + alt.getCode());
                    notifications.notify(r.getStudentId(), "RESERVATION_REASSIGNED", "Đơn đặt xe đã được chuyển xe",
                            "Xe " + faulty.getCode() + " gặp sự cố (" + reason + "). Đơn " + r.getCode() + " đã chuyển sang xe "
                                    + alt.getCode() + ", thời hạn giữ chỗ giữ nguyên.");
                } else {
                    r.close(ReservationStatus.CANCELLED, "RESOURCE_FAULT", now);
                    cancelled++;
                    details.add("Đơn " + r.getCode() + ": không còn xe thay thế, đã hủy");
                    notifications.notify(r.getStudentId(), "RESERVATION_CANCELLED", "Đơn đặt xe bị hủy do sự cố",
                            "Xe " + faulty.getCode() + " gặp sự cố và Hub không còn xe thay thế. Đơn " + r.getCode()
                                    + " đã được hủy, bạn không bị tính phí. Vui lòng chọn Hub lân cận.");
                }
            }
        }
        int resched = 0;
        for (ChargingScheduleItem it : items.findByVehicleIdAndStatusIn(faulty.getId(), PLANNED)) {
            it.setStatus(ScheduleItemStatus.CANCELLED);
            portService.release(PortReservationSource.SCHEDULE_ITEM, it.getId(), PortReservationStatus.CANCELLED);
            resched++;
            details.add("Lịch sạc #" + it.getId() + " của " + faulty.getCode() + ": đã hủy");
        }
        return new ImpactReport(reassigned, cancelled + resched, 0, 0, details);
    }

    /** Gọi trong giao dịch đã chuyển cổng sang FAULTY/MAINTENANCE/DISABLED. */
    @Transactional(propagation = Propagation.MANDATORY)
    public ImpactReport onPortUnavailable(ChargingPort port, String reason) {
        List<String> details = new ArrayList<>();
        int moved = 0, cancelled = 0, needs = 0;
        Instant now = clock.instant();
        for (PortReservation pr : portReservations.activeFrom(port.getId(), now)) {
            Optional<ChargingPort> alt = portService.alternative(port.getHubId(), port.getConnectorType(), pr.getStartAt(), pr.getEndAt(), port.getId());
            if (pr.getSourceType() == PortReservationSource.BOOKING) {
                SlotBooking b = bookings.lockById(pr.getSourceId()).orElse(null);
                if (b == null || !b.getStatus().holdsResources()) continue;
                if (alt.isPresent() && b.getStatus() == BookingStatus.BOOKED) {
                    portService.move(pr, alt.get().getId(), pr.getStartAt(), pr.getEndAt());
                    b.movePort(alt.get().getId());
                    moved++;
                    details.add("Đặt chỗ " + b.getCode() + ": chuyển sang cổng " + alt.get().getCode());
                    notifications.notify(b.getOwnerId(), "BOOKING_PORT_CHANGED", "Cổng sạc đã được thay đổi",
                            "Cổng " + port.getCode() + " tạm ngưng (" + reason + "). Lịch sạc " + b.getCode() + " đã chuyển sang cổng "
                                    + alt.get().getCode() + ", khung giờ giữ nguyên.");
                } else {
                    if (b.getStatus() != BookingStatus.BOOKED) {
                        // Phiên đang diễn ra: không tự ý cắt cam kết, chỉ ghi chú + báo người dùng và vận hành
                        b.setNote("Cổng " + port.getCode() + " báo " + reason + " trong lúc sử dụng – nhân viên sẽ hỗ trợ");
                        notifications.notify(b.getOwnerId(), "BOOKING_PORT_ISSUE", "Cổng sạc gặp sự cố",
                                "Cổng " + port.getCode() + " gặp sự cố trong phiên " + b.getCode() + ". Nhân viên tại Hub sẽ hỗ trợ bạn.");
                        details.add("Đặt chỗ " + b.getCode() + ": đang sử dụng – đã thông báo");
                        continue;
                    }
                    pr.setStatus(PortReservationStatus.CANCELLED);
                    if (b.getServiceType() == ServiceType.CHARGE) {
                        b.setStatus(BookingStatus.CANCELLED);
                        b.setNote("Hủy do cổng sạc " + port.getCode() + " ngưng hoạt động");
                    } else {
                        b.dropCharging("Phần sạc bị hủy do cổng " + port.getCode() + " ngưng hoạt động");
                    }
                    cancelled++;
                    details.add("Đặt chỗ " + b.getCode() + ": không còn cổng thay thế, hủy phần sạc");
                    notifications.notify(b.getOwnerId(), "BOOKING_CHARGING_CANCELLED", "Lịch sạc bị hủy",
                            "Cổng " + port.getCode() + " tạm ngưng và không còn cổng tương thích trống. Phần sạc của " + b.getCode()
                                    + " đã được hủy" + (b.getSlotId() != null ? ", chỗ đỗ vẫn được giữ." : "."));
                }
            } else {
                ChargingScheduleItem it = items.lockById(pr.getSourceId()).orElse(null);
                if (it == null || it.getStatus() != ScheduleItemStatus.SCHEDULED) continue;
                if (alt.isPresent()) {
                    portService.move(pr, alt.get().getId(), pr.getStartAt(), pr.getEndAt());
                    it.move(alt.get().getId(), pr.getStartAt(), pr.getEndAt());
                    moved++;
                    details.add("Lịch sạc #" + it.getId() + ": chuyển sang cổng " + alt.get().getCode());
                } else {
                    pr.setStatus(PortReservationStatus.CANCELLED);
                    it.setStatus(ScheduleItemStatus.NEEDS_RESCHEDULE);
                    needs++;
                    details.add("Lịch sạc #" + it.getId() + ": cần lập lại lịch");
                }
            }
        }
        if (needs > 0) {
            alerts.raise(AlertType.CHARGING_CONFLICT, port.getHubId(), "PORT", port.getId(), AlertSeverity.WARNING,
                    needs + " mục lịch sạc tại cổng " + port.getCode() + " cần lập lại lịch (cổng ngưng hoạt động)");
        }
        return new ImpactReport(0, cancelled, moved, needs, details);
    }

    private Vehicle findAlternative(Vehicle faulty) {
        short min = (short) props.vehicle().minBatteryPercent();
        for (Long candId : vehicles.alternativeIds(faulty.getHubId(), min, faulty.getId(), org.springframework.data.domain.PageRequest.of(0, 5))) {
            Vehicle locked = vehicles.lockById(candId).orElse(null);
            if (locked != null && locked.getStatus() == VehicleStatus.AVAILABLE && locked.getBatteryPercent() >= min && locked.getErrorCode() == null) {
                return locked;
            }
        }
        return null;
    }

    public String vehicleLabel(Long personalVehicleId) {
        return personalVehicles.findById(personalVehicleId).map(PersonalVehicle::getPlateNumber).orElse("?");
    }
}
