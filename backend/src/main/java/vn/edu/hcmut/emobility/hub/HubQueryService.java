package vn.edu.hcmut.emobility.hub;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.HubDtos.*;

/** AC01: tìm kiếm & tra cứu tài nguyên Hub. */
@Service
public class HubQueryService {

    /** Chu kỳ làm mới gợi ý cho màn hình danh sách (góp ý #1: không dùng 5 phút). */
    public static final int REFRESH_SECONDS = 30;
    private static final Set<VehicleStatus> HIDDEN = Set.of(VehicleStatus.IN_USE, VehicleStatus.IN_TRANSIT, VehicleStatus.OUT_OF_SERVICE,
            VehicleStatus.RETURN_RECONCILING, VehicleStatus.UNLOCK_RECONCILING);

    private final HubRepository hubs;
    private final HubStatsService stats;
    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final Clock clock;

    public HubQueryService(HubRepository hubs, HubStatsService stats, VehicleRepository vehicles,
                           ParkingSlotRepository slots, ChargingPortRepository ports, Clock clock) {
        this.hubs = hubs;
        this.stats = stats;
        this.vehicles = vehicles;
        this.slots = slots;
        this.ports = ports;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public SearchResult search(String q, String area, Double lat, Double lng) {
        if (q != null && !q.isBlank() && !q.matches("^[\\p{L}\\p{N} ()\\-.,]{1,60}$")) {
            // E1: ký tự không hợp lệ → "Không tìm thấy"
            return new SearchResult(List.of(), suggestions(lat, lng), clock.instant(), REFRESH_SECONDS);
        }
        String nq = normalize(q);
        List<HubSummary> all = stats.all(true);
        List<HubSummary> items = all.stream()
                .filter(h -> area == null || area.isBlank() || "Tất cả".equals(area) || area.equalsIgnoreCase(h.area()))
                .filter(h -> nq.isEmpty() || normalize(h.name()).contains(nq) || normalize(h.code()).contains(nq)
                        || normalize(h.address()).contains(nq))
                .sorted(comparator(lat, lng))
                .toList();
        // E2: Hub không tồn tại → gợi ý Hub khả dụng gần nhất
        List<HubSummary> sugg = items.isEmpty() ? suggestions(lat, lng) : List.of();
        return new SearchResult(items, sugg, clock.instant(), REFRESH_SECONDS);
    }

    @Transactional(readOnly = true)
    public HubDetail detail(Long hubId) {
        HubSummary s = stats.one(hubId);
        List<HubVehicleView> vs = vehicles.findByHubIdOrderByBatteryPercentDesc(hubId).stream()
                .filter(v -> !HIDDEN.contains(v.getStatus()))
                .map(HubQueryService::view)
                .toList();
        return new HubDetail(s, vs);
    }

    @Transactional(readOnly = true)
    public List<SlotView> slots(Long hubId, SlotKind kind, Instant start, Instant end) {
        requireHub(hubId);
        Set<Long> free = start != null && end != null && end.isAfter(start)
                ? slots.freePersonalSlots(hubId, start, end).stream().map(ParkingSlot::getId).collect(Collectors.toSet())
                : null;
        List<ParkingSlot> list = kind == null ? slots.findByHubIdOrderByCode(hubId) : slots.findByHubIdAndKindOrderByCode(hubId, kind);
        var codes = vehicles.findAllById(list.stream().map(ParkingSlot::getVehicleId).filter(java.util.Objects::nonNull).toList())
                .stream().collect(Collectors.toMap(Vehicle::getId, Vehicle::getCode));
        return list.stream().map(s -> new SlotView(s.getId(), s.getCode(), s.getKind(), s.getStatus(), codes.get(s.getVehicleId()),
                free == null ? s.getStatus() == SlotStatus.AVAILABLE : free.contains(s.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public List<PortView> ports(Long hubId, String connector, Instant start, Instant end) {
        requireHub(hubId);
        Set<Long> free = start != null && end != null && end.isAfter(start) && connector != null
                ? ports.freePorts(hubId, connector, start, end).stream().map(ChargingPort::getId).collect(Collectors.toSet())
                : null;
        return ports.findByHubIdOrderByCode(hubId).stream()
                .map(p -> new PortView(p.getId(), p.getCode(), p.getPowerKw(), p.getConnectorType(), p.getStatus(), p.isDisableAfterSession(),
                        free == null ? p.getStatus() == PortStatus.AVAILABLE : free.contains(p.getId())))
                .toList();
    }

    public static HubVehicleView view(Vehicle v) {
        return new HubVehicleView(v.getId(), v.getCode(), v.getType().name(), v.getModel(), v.getBatteryPercent(), v.getRangeKm(), v.getStatus().name());
    }

    private void requireHub(Long id) {
        if (!hubs.existsById(id)) throw new BusinessException(ErrorCode.NOT_FOUND, "Hub không tồn tại");
    }

    private List<HubSummary> suggestions(Double lat, Double lng) {
        return stats.all(true).stream().filter(h -> h.availableVehicles() > 0).sorted(comparator(lat, lng)).limit(3).toList();
    }

    private static Comparator<HubSummary> comparator(Double lat, Double lng) {
        if (lat == null || lng == null) return Comparator.comparingLong(HubSummary::availableVehicles).reversed();
        return Comparator.comparingDouble(h -> distanceKm(lat, lng, h.latitude(), h.longitude()));
    }

    public static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371, dLat = Math.toRadians(lat2 - lat1), dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }

    static String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.toLowerCase().trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.replace('đ', 'd');
    }

    public Instant now() { return clock.instant(); }
}
