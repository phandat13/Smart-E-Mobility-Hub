package vn.edu.hcmut.emobility.monitoring;

import java.util.*;
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.fleet.FleetEvents;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.maintenance.ImpactService;

/**
 * Mục 2.3 – các tiến trình nền phát hiện bất thường: quá tải (>90% hoặc ≤1 cổng trống), mất cân đối xe giữa Hub,
 * xe/thiết bị lỗi (chuyển Báo lỗi + xử lý đơn phụ thuộc), Hub mất kết nối.
 */
@Service
public class AlertDetectionService {

    private static final Set<VehicleStatus> ERROR_FLAGGABLE = Set.of(VehicleStatus.AVAILABLE, VehicleStatus.PENDING_CHECK,
            VehicleStatus.NEEDS_CHARGE, VehicleStatus.RESERVED);

    private final HubRepository hubs;
    private final HubStatsService stats;
    private final VehicleRepository vehicles;
    private final ChargingPortRepository ports;
    private final AlertService alerts;
    private final ImpactService impact;
    private final FleetEvents events;
    private final TxRunner tx;
    private final AppProperties props;

    public AlertDetectionService(HubRepository hubs, HubStatsService stats, VehicleRepository vehicles, ChargingPortRepository ports,
                                 AlertService alerts, ImpactService impact, FleetEvents events, TxRunner tx, AppProperties props) {
        this.hubs = hubs;
        this.stats = stats;
        this.vehicles = vehicles;
        this.ports = ports;
        this.alerts = alerts;
        this.impact = impact;
        this.events = events;
        this.tx = tx;
        this.props = props;
    }

    public void detectHubConditions() {
        tx.runInNewTx(() -> {
            Map<Long, HubStatsService.Counters> c = stats.countersByHub();
            List<Hub> active = hubs.findByStatusOrderByName(HubStatus.ACTIVE);
            java.time.Instant now = java.time.Instant.now();
            Map<Long, Double> ratio = new LinkedHashMap<>();
            for (Hub h : active) {
                HubStatsService.Counters k = c.getOrDefault(h.getId(), new HubStatsService.Counters());
                double occ = k.sharedTotal == 0 ? 0 : (double) (k.sharedOccupied + k.sharedHeld) / k.sharedTotal;
                boolean overload = occ > props.hub().overloadThreshold() || (k.portsTotal > 0 && k.portsFree <= 1);
                if (overload) {
                    alerts.raise(AlertType.OVERLOAD, h.getId(), null, null, AlertSeverity.WARNING,
                            "Quá tải " + h.getName() + ": lấp đầy " + Math.round(occ * 100) + "% chỗ đỗ, còn " + k.portsFree + "/" + k.portsTotal + " cổng sạc trống");
                } else {
                    alerts.resolveIfOpen(AlertType.OVERLOAD, h.getId(), null, null);
                }
                if (stats.isStale(h, now)) {
                    alerts.raise(AlertType.OFFLINE, h.getId(), null, null, AlertSeverity.CRITICAL,
                            "Mất kết nối " + h.getName() + " – cập nhật gần nhất " + (h.getLastSyncAt() == null ? "chưa có" : h.getLastSyncAt().toString()));
                } else {
                    alerts.resolveIfOpen(AlertType.OFFLINE, h.getId(), null, null);
                }
                if (k.sharedTotal > 0) ratio.put(h.getId(), (double) k.available / k.sharedTotal);
            }
            if (ratio.isEmpty()) return;
            double mean = ratio.values().stream().mapToDouble(Double::doubleValue).average().orElse(0);
            double thr = props.hub().imbalanceThreshold();
            Map<Long, Hub> byId = new HashMap<>();
            active.forEach(h -> byId.put(h.getId(), h));
            Optional<Map.Entry<Long, Double>> donor = ratio.entrySet().stream().filter(e -> e.getValue() - mean > thr / 2)
                    .max(Map.Entry.comparingByValue());
            for (Map.Entry<Long, Double> e : ratio.entrySet()) {
                HubStatsService.Counters k = c.get(e.getKey());
                if (mean - e.getValue() > thr) {
                    long missing = Math.max(1, Math.round((mean - e.getValue()) * k.sharedTotal));
                    String src = donor.map(d -> byId.get(d.getKey()).getName() + " (thừa " + Math.round((d.getValue() - mean) * c.get(d.getKey()).sharedTotal) + ")")
                            .orElse("Hub lân cận");
                    alerts.raise(AlertType.IMBALANCE, e.getKey(), null, null, AlertSeverity.WARNING,
                            "Mất cân đối: " + byId.get(e.getKey()).getName() + " thiếu ~" + missing + " xe so với trung bình mạng lưới; gợi ý điều chuyển từ " + src);
                } else {
                    alerts.resolveIfOpen(AlertType.IMBALANCE, e.getKey(), null, null);
                }
            }
        });
    }

    /** Thiết bị gửi mã lỗi → chuyển Báo lỗi, ngừng cho đặt/thuê, xử lý đơn/lịch phụ thuộc (góp ý #15), sinh cảnh báo. */
    public int detectDeviceErrors() {
        int n = 0;
        List<Long> vids = tx.inNewTx(() -> vehicles.findByStatusIn(ERROR_FLAGGABLE).stream().filter(v -> v.getErrorCode() != null).map(Vehicle::getId).toList());
        for (Long id : vids) {
            tx.runInNewTx(() -> vehicles.lockById(id).ifPresent(v -> {
                if (v.getErrorCode() == null || !ERROR_FLAGGABLE.contains(v.getStatus())) return;
                v.setStatus(VehicleStatus.FAULTY);
                var rep = impact.onVehicleUnavailable(v, "lỗi thiết bị " + v.getErrorCode());
                alerts.raise(AlertType.DEVICE_ERROR, v.getHubId(), "VEHICLE", v.getId(), AlertSeverity.WARNING,
                        "Xe " + v.getCode() + " báo lỗi " + v.getErrorCode() + (rep.details().isEmpty() ? "" : " – " + String.join("; ", rep.details())));
                events.hubChanged(v.getHubId());
            }));
            n++;
        }
        List<Long> pids = tx.inNewTx(() -> ports.findByStatus(PortStatus.AVAILABLE).stream().filter(p -> p.getErrorCode() != null).map(ChargingPort::getId).toList());
        for (Long id : pids) {
            tx.runInNewTx(() -> ports.lockById(id).ifPresent(p -> {
                if (p.getErrorCode() == null || p.getStatus() != PortStatus.AVAILABLE) return;
                p.setStatus(PortStatus.FAULTY);
                var rep = impact.onPortUnavailable(p, "lỗi thiết bị " + p.getErrorCode());
                alerts.raise(AlertType.DEVICE_ERROR, p.getHubId(), "PORT", p.getId(), AlertSeverity.WARNING,
                        "Cổng " + p.getCode() + " báo lỗi " + p.getErrorCode() + " – chuyển " + rep.moved() + ", hủy " + rep.cancelled() + " cam kết phụ thuộc");
                events.hubChanged(p.getHubId());
            }));
            n++;
        }
        return n;
    }
}
