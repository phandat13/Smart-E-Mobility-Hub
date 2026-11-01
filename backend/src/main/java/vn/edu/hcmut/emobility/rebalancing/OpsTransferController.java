package vn.edu.hcmut.emobility.rebalancing;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.common.PageResponse;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;

/** Quyền OPERATOR được SecurityConfig áp cho toàn bộ /api/v1/ops/**. */
@RestController
@RequestMapping("/api/v1/ops/transfers")
public class OpsTransferController {

    private final TransferService service;

    public OpsTransferController(TransferService service) {
        this.service = service;
    }

    /** 201 nếu đã có tài xế nhận; 202 (NO_FREE_DRIVER) nếu lệnh đang xếp hàng chờ. */
    @PostMapping
    public ResponseEntity<TransferOrderResponse> create(@Valid @RequestBody CreateTransferRequest req) {
        TransferOrder order = service.create(req);
        HttpStatus status = order.getStatus() == TransferOrderStatus.ASSIGNED
                ? HttpStatus.CREATED
                : ErrorCode.NO_FREE_DRIVER.getStatus();
        return ResponseEntity.status(status).body(service.view(order));
    }

    @GetMapping
    public PageResponse<TransferOrderResponse> list(
            @RequestParam(required = false) TransferOrderStatus status,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.list(status, pageable);
    }

    @GetMapping("/{id}")
    public TransferOrderResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/{id}/items/{vehicleId}/remove")
    public TransferOrderResponse removeItem(@PathVariable Long id, @PathVariable Long vehicleId) {
        return service.view(service.removeItem(id, vehicleId));
    }

    @PostMapping("/{id}/cancel")
    public TransferOrderResponse cancel(@PathVariable Long id) {
        return service.view(service.cancel(id));
    }
}
