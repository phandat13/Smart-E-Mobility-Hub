package vn.edu.hcmut.emobility.personal;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Set;
import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.charging.ChargingSession;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.core.payment.PaymentSimulator;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.hub.HubRepository;
import vn.edu.hcmut.emobility.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.personal.PersonalDtos.BookingView;
import vn.edu.hcmut.emobility.personal.PersonalDtos.SessionView;

@Component
public class BookingMapper {

    private final HubRepository hubs;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final PersonalVehicleRepository vehicles;
    private final ChargingSessionRepository sessions;
    private final PaymentSimulator payment;

    public BookingMapper(HubRepository hubs, ParkingSlotRepository slots, ChargingPortRepository ports, PersonalVehicleRepository vehicles,
                         ChargingSessionRepository sessions, PaymentSimulator payment) {
        this.hubs = hubs;
        this.slots = slots;
        this.ports = ports;
        this.vehicles = vehicles;
        this.sessions = sessions;
        this.payment = payment;
    }

    public BookingView view(SlotBooking b, String message) {
        ChargingPort p = b.getPortId() == null ? null : ports.findById(b.getPortId()).orElse(null);
        ChargingSession s = sessions.findFirstBySlotBookingIdOrderByIdDesc(b.getId()).orElse(null);
        SessionView sv = s == null ? null : new SessionView(s.getId(), s.getStatus().name(), s.getStartedAt(), s.getEndedAt(), Math.round(s.getEnergyKwh() * 100) / 100.0);
        return new BookingView(b.getId(), b.getCode(), b.getStatus(), b.getServiceType(), b.getHubId(),
                hubs.findById(b.getHubId()).map(h -> h.getName()).orElse("?"),
                b.getSlotId(), b.getSlotId() == null ? null : slots.findById(b.getSlotId()).map(x -> x.getCode()).orElse(null),
                b.getPortId(), p == null ? null : p.getCode(), p == null ? null : p.getPowerKw(),
                b.getPersonalVehicleId(), vehicles.findById(b.getPersonalVehicleId()).map(PersonalVehicle::getPlateNumber).orElse("?"),
                b.getStartAt(), b.getEndAt(), Set.of(BookingStatus.BOOKED, BookingStatus.IN_USE, BookingStatus.CHECKOUT_REQUESTED,
                BookingStatus.AWAITING_EXIT).contains(b.getStatus()) ? b.getQrToken() : null,
                b.getCheckedInAt(), b.getChargingStoppedAt(), b.getVehicleLeftAt(), b.getEnergyKwh(), b.getCost(),
                estimate(b.getServiceType(), Duration.between(b.getStartAt(), b.getEndAt()).toMinutes(), p == null ? 0 : p.getPowerKw(),
                        vehicles.findById(b.getPersonalVehicleId()).map(PersonalVehicle::getBatteryKwh).orElse(1.0)),
                b.getNote(), sv, message);
    }

    /** Ước tính chi phí: đỗ theo giờ + điện năng dự kiến (không vượt dung lượng pin). */
    public BigDecimal estimate(ServiceType type, long minutes, double powerKw, double batteryKwh) {
        BigDecimal cost = BigDecimal.ZERO;
        if (type != ServiceType.CHARGE) cost = cost.add(payment.parkingCost(minutes));
        if (type != ServiceType.PARK) cost = cost.add(payment.chargingCost(Math.min(batteryKwh * 0.8, powerKw * minutes / 60.0 * 0.9)));
        return cost;
    }
}
