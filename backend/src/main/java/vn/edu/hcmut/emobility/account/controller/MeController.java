package vn.edu.hcmut.emobility.account.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.account.dto.*;
import vn.edu.hcmut.emobility.account.service.AuthService;
import vn.edu.hcmut.emobility.account.service.TripService;
import vn.edu.hcmut.emobility.core.common.PageResponse;
import vn.edu.hcmut.emobility.core.security.AuthUser;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final AuthService authService;
    private final TripService tripService;

    public MeController(AuthService authService, TripService tripService) {
        this.authService = authService;
        this.tripService = tripService;
    }

    /** AC04 */
    @GetMapping
    public UserResponse me(@AuthenticationPrincipal AuthUser user) {
        return authService.me(user.id());
    }

    /** AC04 */
    @PutMapping
    public UserResponse update(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody UpdateProfileRequest req) {
        return authService.updateProfile(user.id(), req);
    }

    /** AC05 */
    @GetMapping("/trips")
    @PreAuthorize("hasRole('STUDENT')")
    public PageResponse<TripSummary> trips(@AuthenticationPrincipal AuthUser user,
                                           @PageableDefault(size = 20, sort = "endedAt", direction = Sort.Direction.DESC)
                                           Pageable pageable) {
        return tripService.getTripHistory(user.id(), pageable);
    }

    /** AC05 */
    @GetMapping("/trips/{tripId}")
    @PreAuthorize("hasRole('STUDENT')")
    public TripDetail trip(@AuthenticationPrincipal AuthUser user, @PathVariable Long tripId) {
        return tripService.getTripDetail(user.id(), tripId);
    }

    /** AC06 */
    @PostMapping("/trips/{tripId}/rating")
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.CREATED)
    public RatingResponse rate(@AuthenticationPrincipal AuthUser user, @PathVariable Long tripId,
                               @Valid @RequestBody RatingRequest req) {
        return tripService.rateTrip(user.id(), tripId, req);
    }
}
