package vn.edu.hcmut.emobility.iot;

import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.personal.CheckInService;
import vn.edu.hcmut.emobility.personal.PersonalDtos.BookingView;
import vn.edu.hcmut.emobility.personal.PersonalDtos.ScanRequest;

/** Điểm tiếp nhận từ thiết bị tại Hub – xác thực bằng header X-Device-Key (IotApiKeyFilter). */
@RestController
@RequestMapping("/api/v1/iot")
public class IotController {

    private final TelemetryService telemetry;
    private final CheckInService checkIn;

    public IotController(TelemetryService telemetry, CheckInService checkIn) {
        this.telemetry = telemetry;
        this.checkIn = checkIn;
    }

    @PostMapping("/telemetry")
    public Map<String, Object> telemetry(@Valid @RequestBody TelemetryMessage m) {
        telemetry.ingest(m, true);
        return telemetry.ack(m);
    }

    @PostMapping("/hubs/{id}/heartbeat")
    public Map<String, Object> heartbeat(@PathVariable Long id) {
        telemetry.hubHeartbeat(id);
        return Map.of("accepted", true);
    }

    /** PV03: máy quét tại điểm check-in gửi mã QR (+ biển số nhận diện). */
    @PostMapping("/checkin")
    public BookingView checkIn(@Valid @RequestBody ScanRequest r) {
        return checkIn.checkInByToken(r.qrToken(), r.plateNumber());
    }
}
