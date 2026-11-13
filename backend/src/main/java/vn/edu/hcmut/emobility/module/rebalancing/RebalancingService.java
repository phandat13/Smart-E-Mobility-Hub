package vn.edu.hcmut.emobility.module.rebalancing;

import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.common.PageResponse;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.event.UserNotification;
import vn.edu.hcmut.emobility.core.event.VehicleAvailabilityChanged;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.module.hub.Hub;
import vn.edu.hcmut.emobility.module.hub.HubRepository;
import vn.edu.hcmut.emobility.module.hub.Vehicle;
import vn.edu.hcmut.emobility.module.hub.VehicleRepository;
import vn.edu.hcmut.emobility.module.rebalancing.RebalancingDto.CreateTransferRequest;
import vn.edu.hcmut.emobility.module.rebalancing.RebalancingDto.TransferOrderResponse;

@Service
public class RebalancingService {

    /** Chỉ xe đang rảnh (hoặc rảnh nhưng cần sạc) mới được đem đi điều chuyển. */
    private static final Set<Vehicle.Status> MOVABLE = EnumSet.of(Vehicle.Status.AVAILABLE, Vehicle.Status.NEEDS_CHARGE);

    private final TransferOrderRepository orders;
    private final TransferItemRepository items;
    private final DriverRepository drivers;
    private final VehicleRepository vehicles;
    private final HubRepository hubs;
    private final AppProperties props;
    private final ApplicationEventPublisher events;

    public RebalancingService(TransferOrderRepository orders, TransferItemRepository items, DriverRepository drivers,
                              VehicleRepository vehicles, HubRepository hubs, AppProperties props,
                              ApplicationEventPublisher events) {
        this.orders = orders;
        this.items = items;
        this.drivers = drivers;
        this.vehicles = vehicles;
        this.hubs = hubs;
        this.props = props;
        this.events = events;
    }

    // ===================== Operator =====================

    /** Tạo lệnh điều chuyển, khóa xe ở Hub nguồn, giao ngay cho tài xế rảnh hoặc xếp hàng chờ. */
    @Transactional
    public TransferOrder create(CreateTransferRequest req) {
        if (req.sourceHubId().equals(req.targetHubId())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Hub nguồn và Hub đích phải khác nhau");
        }
        Hub source = hubs.findById(req.sourceHubId())
                .orElseThrow(() -> BusinessException.notFound("Hub nguồn", req.sourceHubId()));
        Hub target = hubs.findById(req.targetHubId())
                .orElseThrow(() -> BusinessException.notFound("Hub đích", req.targetHubId()));

        Set<Long> vehicleIds = new LinkedHashSet<>(req.vehicleIds());
        long afterTransfer = vehicles.countByHubId(target.getId())
                + items.countIncoming(target.getId(), TransferOrder.Status.ACTIVE, TransferItem.Status.MOVING)
                + vehicleIds.size();
        if (afterTransfer > target.getParkingCapacity()) {
            throw new BusinessException(ErrorCode.HUB_FULL, ErrorCode.HUB_FULL.getMessage(),
                    Map.of("capacity", target.getParkingCapacity(), "afterTransfer", afterTransfer));
        }

        TransferOrder order = orders.save(TransferOrder.create(source.getId(), target.getId(),
                req.alertId(), req.recommendationId()));
        for (Long vehicleId : vehicleIds) {
            Vehicle v = vehicles.findById(vehicleId)
                    .orElseThrow(() -> BusinessException.notFound("Phương tiện", vehicleId));
            if (!source.getId().equals(v.getHubId())) {
                throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE,
                        "Phương tiện " + v.getCode() + " không ở Hub nguồn");
            }
            if (v.getStatus().lockedByOperation()) {
                throw new BusinessException(ErrorCode.VEHICLE_HAS_OPERATION,
                        "Phương tiện " + v.getCode() + " đã thuộc lệnh điều chuyển hoặc bảo trì khác");
            }
            if (!MOVABLE.contains(v.getStatus())) {
                throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE,
                        "Phương tiện " + v.getCode() + " đang được đặt hoặc sử dụng");
            }
            // Khóa xe: RE01 sẽ từ chối sinh viên đặt xe này (VEHICLE_HAS_OPERATION).
            v.changeStatus(Vehicle.Status.TRANSFER_LOCKED);
            items.save(TransferItem.lock(order.getId(), v.getId()));
        }

        drivers.findFirstByStatusOrderByIdAsc(Driver.Status.FREE).ifPresent(d -> assign(order, d));
        events.publishEvent(new VehicleAvailabilityChanged(source.getId()));
        return order;
    }

    @Transactional(readOnly = true)
    public PageResponse<TransferOrderResponse> list(TransferOrder.Status status, Pageable pageable) {
        Page<TransferOrder> page = status == null ? orders.findAll(pageable) : orders.findByStatus(status, pageable);
        Map<Long, List<TransferItem>> itemsByOrder = items
                .findByOrderIdIn(page.getContent().stream().map(TransferOrder::getId).toList())
                .stream().collect(Collectors.groupingBy(TransferItem::getOrderId));
        return PageResponse.of(page, o -> TransferOrderResponse.of(o, itemsByOrder.getOrDefault(o.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public TransferOrderResponse get(Long orderId) {
        return view(orders.findById(orderId)
                .orElseThrow(() -> BusinessException.notFound("Lệnh điều chuyển", orderId)));
    }

    /** Gỡ 1 xe chưa chất lên khỏi lệnh; lệnh hết xe thì tự hủy. */
    @Transactional
    public TransferOrder removeItem(Long orderId, Long vehicleId) {
        TransferOrder order = lockActive(orderId);
        TransferItem item = items.findByOrderIdAndVehicleId(orderId, vehicleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_IN_ORDER));
        if (item.getStatus() == TransferItem.Status.LOADED) {
            throw new BusinessException(ErrorCode.CONFLICT, "Phương tiện đã được chất lên xe, không thể gỡ");
        }
        if (item.getStatus() != TransferItem.Status.LOCKED) {
            throw new BusinessException(ErrorCode.VEHICLE_NOT_IN_ORDER);
        }

        item.remove();
        vehicles.findById(vehicleId).ifPresent(this::release);
        events.publishEvent(new VehicleAvailabilityChanged(order.getSourceHubId()));

        boolean nothingLeft = items.findByOrderId(orderId).stream()
                .noneMatch(i -> TransferItem.Status.MOVING.contains(i.getStatus()));
        if (nothingLeft) {
            closeAsCancelled(order);
        }
        return order;
    }

    /** Hủy lệnh khi chưa chất xe nào; xe được mở khóa, tài xế được giải phóng. */
    @Transactional
    public TransferOrder cancel(Long orderId) {
        TransferOrder order = lockActive(orderId);
        List<TransferItem> list = items.findByOrderId(orderId);
        if (list.stream().anyMatch(i -> i.getStatus() == TransferItem.Status.LOADED)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Lệnh đang chở xe, không thể hủy");
        }
        for (TransferItem i : list) {
            if (i.getStatus() == TransferItem.Status.LOCKED) {
                i.remove();
                vehicles.findById(i.getVehicleId()).ifPresent(this::release);
            }
        }
        closeAsCancelled(order);
        events.publishEvent(new VehicleAvailabilityChanged(order.getSourceHubId()));
        return order;
    }

    // ===================== Tài xế =====================

    @Transactional(readOnly = true)
    public Optional<TransferOrder> currentForDriver(Long userId) {
        return orders.findFirstByDriverIdAndStatusIn(driverOf(userId).getId(), TransferOrder.Status.ON_ROAD);
    }

    /** Tài xế quét từng xe tại Hub nguồn để chất lên. Quét lại xe đã chất thì bỏ qua. */
    @Transactional
    public TransferOrder load(Long userId, Long orderId, Long vehicleId) {
        TransferOrder order = lockOwnOrder(userId, orderId);
        TransferItem item = items.findByOrderIdAndVehicleId(orderId, vehicleId)
                .filter(i -> TransferItem.Status.MOVING.contains(i.getStatus()))
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_IN_ORDER));
        if (item.getStatus() == TransferItem.Status.LOCKED) {
            item.load();
            vehicles.findById(vehicleId).ifPresent(v -> v.changeHub(null));
            order.start();
            events.publishEvent(new VehicleAvailabilityChanged(order.getSourceHubId()));
        }
        return order;
    }

    /** Tới Hub đích: xe đã chất được giao, xe chưa chất được mở khóa ở Hub nguồn, tài xế nhận lệnh kế tiếp. */
    @Transactional
    public TransferOrder complete(Long userId, Long orderId) {
        TransferOrder order = lockOwnOrder(userId, orderId);
        List<TransferItem> list = items.findByOrderId(orderId);
        if (list.stream().noneMatch(i -> i.getStatus() == TransferItem.Status.LOADED)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Chưa chất phương tiện nào lên xe");
        }

        for (TransferItem i : list) {
            Vehicle v = vehicles.findById(i.getVehicleId()).orElseThrow();
            switch (i.getStatus()) {
                case LOADED -> {
                    i.deliver();
                    v.changeHub(order.getTargetHubId());
                    release(v);
                }
                case LOCKED -> {
                    i.remove();
                    release(v);
                }
                default -> { }
            }
        }

        order.complete();
        releaseDriver(order.getDriverId());
        events.publishEvent(new VehicleAvailabilityChanged(order.getSourceHubId()));
        events.publishEvent(new VehicleAvailabilityChanged(order.getTargetHubId()));
        return order;
    }

    // ===================== Hàm phụ =====================

    public TransferOrderResponse view(TransferOrder order) {
        return TransferOrderResponse.of(order, items.findByOrderId(order.getId()));
    }

    private void assign(TransferOrder order, Driver driver) {
        order.assignTo(driver.getId());
        driver.busy();
        events.publishEvent(new UserNotification(driver.getUserId(), "TRANSFER_ASSIGNED",
                "Có lệnh điều chuyển mới", "Lệnh " + order.getCode() + ": Hub " + order.getSourceHubId()
                + " → Hub " + order.getTargetHubId(), Map.of("orderId", order.getId())));
    }

    /** Tài xế xong việc: nhận luôn lệnh đang chờ lâu nhất, không có thì về FREE. */
    private void releaseDriver(Long driverId) {
        Driver driver = drivers.findById(driverId).orElseThrow();
        orders.findFirstByStatusOrderByIdAsc(TransferOrder.Status.PENDING)
                .ifPresentOrElse(next -> assign(next, driver), driver::free);
    }

    private void closeAsCancelled(TransferOrder order) {
        order.cancel();
        if (order.getDriverId() != null) {
            releaseDriver(order.getDriverId());
        }
    }

    private void release(Vehicle v) {
        v.release(props.vehicle().minBatteryPercent());
    }

    private TransferOrder lockActive(Long orderId) {
        TransferOrder order = orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> BusinessException.notFound("Lệnh điều chuyển", orderId));
        if (!TransferOrder.Status.ACTIVE.contains(order.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Lệnh đã kết thúc");
        }
        return order;
    }

    private TransferOrder lockOwnOrder(Long userId, Long orderId) {
        Driver driver = driverOf(userId);
        TransferOrder order = orders.findByIdForUpdate(orderId)
                .filter(o -> driver.getId().equals(o.getDriverId()))
                .orElseThrow(() -> BusinessException.notFound("Lệnh điều chuyển", orderId));
        if (!TransferOrder.Status.ON_ROAD.contains(order.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Lệnh không còn hiệu lực");
        }
        return order;
    }

    private Driver driverOf(Long userId) {
        return drivers.findByUserId(userId)
                .orElseThrow(() -> BusinessException.notFound("Hồ sơ tài xế của tài khoản", userId));
    }
}
