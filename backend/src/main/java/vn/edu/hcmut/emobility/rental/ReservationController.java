package vn.edu.hcmut.emobility.rental;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/reservations")
@PreAuthorize("hasRole('STUDENT')")
public class ReservationController {

    private final ReservationService service;

    public ReservationController(ReservationService service) {
        this.service = service;
    }

    /** RE01 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponse reserve(@Valid @RequestBody ReserveRequest req) {
        return ReservationResponse.from(service.reserve(CurrentUser.require().id(), req.vehicleId()));
    }

    /** RE04 */
    @PostMapping("/{id}/extend")
    public ReservationResponse extend(@PathVariable Long id) {
        return ReservationResponse.from(service.extend(CurrentUser.require().id(), id));
    }

    /** Đơn đang giữ chỗ hoặc đang đi; 204 nếu không có. */
    @GetMapping("/current")
    public ResponseEntity<ReservationResponse> current() {
        return service.current(CurrentUser.require().id())
                .map(r -> ResponseEntity.ok(ReservationResponse.from(r)))
                .orElse(ResponseEntity.noContent().build());
    }
}
