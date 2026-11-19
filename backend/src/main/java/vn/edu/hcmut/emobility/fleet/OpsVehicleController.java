package vn.edu.hcmut.emobility.fleet;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.fleet.VehicleAdminService.*;

/** MO05 */
@RestController
@RequestMapping("/api/v1/ops/vehicles")
public class OpsVehicleController {

    private final VehicleAdminService service;

    public OpsVehicleController(VehicleAdminService service) {
        this.service = service;
    }

    @GetMapping
    public List<VehicleAdminView> list(@RequestParam(required = false) Long hubId, @RequestParam(required = false) VehicleStatus status,
                                       @RequestParam(required = false) VehicleType type) {
        return service.list(hubId, status, type);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleAdminView create(@Valid @RequestBody VehicleRequest r) {
        return service.create(CurrentUser.require().id(), r);
    }

    @PutMapping("/{id}")
    public VehicleAdminView update(@PathVariable Long id, @Valid @RequestBody VehicleUpdate r) {
        return service.update(CurrentUser.require().id(), id, r);
    }

    @PostMapping("/{id}/retire")
    public VehicleAdminView retire(@PathVariable Long id) {
        return service.retire(CurrentUser.require().id(), id);
    }
}
