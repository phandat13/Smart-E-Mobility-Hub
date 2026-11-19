package vn.edu.hcmut.emobility.rental;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.rental.RentalDtos.*;

/** RE01–RE04 */
@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {

    private final ReservationService service;

    public ReservationController(ReservationService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationView reserve(@Valid @RequestBody ReserveRequest r) {
        return service.reserve(CurrentUser.require().id(), r);
    }

    @GetMapping
    public List<ReservationView> history() {
        return service.history(CurrentUser.require().id());
    }

    @GetMapping("/{id}")
    public ReservationView get(@PathVariable Long id) {
        return service.get(CurrentUser.require().id(), id);
    }

    @PostMapping("/{id}/cancel")
    public ReservationView cancel(@PathVariable Long id) {
        return service.cancel(CurrentUser.require().id(), id);
    }

    /** Header Idempotency-Key: mỗi lần bấm "Gia hạn" sinh 1 khóa; gửi lại (mạng chậm) dùng lại khóa cũ. */
    @PostMapping("/{id}/extend")
    public ReservationView extend(@PathVariable Long id, @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return service.extend(CurrentUser.require().id(), id, key);
    }
}
