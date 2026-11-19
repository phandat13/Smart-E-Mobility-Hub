package vn.edu.hcmut.emobility.monitoring;

import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.monitoring.DashboardDtos.*;

/** MO01, MO02 + xử lý cảnh báo */
@RestController
@RequestMapping("/api/v1/ops")
public class DashboardController {

    private final DashboardService dashboard;
    private final AlertService alerts;

    public DashboardController(DashboardService dashboard, AlertService alerts) {
        this.dashboard = dashboard;
        this.alerts = alerts;
    }

    @GetMapping("/dashboard")
    public Overview overview() {
        return dashboard.overview();
    }

    @GetMapping("/hubs/{id}/detail")
    public HubDetail hubDetail(@PathVariable Long id) {
        return dashboard.hubDetail(id);
    }

    @GetMapping("/alerts")
    public List<AlertView> alerts() {
        return dashboard.alertList();
    }

    @PostMapping("/alerts/{id}/ack")
    @Transactional
    public AlertView ack(@PathVariable Long id) {
        return dashboard.alertView(alerts.acknowledge(id));
    }

    @PostMapping("/alerts/{id}/resolve")
    @Transactional
    public AlertView resolve(@PathVariable Long id) {
        return dashboard.alertView(alerts.resolve(id));
    }
}
