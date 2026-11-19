package vn.edu.hcmut.emobility.maintenance;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.*;

/** MT02, MT03 (Đơn vị vận hành) */
@RestController
@RequestMapping("/api/v1/ops")
public class OpsMaintenanceController {

    private final IncidentService incidents;
    private final MaintenanceService maintenance;

    public OpsMaintenanceController(IncidentService incidents, MaintenanceService maintenance) {
        this.incidents = incidents;
        this.maintenance = maintenance;
    }

    @GetMapping("/incidents")
    public List<IncidentView> queue(@RequestParam(defaultValue = "true") boolean openOnly) {
        return incidents.queue(openOnly);
    }

    @GetMapping("/incidents/{id}")
    public IncidentView incident(@PathVariable Long id) {
        return incidents.get(id);
    }

    @PostMapping("/incidents/{id}/assign")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderView assign(@PathVariable Long id, @Valid @RequestBody AssignRequest r) {
        return maintenance.assignIncident(CurrentUser.require().id(), id, r);
    }

    @PostMapping("/incidents/{id}/close")
    public IncidentView close(@PathVariable Long id) {
        return maintenance.closeIncident(CurrentUser.require().id(), id);
    }

    @GetMapping("/maintenance-orders")
    public List<OrderView> orders() {
        return maintenance.list();
    }

    @PostMapping("/maintenance-orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderView create(@Valid @RequestBody MaintenanceOrderRequest r) {
        return maintenance.createOrder(CurrentUser.require().id(), r);
    }

    @GetMapping("/technicians")
    public List<TechnicianView> technicians() {
        return maintenance.technicians();
    }
}
