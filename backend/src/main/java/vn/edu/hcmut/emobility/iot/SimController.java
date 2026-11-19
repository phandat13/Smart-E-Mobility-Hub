package vn.edu.hcmut.emobility.iot;

import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.iot.DeviceType;
import vn.edu.hcmut.emobility.core.iot.LockState;
import vn.edu.hcmut.emobility.core.iot.SimulatedIotGateway;

/**
 * Bảng điều khiển thiết bị GIẢ LẬP để demo các luồng vật lý (chỉ bật khi app.iot.mode=simulated):
 * đỗ xe vào ô, xe rời ô, cắm/rút sạc, khóa/mở xe, đặt trước kết quả lệnh tiếp theo (thành công/thất bại/mất phản hồi),
 * làm Hub mất kết nối. Mỗi thao tác đi qua đúng đường ống TelemetryService như thiết bị thật.
 */
@RestController
@RequestMapping("/api/v1/sim")
@ConditionalOnProperty(name = "app.iot.mode", havingValue = "simulated", matchIfMissing = true)
public class SimController {

    public record ParkRequest(Long slotId) {}
    public record ValueRequest(Boolean value, Integer percent, String code, String behavior, Long vehicleId, LockState state) {}

    private final TelemetryService telemetry;
    private final SimulatedIotGateway gateway;
    private final DeviceSimulator simulator;

    public SimController(TelemetryService telemetry, SimulatedIotGateway gateway, DeviceSimulator simulator) {
        this.telemetry = telemetry;
        this.gateway = gateway;
        this.simulator = simulator;
    }

    /** Cảm biến ô đỗ báo xe dùng chung đã nằm trong ô (RE06 bước 2, RB02 bàn giao). */
    @PostMapping("/vehicles/{id}/park")
    public Map<String, Object> park(@PathVariable Long id, @RequestBody ParkRequest r) {
        telemetry.ingest(TelemetryMessage.slot(r.slotId(), true, id), false);
        return Map.of("ok", true);
    }

    /** Trạng thái khóa vật lý (vd: sinh viên tự khóa xe khi trả offline). */
    @PostMapping("/vehicles/{id}/lock")
    public Map<String, Object> lock(@PathVariable Long id, @RequestBody ValueRequest r) {
        LockState s = r.state() == null ? LockState.LOCKED : r.state();
        gateway.setLock(id, s);
        telemetry.ingest(TelemetryMessage.vehicle(id, null, null, s, null), false);
        return Map.of("ok", true, "lockState", s);
    }

    @PostMapping("/vehicles/{id}/battery")
    public Map<String, Object> battery(@PathVariable Long id, @RequestBody ValueRequest r) {
        telemetry.ingest(TelemetryMessage.vehicle(id, null, r.percent(), null, null), false);
        return Map.of("ok", true);
    }

    /** Thiết bị gửi mã lỗi / xóa lỗi (tiến trình nền sẽ phát hiện và sinh cảnh báo). */
    @PostMapping("/{type}/{id}/error")
    public Map<String, Object> error(@PathVariable DeviceType type, @PathVariable Long id, @RequestBody ValueRequest r) {
        boolean clear = r.code() == null || r.code().isBlank();
        telemetry.ingest(new TelemetryMessage(type, id, null, null, null, clear ? null : r.code(), clear, null, null, null, null, null), false);
        return Map.of("ok", true);
    }

    @PostMapping("/slots/{id}/occupy")
    public Map<String, Object> occupy(@PathVariable Long id) {
        telemetry.ingest(TelemetryMessage.slot(id, true, null), false);
        return Map.of("ok", true);
    }

    /** Cảm biến báo xe đã rời ô (PV03 bước cuối của check-out). */
    @PostMapping("/slots/{id}/vacate")
    public Map<String, Object> vacate(@PathVariable Long id) {
        telemetry.ingest(TelemetryMessage.slot(id, false, null), false);
        return Map.of("ok", true);
    }

    /** Xe dùng chung được cắm vào cổng (SC: phiên sạc chỉ bắt đầu khi đúng cổng + thiết bị xác nhận). */
    @PostMapping("/ports/{id}/plug")
    public Map<String, Object> plug(@PathVariable Long id, @RequestBody ValueRequest r) {
        telemetry.ingest(new TelemetryMessage(DeviceType.PORT, id, null, null, null, null, null, null, null, r.vehicleId(), null, null), false);
        return Map.of("ok", true);
    }

    @PostMapping("/ports/{id}/unplug")
    public Map<String, Object> unplug(@PathVariable Long id) {
        telemetry.ingest(new TelemetryMessage(DeviceType.PORT, id, null, null, null, null, null, null, null, null, false, true), false);
        return Map.of("ok", true);
    }

    /** Đặt trước kết quả cho lệnh kế tiếp gửi tới thiết bị: SUCCESS | FAIL | LOST_RESPONSE | TIMEOUT. */
    @PostMapping("/devices/{type}/{id}/next")
    public Map<String, Object> next(@PathVariable DeviceType type, @PathVariable Long id, @RequestBody ValueRequest r) {
        gateway.enqueue(type, id, SimulatedIotGateway.Behavior.valueOf(r.behavior()));
        return Map.of("ok", true, "queued", r.behavior());
    }

    /** Thiết bị không liên lạc được (đối soát sẽ thử lại, sau N lần báo động). */
    @PostMapping("/devices/{type}/{id}/reachable")
    public Map<String, Object> reachable(@PathVariable DeviceType type, @PathVariable Long id, @RequestBody ValueRequest r) {
        gateway.setUnreachable(type, id, !Boolean.TRUE.equals(r.value()));
        return Map.of("ok", true);
    }

    @PostMapping("/hubs/{id}/offline")
    public Map<String, Object> offline(@PathVariable Long id, @RequestBody ValueRequest r) {
        simulator.setHubOffline(id, Boolean.TRUE.equals(r.value()));
        return Map.of("ok", true, "offlineHubs", simulator.offlineHubs());
    }

    @GetMapping("/state")
    public Map<String, Object> state() {
        return Map.of("offlineHubs", simulator.offlineHubs(), "mode", "simulated");
    }

    @PostMapping("/reset")
    public Map<String, Object> reset() {
        gateway.reset();
        simulator.offlineHubs().forEach(h -> simulator.setHubOffline(h, false));
        return Map.of("ok", true);
    }
}
