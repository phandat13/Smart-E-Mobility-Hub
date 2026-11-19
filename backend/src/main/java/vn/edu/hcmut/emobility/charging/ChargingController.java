package vn.edu.hcmut.emobility.charging;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.charging.ChargingDtos.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;

/** SC01, SC02 */
@RestController
@RequestMapping("/api/v1/ops/charging")
public class ChargingController {

    private final SmartChargingService service;
    private final ChargingSessionService sessions;

    public ChargingController(SmartChargingService service, ChargingSessionService sessions) {
        this.service = service;
        this.sessions = sessions;
    }

    @GetMapping("/schedules")
    public List<ScheduleView> list() {
        return service.list();
    }

    @GetMapping("/schedules/{id}")
    public ScheduleView get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleView generate(@Valid @RequestBody GenerateRequest r) {
        return service.generate(CurrentUser.require().id(), r);
    }

    @PostMapping("/schedules/{id}/confirm")
    public ScheduleView confirm(@PathVariable Long id) {
        return service.confirm(CurrentUser.require().id(), id);
    }

    @PostMapping("/schedules/{id}/discard")
    public ScheduleView discard(@PathVariable Long id) {
        return service.discard(CurrentUser.require().id(), id);
    }

    @PostMapping("/items/{id}/validate")
    public AdjustCheck validate(@PathVariable Long id, @RequestBody AdjustRequest r) {
        return service.validate(id, r);
    }

    @PutMapping("/items/{id}")
    public ScheduleView adjust(@PathVariable Long id, @RequestBody AdjustRequest r) {
        return service.adjust(CurrentUser.require().id(), id, r);
    }

    @PostMapping("/sessions/{id}/stop")
    public boolean stop(@PathVariable Long id) {
        return sessions.stopFleetSession(id, "Đơn vị vận hành dừng");
    }
}
