package vn.edu.hcmut.emobility.personal;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.personal.PersonalDtos.*;

/** PV02 */
@RestController
@RequestMapping("/api/v1/me/vehicles")
public class PersonalVehicleController {

    private final PersonalVehicleService service;

    public PersonalVehicleController(PersonalVehicleService service) {
        this.service = service;
    }

    @GetMapping
    public List<PersonalVehicleView> list() {
        return service.list(CurrentUser.require().id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PersonalVehicleView create(@Valid @RequestBody PersonalVehicleRequest r) {
        return service.create(CurrentUser.require().id(), r);
    }

    @PutMapping("/{id}")
    public PersonalVehicleView update(@PathVariable Long id, @Valid @RequestBody PersonalVehicleRequest r) {
        return service.update(CurrentUser.require().id(), id, r);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(CurrentUser.require().id(), id);
    }
}
