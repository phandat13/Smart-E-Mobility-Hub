package vn.edu.hcmut.emobility.rebalance;

import java.util.List;
import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.account.AppUser;
import vn.edu.hcmut.emobility.account.AppUserRepository;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.hub.HubRepository;
import vn.edu.hcmut.emobility.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.rebalance.TransferDtos.*;

@Component
public class TransferMapper {

    private final TransferItemRepository items;
    private final VehicleRepository vehicles;
    private final HubRepository hubs;
    private final ParkingSlotRepository slots;
    private final DriverRepository drivers;
    private final AppUserRepository users;

    public TransferMapper(TransferItemRepository items, VehicleRepository vehicles, HubRepository hubs, ParkingSlotRepository slots,
                          DriverRepository drivers, AppUserRepository users) {
        this.items = items;
        this.vehicles = vehicles;
        this.hubs = hubs;
        this.slots = slots;
        this.drivers = drivers;
        this.users = users;
    }

    public OrderView view(TransferOrder o, String message) {
        List<TransferItem> list = items.findByOrderIdOrderById(o.getId());
        List<ItemView> iv = list.stream().map(i -> {
            Vehicle v = vehicles.findById(i.getVehicleId()).orElse(null);
            return new ItemView(i.getId(), i.getVehicleId(), v == null ? "?" : v.getCode(), v == null ? 0 : v.getBatteryPercent(), i.getStatus(),
                    i.getHeldSlotId() == null ? null : slots.findById(i.getHeldSlotId()).map(s -> s.getCode()).orElse(null),
                    hubName(i.getDeliveredHubId()), i.getLoadedAt(), i.getDeliveredAt(), i.getNote());
        }).toList();
        return new OrderView(o.getId(), o.getCode(), o.getSourceHubId(), hubName(o.getSourceHubId()), o.getTargetHubId(), hubName(o.getTargetHubId()),
                o.getDriverId(), driverName(o.getDriverId()), o.getStatus(),
                TransferStatusPolicy.count(list.stream().map(TransferItem::getStatus).toList()),
                o.getCreatedAt(), o.getStartedAt(), o.getCompletedAt(), o.getAlertId(), o.getRecommendationId(), o.getNote(), iv, message);
    }

    public String hubName(Long id) {
        return id == null ? null : hubs.findById(id).map(h -> h.getName()).orElse("?");
    }

    public String driverName(Long driverId) {
        if (driverId == null) return null;
        return drivers.findById(driverId).flatMap(d -> users.findById(d.getUserId())).map(AppUser::getFullName).orElse("?");
    }

    public DriverView driver(Driver d) {
        return new DriverView(d.getId(), d.getUserId(), users.findById(d.getUserId()).map(AppUser::getFullName).orElse("?"),
                d.getStatus().name(), d.getTruckPlate(), d.getCapacity());
    }
}
