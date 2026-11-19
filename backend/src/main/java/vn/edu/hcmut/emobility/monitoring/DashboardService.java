package vn.edu.hcmut.emobility.monitoring;

import java.time.Clock;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.charging.ChargingSession;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.charging.SessionStatus;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.hub.HubDtos.HubSummary;
import vn.edu.hcmut.emobility.monitoring.DashboardDtos.*;
import vn.edu.hcmut.emobility.personal.BookingStatus;
import vn.edu.hcmut.emobility.personal.SlotBooking;
import vn.edu.hcmut.emobility.personal.SlotBookingRepository;

/** MO01 tổng quan mạng lưới, MO02 chi tiết một Hub. */
@Service
public class DashboardService {

    private final HubRepository hubs;
    private final HubStatsService stats;
    private final AlertService alerts;
    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final ChargingSessionRepository sessions;
    private final SlotBookingRepository bookings;
    private final AppProperties props;
    private final Clock clock;

    public DashboardService(HubRepository hubs, HubStatsService stats, AlertService alerts, VehicleRepository vehicles,
                            ParkingSlotRepository slots, ChargingPortRepository ports, ChargingSessionRepository sessions,
                            SlotBookingRepository bookings, AppProperties props, Clock clock) {
        this.hubs = hubs;
        this.stats = stats;
        this.alerts = alerts;
        this.vehicles = vehicles;
        this.slots = slots;
        this.ports = ports;
        this.sessions = sessions;
        this.bookings = bookings;
        this.props = props;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Overview overview() {
        Map<Long, HubStatsService.Counters> counters = stats.countersByHub();
        List<Alert> open = alerts.open();
        Map<Long, Long> alertsByHub = open.stream().filter(a -> a.getHubId() != null).collect(Collectors.groupingBy(Alert::getHubId, Collectors.counting()));
        List<HubRow> rows = new ArrayList<>();
        long inUse = 0, charging = 0, pending = 0, faulty = 0, available = 0, total = 0, other = 0, portsBusy = 0, portsTotal = 0, portsFaulty = 0;
        long over = 0, disconnected = 0, active = 0;
        int occSum = 0, occN = 0;
        for (Hub h : hubs.findAllByOrderByName()) {
            HubStatsService.Counters c = counters.getOrDefault(h.getId(), new HubStatsService.Counters());
            HubSummary s = stats.summary(h, c);
            int occ = c.sharedTotal == 0 ? 0 : (int) Math.round(100.0 * (c.sharedOccupied + c.sharedHeld) / c.sharedTotal);
            int portUse = c.portsTotal == 0 ? 0 : (int) Math.round(100.0 * c.portsBusy / c.portsTotal);
            String level = occ > props.hub().overloadThreshold() * 100 ? "HIGH" : occ >= 60 ? "MEDIUM" : "LOW";
            Map<String, Long> byStatus = new TreeMap<>();
            c.byStatus.forEach((k, v) -> byStatus.put(k.name(), v));
            boolean disc = h.isActive() && s.stale();
            rows.add(new HubRow(s, occ, portUse, level, alertsByHub.getOrDefault(h.getId(), 0L), disc, byStatus));
            if (h.isActive()) {
                active++;
                occSum += occ;
                occN++;
                if ("HIGH".equals(level)) over++;
                if (disc) disconnected++;
            }
            portsBusy += c.portsBusy;
            portsTotal += c.portsTotal;
            portsFaulty += c.portsFaulty;
        }
        for (Vehicle v : vehicles.findAll()) {
            if (v.getStatus() == VehicleStatus.OUT_OF_SERVICE) continue;
            total++;
            switch (v.getStatus()) {
                case AVAILABLE -> available++;
                case IN_USE, RESERVED, PICKUP_PENDING, UNLOCK_RECONCILING, RETURN_RECONCILING -> inUse++;
                case CHARGING -> charging++;
                case PENDING_CHECK, NEEDS_CHARGE -> pending++;
                case FAULTY, MAINTENANCE_LOCKED -> faulty++;
                default -> other++;
            }
        }
        Totals totals = new Totals(active, rows.size(), disconnected, total, available, inUse, charging, pending, faulty, other,
                occN == 0 ? 0 : occSum / occN, over, portsBusy, portsTotal, portsFaulty);
        return new Overview(totals, rows, open.stream().limit(30).map(this::alertView).toList(), clock.instant(), 30);
    }

    @Transactional(readOnly = true)
    public HubDetail hubDetail(Long hubId) {
        Hub h = hubs.findById(hubId).orElseThrow(() -> BusinessException.notFound("Hub", hubId));
        HubSummary s = stats.one(hubId);
        List<ParkingSlot> slotList = slots.findByHubIdOrderByCode(hubId);
        Map<Long, String> slotByVehicle = slotList.stream().filter(x -> x.getVehicleId() != null)
                .collect(Collectors.toMap(ParkingSlot::getVehicleId, ParkingSlot::getCode, (a, b) -> a));
        List<Vehicle> vs = vehicles.findByHubIdOrderByBatteryPercentDesc(hubId);
        Map<Long, String> codes = vehicles.findAllById(slotList.stream().map(ParkingSlot::getVehicleId).filter(Objects::nonNull).toList())
                .stream().collect(Collectors.toMap(Vehicle::getId, Vehicle::getCode));
        Set<BookingStatus> holding = Set.of(BookingStatus.IN_USE, BookingStatus.CHECKOUT_REQUESTED, BookingStatus.AWAITING_EXIT);
        List<SlotRow> sr = slotList.stream().map(x -> new SlotRow(x.getId(), x.getCode(), x.getKind().name(), x.getStatus().name(),
                codes.get(x.getVehicleId()), bookings.findBySlotIdAndStatusIn(x.getId(), holding).stream().findFirst().map(SlotBooking::getCode).orElse(null))).toList();
        List<PortRow> pr = ports.findByHubIdOrderByCode(hubId).stream().map(p -> {
            String what = sessions.findFirstByPortIdAndStatusIn(p.getId(), Set.of(SessionStatus.ACTIVE, SessionStatus.STARTING, SessionStatus.STOPPING))
                    .map(this::sessionLabel).orElse(null);
            return new PortRow(p.getId(), p.getCode(), p.getPowerKw(), p.getConnectorType(), p.getStatus().name(), p.isDisableAfterSession(), what, p.getErrorCode());
        }).toList();
        List<VehicleRow> vr = vs.stream().map(v -> new VehicleRow(v.getId(), v.getCode(), v.getType().name(), v.getModel(), v.getBatteryPercent(),
                v.getRangeKm(), v.getStatus().name(), slotByVehicle.get(v.getId()), v.getLockState().name(), v.getLastSeenAt(), v.getErrorCode(), v.getRating())).toList();
        return new HubDetail(s, vr, sr, pr, alerts.openForHub(hubId).stream().map(this::alertView).toList(), s.stale(), h.getLastSyncAt());
    }

    private String sessionLabel(ChargingSession s) {
        if (s.getVehicleId() != null) return "Xe " + vehicles.findById(s.getVehicleId()).map(Vehicle::getCode).orElse("?") + " (" + s.getStatus() + ")";
        if (s.getSlotBookingId() != null) return "Đặt chỗ " + bookings.findById(s.getSlotBookingId()).map(SlotBooking::getCode).orElse("?") + " (" + s.getStatus() + ")";
        return s.getStatus().name();
    }

    @Transactional(readOnly = true)
    public List<AlertView> alertList() {
        return alerts.open().stream().map(this::alertView).toList();
    }

    public AlertView alertView(Alert a) {
        String hubName = a.getHubId() == null ? null : hubs.findById(a.getHubId()).map(Hub::getName).orElse(null);
        return new AlertView(a.getId(), a.getType(), a.getHubId(), hubName, a.getResourceType(), a.getResourceId(), a.getSeverity(),
                a.getStatus(), a.getMessage(), a.getCreatedAt());
    }
}
