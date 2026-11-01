package vn.edu.hcmut.emobility.rebalancing;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;

/** Quyền DRIVER được SecurityConfig áp cho toàn bộ /api/v1/driver/**. */
@RestController
@RequestMapping("/api/v1/driver/transfers")
public class DriverTransferController {

    private final TransferService service;

    public DriverTransferController(TransferService service) {
        this.service = service;
    }

    /** Lệnh tài xế đang chạy; 204 nếu đang rảnh. */
    @GetMapping("/current")
    public ResponseEntity<TransferOrderResponse> current() {
        return service.currentForDriver(CurrentUser.require().id())
                .map(o -> ResponseEntity.ok(service.view(o)))
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/{id}/load")
    public TransferOrderResponse load(@PathVariable Long id, @Valid @RequestBody LoadVehicleRequest req) {
        return service.view(service.load(CurrentUser.require().id(), id, req.vehicleId()));
    }

    @PostMapping("/{id}/complete")
    public TransferOrderResponse complete(@PathVariable Long id) {
        return service.view(service.complete(CurrentUser.require().id(), id));
    }
}
