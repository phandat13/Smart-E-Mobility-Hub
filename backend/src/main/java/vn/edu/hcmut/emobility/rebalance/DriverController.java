package vn.edu.hcmut.emobility.rebalance;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.rebalance.TransferDtos.*;

/** RB02 (ứng dụng tài xế) */
@RestController
@RequestMapping("/api/v1/driver/orders")
public class DriverController {

    private final DriverTransferService service;

    public DriverController(DriverTransferService service) {
        this.service = service;
    }

    @GetMapping
    public List<OrderView> mine() {
        return service.myOrders(CurrentUser.require().id());
    }

    @PostMapping("/{id}/load")
    public OrderView load(@PathVariable Long id, @Valid @RequestBody ScanRequest r) {
        return service.scanLoad(CurrentUser.require().id(), id, r.vehicleCode());
    }

    @PostMapping("/{id}/start")
    public OrderView start(@PathVariable Long id) {
        return service.startTransport(CurrentUser.require().id(), id);
    }

    @PostMapping("/{id}/deliver")
    public OrderView deliver(@PathVariable Long id, @Valid @RequestBody ScanRequest r) {
        return service.deliver(CurrentUser.require().id(), id, r.vehicleCode());
    }

    @PostMapping("/{id}/broken")
    public OrderView broken(@PathVariable Long id, @Valid @RequestBody BrokenRequest r) {
        return service.reportBroken(CurrentUser.require().id(), id, r);
    }

    @PostMapping("/{id}/reroute")
    public OrderView reroute(@PathVariable Long id, @Valid @RequestBody RerouteRequest r) {
        return service.reroute(CurrentUser.require().id(), id, r);
    }
}
