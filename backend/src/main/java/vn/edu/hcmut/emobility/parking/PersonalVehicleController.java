package vn.edu.hcmut.emobility.parking;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/personal-vehicles")
@PreAuthorize("hasRole('STUDENT')")
public class PersonalVehicleController {

    private final PersonalVehicleService service;

    public PersonalVehicleController(PersonalVehicleService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PersonalVehicleResponse register(@Valid @RequestBody RegisterVehicleRequest req) {
        return PersonalVehicleResponse.from(service.register(CurrentUser.require().id(), req));
    }

    @GetMapping
    public List<PersonalVehicleResponse> mine() {
        return service.mine(CurrentUser.require().id()).stream().map(PersonalVehicleResponse::from).toList();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(CurrentUser.require().id(), id);
    }
}
