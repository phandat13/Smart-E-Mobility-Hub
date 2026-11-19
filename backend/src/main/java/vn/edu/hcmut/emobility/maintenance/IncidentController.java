package vn.edu.hcmut.emobility.maintenance;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.AuthUser;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.core.security.Role;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.*;

/** MT01 (sinh viên, tài xế) */
@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {

    private final IncidentService service;

    public IncidentController(IncidentService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResult report(@Valid @RequestBody ReportRequest r) {
        AuthUser u = CurrentUser.require();
        return service.report(u.id(), r, u.is(Role.DRIVER) ? IncidentSource.DRIVER : IncidentSource.USER);
    }

    @GetMapping("/mine")
    public List<IncidentView> mine() {
        return service.mine(CurrentUser.require().id());
    }
}
