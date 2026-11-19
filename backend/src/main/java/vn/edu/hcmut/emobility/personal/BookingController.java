package vn.edu.hcmut.emobility.personal;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.personal.PersonalDtos.*;

/** PV01, PV03, PV04 */
@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

    private final BookingService bookings;
    private final CheckInService checkIn;

    public BookingController(BookingService bookings, CheckInService checkIn) {
        this.bookings = bookings;
        this.checkIn = checkIn;
    }

    @PostMapping("/quote")
    public QuoteResult quote(@Valid @RequestBody QuoteRequest r) {
        return bookings.quote(CurrentUser.require().id(), r);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingView confirm(@Valid @RequestBody ConfirmRequest r) {
        return bookings.confirm(CurrentUser.require().id(), r);
    }

    @GetMapping
    public List<BookingView> list() {
        return bookings.list(CurrentUser.require().id());
    }

    @GetMapping("/{id}")
    public BookingView get(@PathVariable Long id) {
        return bookings.get(CurrentUser.require().id(), id);
    }

    @PostMapping("/{id}/cancel")
    public BookingView cancel(@PathVariable Long id) {
        return bookings.cancel(CurrentUser.require().id(), id);
    }

    /** Sinh viên quét mã tại điểm check-in (thiết bị thật gọi /api/v1/iot/checkin). */
    @PostMapping("/{id}/check-in")
    public BookingView checkIn(@PathVariable Long id) {
        return checkIn.checkIn(CurrentUser.require().id(), id, null);
    }

    @PostMapping("/{id}/charging/retry")
    public BookingView retryCharging(@PathVariable Long id) {
        return checkIn.retryCharging(CurrentUser.require().id(), id);
    }

    @PostMapping("/{id}/check-out")
    public BookingView checkOut(@PathVariable Long id) {
        return checkIn.checkOut(CurrentUser.require().id(), id);
    }

    @GetMapping("/{id}/extend-quote")
    public ExtendQuote extendQuote(@PathVariable Long id, @RequestParam int minutes) {
        return bookings.extendQuote(CurrentUser.require().id(), id, minutes);
    }

    @PostMapping("/{id}/extend")
    public BookingView extend(@PathVariable Long id, @Valid @RequestBody ExtendRequest r,
                              @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return bookings.extend(CurrentUser.require().id(), id, r.minutes(), key);
    }
}
