package vn.edu.hcmut.emobility.core.iot;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Thiết bị GIẢ LẬP cho MVP (app.iot.mode=simulated). Giữ "trạng thái vật lý" của khóa xe và trụ sạc,
 * cho phép kịch bản demo đặt trước kết quả của lệnh tiếp theo:
 *  SUCCESS | FAIL | LOST_RESPONSE (thiết bị đã làm nhưng mất phản hồi → UNKNOWN) | TIMEOUT (không làm, không phản hồi).
 */
@Component
public class SimulatedIotGateway implements IotGateway {

    public enum Behavior { SUCCESS, FAIL, LOST_RESPONSE, TIMEOUT }

    private final Map<String, Deque<Behavior>> next = new ConcurrentHashMap<>();
    private final Map<Long, LockState> vehicleLocks = new ConcurrentHashMap<>();
    private final Map<Long, Boolean> portPower = new ConcurrentHashMap<>();
    private final Set<String> unreachable = ConcurrentHashMap.newKeySet();

    private static String key(DeviceType t, Long id) { return t + ":" + id; }

    @Override
    public CommandOutcome send(DeviceType type, Long deviceId, CommandType command) {
        latency();
        Behavior b = Optional.ofNullable(next.get(key(type, deviceId))).map(Deque::pollFirst).orElse(Behavior.SUCCESS);
        if (unreachable.contains(key(type, deviceId)) && b == Behavior.SUCCESS) b = Behavior.TIMEOUT;
        switch (b) {
            case SUCCESS -> { apply(type, deviceId, command); return CommandOutcome.SUCCESS; }
            case LOST_RESPONSE -> { apply(type, deviceId, command); return CommandOutcome.UNKNOWN; }
            case TIMEOUT -> { return CommandOutcome.UNKNOWN; }
            default -> { return CommandOutcome.FAILED; }
        }
    }

    @Override
    public Optional<DeviceState> query(DeviceType type, Long deviceId) {
        if (unreachable.contains(key(type, deviceId))) return Optional.empty();
        return Optional.of(new DeviceState(lockOf(deviceId), portPower.getOrDefault(deviceId, false)));
    }

    private void apply(DeviceType type, Long id, CommandType command) {
        switch (command) {
            case UNLOCK -> vehicleLocks.put(id, LockState.UNLOCKED);
            case LOCK -> vehicleLocks.put(id, LockState.LOCKED);
            case START_CHARGE -> portPower.put(id, true);
            case STOP_CHARGE -> portPower.put(id, false);
            case OPEN_GATE -> { /* cổng/rào chắn mở rồi tự đóng */ }
        }
    }

    private static void latency() {
        try {
            Thread.sleep(150);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    // ---- điều khiển kịch bản demo
    /** Đặt kết quả cho lệnh KẾ TIẾP của thiết bị (ghi đè lựa chọn trước đó). */
    public void enqueue(DeviceType type, Long id, Behavior b) {
        Deque<Behavior> q = new ArrayDeque<>();
        q.addLast(b);
        next.put(key(type, id), q);
    }

    public void setUnreachable(DeviceType type, Long id, boolean value) {
        if (value) unreachable.add(key(type, id)); else unreachable.remove(key(type, id));
    }

    public boolean isUnreachable(DeviceType type, Long id) { return unreachable.contains(key(type, id)); }

    public LockState lockOf(Long vehicleId) { return vehicleLocks.getOrDefault(vehicleId, LockState.LOCKED); }

    public void setLock(Long vehicleId, LockState s) { vehicleLocks.put(vehicleId, s); }

    public boolean powerOf(Long portId) { return portPower.getOrDefault(portId, false); }

    public void reset() {
        next.clear();
        unreachable.clear();
    }
}
