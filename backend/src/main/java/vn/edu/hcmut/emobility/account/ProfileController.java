package vn.edu.hcmut.emobility.account;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.account.AccountDtos.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;

/** AC04 */
@RestController
@RequestMapping("/api/v1/me")
public class ProfileController {

    private final ProfileService service;

    public ProfileController(ProfileService service) {
        this.service = service;
    }

    @GetMapping("/profile")
    public ProfileView get() {
        return service.get(CurrentUser.require().id());
    }

    @PutMapping("/profile")
    public ProfileView update(@Valid @RequestBody UpdateProfileRequest r) {
        return service.update(CurrentUser.require().id(), r);
    }

    @PutMapping("/password")
    public void password(@Valid @RequestBody ChangePasswordRequest r) {
        service.changePassword(CurrentUser.require().id(), r);
    }
}
