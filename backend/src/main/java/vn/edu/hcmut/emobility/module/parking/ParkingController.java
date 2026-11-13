package vn.edu.hcmut.emobility.module.parking;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.module.parking.ParkingDto.BookRequest;
import vn.edu.hcmut.emobility.module.parking.ParkingDto.BookingResponse;
import vn.edu.hcmut.emobility.module.parking.ParkingDto.CheckInRequest;
import vn.edu.hcmut.emobility.module.parking.ParkingDto.RegisterVehicleRequest;
import vn.edu.hcmut.emobility.module.parking.ParkingDto.VehicleResponse;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasRole('STUDENT')")
public class ParkingController {

    private final ParkingService service;

    public ParkingController(ParkingService service) {
        this.service = service;
    }

    // ---------- Xe cá nhân ----------

    @PostMapping("/personal-vehicles")
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleResponse registerVehicle(@Valid @RequestBody RegisterVehicleRequest req) {
        return VehicleResponse.from(service.registerVehicle(CurrentUser.require().id(), req));
    }

    @GetMapping("/personal-vehicles")
    public List<VehicleResponse> myVehicles() {
        return service.myVehicles(CurrentUser.require().id()).stream().map(VehicleResponse::from).toList();
    }

    @DeleteMapping("/personal-vehicles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVehicle(@PathVariable Long id) {
        service.deleteVehicle(CurrentUser.require().id(), id);
    }

    // ---------- Đặt chỗ ----------

    /** PV01 */
    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse book(@Valid @RequestBody BookRequest req) {
        return BookingResponse.from(service.book(CurrentUser.require().id(), req));
    }

    @GetMapping("/bookings")
    public List<BookingResponse> myBookings() {
        return service.myBookings(CurrentUser.require().id()).stream().map(BookingResponse::from).toList();
    }

    /** PV03 */
    @PostMapping("/bookings/check-in")
    public BookingResponse checkIn(@Valid @RequestBody CheckInRequest req) {
        return BookingResponse.from(service.checkIn(CurrentUser.require().id(), req.qrToken()));
    }

    @PostMapping("/bookings/{id}/check-out")
    public BookingResponse checkOut(@PathVariable Long id) {
        return BookingResponse.from(service.checkOut(CurrentUser.require().id(), id));
    }

    @PostMapping("/bookings/{id}/cancel")
    public BookingResponse cancel(@PathVariable Long id) {
        return BookingResponse.from(service.cancel(CurrentUser.require().id(), id));
    }
}
