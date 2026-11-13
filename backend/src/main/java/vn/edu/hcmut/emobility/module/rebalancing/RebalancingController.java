package vn.edu.hcmut.emobility.module.rebalancing;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.common.PageResponse;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.module.rebalancing.RebalancingDto.CreateTransferRequest;
import vn.edu.hcmut.emobility.module.rebalancing.RebalancingDto.LoadVehicleRequest;
import vn.edu.hcmut.emobility.module.rebalancing.RebalancingDto.TransferOrderResponse;

/**
 * Không cần @PreAuthorize: SecurityConfig đã chỉ cho OPERATOR vào /api/v1/ops/**
 * và chỉ cho DRIVER vào /api/v1/driver/**.
 */
@RestController
@RequestMapping("/api/v1")
public class RebalancingController {

    private final RebalancingService service;

    public RebalancingController(RebalancingService service) {
        this.service = service;
    }

    // ---------- Operator ----------

    /** 201 nếu đã có tài xế nhận; 202 (NO_FREE_DRIVER) nếu lệnh đang xếp hàng chờ. */
    @PostMapping("/ops/transfers")
    public ResponseEntity<TransferOrderResponse> create(@Valid @RequestBody CreateTransferRequest req) {
        TransferOrder order = service.create(req);
        HttpStatus status = order.getStatus() == TransferOrder.Status.ASSIGNED
                ? HttpStatus.CREATED
                : ErrorCode.NO_FREE_DRIVER.getStatus();
        return ResponseEntity.status(status).body(service.view(order));
    }

    @GetMapping("/ops/transfers")
    public PageResponse<TransferOrderResponse> list(
            @RequestParam(required = false) TransferOrder.Status status,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.list(status, pageable);
    }

    @GetMapping("/ops/transfers/{id}")
    public TransferOrderResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/ops/transfers/{id}/items/{vehicleId}/remove")
    public TransferOrderResponse removeItem(@PathVariable Long id, @PathVariable Long vehicleId) {
        return service.view(service.removeItem(id, vehicleId));
    }

    @PostMapping("/ops/transfers/{id}/cancel")
    public TransferOrderResponse cancel(@PathVariable Long id) {
        return service.view(service.cancel(id));
    }

    // ---------- Tài xế ----------

    /** Lệnh tài xế đang chạy; 204 nếu đang rảnh. */
    @GetMapping("/driver/transfers/current")
    public ResponseEntity<TransferOrderResponse> current() {
        return service.currentForDriver(CurrentUser.require().id())
                .map(o -> ResponseEntity.ok(service.view(o)))
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/driver/transfers/{id}/load")
    public TransferOrderResponse load(@PathVariable Long id, @Valid @RequestBody LoadVehicleRequest req) {
        return service.view(service.load(CurrentUser.require().id(), id, req.vehicleId()));
    }

    @PostMapping("/driver/transfers/{id}/complete")
    public TransferOrderResponse complete(@PathVariable Long id) {
        return service.view(service.complete(CurrentUser.require().id(), id));
    }
}
