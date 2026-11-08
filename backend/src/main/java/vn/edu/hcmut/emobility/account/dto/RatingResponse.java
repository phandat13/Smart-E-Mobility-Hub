package vn.edu.hcmut.emobility.account.dto;

import java.util.List;
import vn.edu.hcmut.emobility.account.entity.Rating;

public record RatingResponse(Long tripId, int vehicleStars, int hubStars, String comment,
                             List<String> photoUrls, boolean incidentReported) {
    public static RatingResponse of(Rating r) {
        List<String> photos = r.getPhotoUrls() == null || r.getPhotoUrls().isBlank()
                ? List.of() : List.of(r.getPhotoUrls().split("\n"));
        return new RatingResponse(r.getTripId(), r.getVehicleStars(), r.getHubStars(), r.getComment(),
                photos, r.isIncidentReported());
    }
}
