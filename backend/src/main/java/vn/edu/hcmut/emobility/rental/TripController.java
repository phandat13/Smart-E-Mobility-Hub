package vn.edu.hcmut.emobility.rental;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.rental.RentalDtos.*;

/** RE05, RE06, AC05, AC06 */
@RestController
@RequestMapping("/api/v1/trips")
public class TripController {

    private final TripService trips;
    private final RatingService ratings;

    public TripController(TripService trips, RatingService ratings) {
        this.trips = trips;
        this.ratings = ratings;
    }

    /** 200 = đã bắt đầu chuyến; 202 = kết quả mở khóa chưa xác định, đang đối soát. */
    @PostMapping("/pickup")
    public ResponseEntity<PickupResult> pickup(@Valid @RequestBody PickupRequest r) {
        PickupResult res = trips.pickup(CurrentUser.require().id(), r);
        return ResponseEntity.status(res.state() == PickupState.STARTED ? HttpStatus.OK : HttpStatus.ACCEPTED).body(res);
    }

    @GetMapping("/active")
    public ActiveState active() {
        return trips.active(CurrentUser.require().id());
    }

    @GetMapping
    public List<TripView> history() {
        return trips.history(CurrentUser.require().id());
    }

    @GetMapping("/{id}")
    public TripView get(@PathVariable Long id) {
        return trips.get(CurrentUser.require().id(), id);
    }

    /** 200 = hoàn tất; 202 = chờ đối soát (chưa có xác nhận khóa xe). */
    @PostMapping("/{id}/return")
    public ResponseEntity<ReturnResult> returnVehicle(@PathVariable Long id) {
        ReturnResult r = trips.returnVehicle(CurrentUser.require().id(), id);
        return ResponseEntity.status(r.state() == ReturnState.COMPLETED ? HttpStatus.OK : HttpStatus.ACCEPTED).body(r);
    }

    @PostMapping("/{id}/offline-return")
    public ResponseEntity<ReturnResult> offlineReturn(@PathVariable Long id, @Valid @RequestBody OfflineReturnRequest r) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(trips.offlineReturn(CurrentUser.require().id(), id, r));
    }

    @PostMapping("/{id}/rating")
    public RatingResult rate(@PathVariable Long id, @Valid @RequestBody RatingRequest r) {
        return ratings.rate(CurrentUser.require().id(), id, r);
    }
}
