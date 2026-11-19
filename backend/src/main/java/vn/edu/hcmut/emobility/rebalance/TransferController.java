package vn.edu.hcmut.emobility.rebalance;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.rebalance.TransferDtos.*;

/** RB01 (Đơn vị vận hành) */
@RestController
@RequestMapping("/api/v1/ops/transfers")
public class TransferController {

    private final TransferService service;

    public TransferController(TransferService service) {
        this.service = service;
    }

    @GetMapping
    public List<OrderView> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public OrderView get(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping("/candidates")
    public List<CandidateView> candidates(@RequestParam Long hubId) {
        return service.candidates(hubId);
    }

    @GetMapping("/drivers")
    public List<DriverView> drivers() {
        return service.drivers();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderView create(@Valid @RequestBody CreateTransferRequest r) {
        return service.create(CurrentUser.require().id(), r);
    }

    @PostMapping("/{id}/cancel")
    public OrderView cancel(@PathVariable Long id) {
        return service.cancel(CurrentUser.require().id(), id);
    }
}
