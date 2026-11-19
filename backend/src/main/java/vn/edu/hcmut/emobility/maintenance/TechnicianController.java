package vn.edu.hcmut.emobility.maintenance;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.*;

/** MT04, MT05 (ứng dụng kỹ thuật viên) */
@RestController
@RequestMapping("/api/v1/tech")
public class TechnicianController {

    private final MaintenanceService service;

    public TechnicianController(MaintenanceService service) {
        this.service = service;
    }

    @GetMapping("/orders")
    public List<OrderView> mine() {
        return service.mine(CurrentUser.require().id());
    }

    @PutMapping("/tickets/{id}")
    public TicketView fill(@PathVariable Long id, @Valid @RequestBody TicketFillRequest r) {
        return service.fillTicket(CurrentUser.require().id(), id, r);
    }

    @GetMapping("/tickets/{id}/precheck")
    public Map<String, Object> precheck(@PathVariable Long id) {
        return service.precheck(CurrentUser.require().id(), id);
    }

    @PostMapping("/tickets/{id}/progress")
    public ProgressResult progress(@PathVariable Long id, @Valid @RequestBody ProgressRequest r) {
        return service.updateProgress(CurrentUser.require().id(), id, r);
    }
}
