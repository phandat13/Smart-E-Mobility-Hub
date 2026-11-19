package vn.edu.hcmut.emobility.fleet;

import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.maintenance.ImpactService;

/** MO05: quản lý danh mục phương tiện dùng chung. */
@Service
public class VehicleAdminService {

    public record VehicleRequest(@NotNull VehicleType type, @Size(max = 50) String model,
                                 @NotNull @DecimalMin(value = "0.1", message = "Dung lượng pin phải lớn hơn 0") @DecimalMax("10") Double batteryCapacityKwh,
                                 @NotNull Long hubId) {}

    public record VehicleUpdate(@NotNull VehicleType type, @Size(max = 50) String model,
                                @NotNull @DecimalMin(value = "0.1", message = "Dung lượng pin phải lớn hơn 0") @DecimalMax("10") Double batteryCapacityKwh) {}

    public record VehicleAdminView(Long id, String code, VehicleType type, String model, Long hubId, String hubName, String slotCode,
                                   VehicleStatus status, int batteryPercent, double batteryCapacityKwh, double rangeKm, String errorCode,
                                   Double rating, double odometerKm) {}

    private final VehicleRepository vehicles;
    private final HubRepository hubs;
    private final ParkingSlotRepository slots;
    private final HubStatsService stats;
    private final ImpactService impact;
    private final FleetEvents events;
    private final AuditService audit;

    public VehicleAdminService(VehicleRepository vehicles, HubRepository hubs, ParkingSlotRepository slots, HubStatsService stats,
                               ImpactService impact, FleetEvents events, AuditService audit) {
        this.vehicles = vehicles;
        this.hubs = hubs;
        this.slots = slots;
        this.stats = stats;
        this.impact = impact;
        this.events = events;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<VehicleAdminView> list(Long hubId, VehicleStatus status, VehicleType type) {
        Map<Long, String> hubNames = new HashMap<>();
        hubs.findAll().forEach(h -> hubNames.put(h.getId(), h.getName()));
        return vehicles.findAllByOrderByCode().stream()
                .filter(v -> hubId == null || hubId.equals(v.getHubId()))
                .filter(v -> status == null || status == v.getStatus())
                .filter(v -> type == null || type == v.getType())
                .map(v -> view(v, hubNames.get(v.getHubId()))).toList();
    }

    /** Thêm xe: kiểm tra Hub còn chỗ (E1 gợi ý Hub lân cận), mã tự sinh, trạng thái Chờ kiểm tra. */
    @Transactional
    public VehicleAdminView create(Long operatorId, VehicleRequest r) {
        Hub hub = hubs.findById(r.hubId()).orElseThrow(() -> BusinessException.notFound("Hub", r.hubId()));
        if (!hub.isActive()) throw new BusinessException(ErrorCode.HUB_INACTIVE);
        List<ParkingSlot> free = slots.lockFreeSharedSlots(hub.getId(), 1);
        if (free.isEmpty()) {
            List<String> nearby = stats.all(true).stream().filter(h -> h.freeSharedSlots() > 0 && !h.id().equals(hub.getId()))
                    .sorted(Comparator.comparingDouble(h -> HubQueryService.distanceKm(hub.getLatitude(), hub.getLongitude(), h.latitude(), h.longitude())))
                    .limit(3).map(h -> h.name() + " (" + h.freeSharedSlots() + " chỗ)").toList();
            throw new BusinessException(ErrorCode.HUB_FULL, "Hub hết chỗ đỗ. Gợi ý: " + String.join(", ", nearby), Map.of("suggestions", nearby));
        }
        String code = nextCode();
        Vehicle v = vehicles.saveAndFlush(new Vehicle(code, r.type(), r.model(), hub.getId(), 100, r.batteryCapacityKwh(),
                r.type() == VehicleType.E_SCOOTER ? 62 : 40));
        free.get(0).occupy(v.getId());
        audit.record(operatorId, "VEHICLE_ADD", "VEHICLE", v.getId(), Map.of("code", code, "hub", hub.getCode()));
        events.hubChanged(hub.getId());
        return view(v, hub.getName());
    }

    @Transactional
    public VehicleAdminView update(Long operatorId, Long id, VehicleUpdate r) {
        Vehicle v = vehicles.lockById(id).orElseThrow(() -> BusinessException.notFound("Xe", id));
        v.setSpec(r.type(), r.model(), r.batteryCapacityKwh());
        audit.record(operatorId, "VEHICLE_UPDATE", "VEHICLE", id, null);
        return view(v, hubs.findById(v.getHubId() == null ? -1L : v.getHubId()).map(Hub::getName).orElse(null));
    }

    /** E2: xe đang được đặt trước hoặc trong chuyến đi → từ chối. */
    @Transactional
    public VehicleAdminView retire(Long operatorId, Long id) {
        Vehicle v = vehicles.lockById(id).orElseThrow(() -> BusinessException.notFound("Xe", id));
        if (v.getStatus().inCustomerUse() || v.getStatus() == VehicleStatus.TRANSFER_LOCKED || v.getStatus() == VehicleStatus.IN_TRANSIT) {
            throw new BusinessException(ErrorCode.VEHICLE_IN_SERVICE, "Xe " + v.getCode() + " đang " + v.getStatus() + " – xử lý dứt điểm trước khi ngưng vận hành");
        }
        v.setStatus(VehicleStatus.OUT_OF_SERVICE);
        impact.onVehicleUnavailable(v, "ngưng vận hành");
        audit.record(operatorId, "VEHICLE_RETIRE", "VEHICLE", id, null);
        events.hubChanged(v.getHubId());
        return view(v, hubs.findById(v.getHubId() == null ? -1L : v.getHubId()).map(Hub::getName).orElse(null));
    }

    private String nextCode() {
        int max = vehicles.findAllByOrderByCode().stream().map(Vehicle::getCode).filter(c -> c.matches("UG-\\d+"))
                .mapToInt(c -> Integer.parseInt(c.substring(3))).max().orElse(0);
        return String.format("UG-%03d", max + 1);
    }

    private VehicleAdminView view(Vehicle v, String hubName) {
        String slot = slots.findByVehicleId(v.getId()).map(ParkingSlot::getCode).orElse(null);
        return new VehicleAdminView(v.getId(), v.getCode(), v.getType(), v.getModel(), v.getHubId(), hubName, slot, v.getStatus(),
                v.getBatteryPercent(), v.getBatteryCapacityKwh(), v.getRangeKm(), v.getErrorCode(), v.getRating(), v.getOdometerKm());
    }
}
