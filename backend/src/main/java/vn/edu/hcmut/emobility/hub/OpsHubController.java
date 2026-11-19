package vn.edu.hcmut.emobility.hub;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.hub.HubDtos.*;

/** MO03, MO04 */
@RestController
@RequestMapping("/api/v1/ops")
public class OpsHubController {

    private final HubAdminService admin;
    private final HubStatsService stats;
    private final HubQueryService query;

    public OpsHubController(HubAdminService admin, HubStatsService stats, HubQueryService query) {
        this.admin = admin;
        this.stats = stats;
        this.query = query;
    }

    @GetMapping("/hubs")
    public List<HubSummary> all() {
        return stats.all(false);
    }

    @PostMapping("/hubs")
    @ResponseStatus(HttpStatus.CREATED)
    public HubSummary create(@Valid @RequestBody HubRequest r) {
        return admin.create(CurrentUser.require().id(), r);
    }

    @PutMapping("/hubs/{id}")
    public HubSummary update(@PathVariable Long id, @Valid @RequestBody HubRequest r) {
        return admin.update(CurrentUser.require().id(), id, r);
    }

    @PostMapping("/hubs/{id}/deactivate")
    public HubSummary deactivate(@PathVariable Long id, @Valid @RequestBody DeactivateRequest r) {
        return admin.deactivate(CurrentUser.require().id(), id, r.reason());
    }

    @PostMapping("/hubs/{id}/activate")
    public HubSummary activate(@PathVariable Long id) {
        return admin.activate(CurrentUser.require().id(), id);
    }

    @GetMapping("/hubs/{id}/ports")
    public List<PortView> ports(@PathVariable Long id) {
        return query.ports(id, null, null, null);
    }

    @PostMapping("/hubs/{id}/ports")
    @ResponseStatus(HttpStatus.CREATED)
    public PortView addPort(@PathVariable Long id, @Valid @RequestBody PortRequest r) {
        return admin.addPort(CurrentUser.require().id(), id, r);
    }

    @PutMapping("/ports/{id}")
    public PortView updatePort(@PathVariable Long id, @Valid @RequestBody PortRequest r) {
        return admin.updatePort(CurrentUser.require().id(), id, r);
    }

    @PostMapping("/ports/{id}/status")
    public HubAdminService.PortChangeResult portStatus(@PathVariable Long id, @Valid @RequestBody PortStatusRequest r) {
        return admin.setPortStatus(CurrentUser.require().id(), id, r);
    }

    @DeleteMapping("/ports/{id}")
    public HubAdminService.PortChangeResult removePort(@PathVariable Long id) {
        return admin.removePort(CurrentUser.require().id(), id);
    }
}
