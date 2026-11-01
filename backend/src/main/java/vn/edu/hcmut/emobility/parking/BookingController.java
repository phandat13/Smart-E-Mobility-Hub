package vn.edu.hcmut.emobility.parking;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/bookings")
@PreAuthorize("hasRole('STUDENT')")
public class BookingController {

    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    /** PV01 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse book(@Valid @RequestBody CreateBookingRequest req) {
        return BookingResponse.from(service.book(CurrentUser.require().id(), req));
    }

    @GetMapping
    public List<BookingResponse> mine() {
        return service.mine(CurrentUser.require().id()).stream().map(BookingResponse::from).toList();
    }

    /** PV03 */
    @PostMapping("/check-in")
    public BookingResponse checkIn(@Valid @RequestBody CheckInRequest req) {
        return BookingResponse.from(service.checkIn(CurrentUser.require().id(), req.qrToken()));
    }

    @PostMapping("/{id}/check-out")
    public BookingResponse checkOut(@PathVariable Long id) {
        return BookingResponse.from(service.checkOut(CurrentUser.require().id(), id));
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(@PathVariable Long id) {
        return BookingResponse.from(service.cancel(CurrentUser.require().id(), id));
    }
}
