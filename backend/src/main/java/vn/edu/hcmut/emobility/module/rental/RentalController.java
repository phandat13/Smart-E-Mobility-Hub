package vn.edu.hcmut.emobility.module.rental;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.module.rental.RentalDto.ReservationResponse;
import vn.edu.hcmut.emobility.module.rental.RentalDto.ReserveRequest;

@RestController
@RequestMapping("/api/v1/reservations")
@PreAuthorize("hasRole('STUDENT')")
public class RentalController {

    private final RentalService service;

    public RentalController(RentalService service) {
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
