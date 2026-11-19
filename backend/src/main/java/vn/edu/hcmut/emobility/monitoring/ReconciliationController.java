package vn.edu.hcmut.emobility.monitoring;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.iot.CommandType;
import vn.edu.hcmut.emobility.core.iot.DeviceCommand;
import vn.edu.hcmut.emobility.core.iot.DeviceCommandService;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.rental.RentalDtos.ReturnResult;
import vn.edu.hcmut.emobility.rental.TripService;

/** Đối soát thủ công các thao tác có kết quả thiết bị không xác định (góp ý #5, #6). */
@RestController
@RequestMapping("/api/v1/ops/reconciliation")
public class ReconciliationController {

    public record CommandRow(Long id, String deviceType, Long deviceId, String command, String status, String contextType, Long contextId,
                             java.time.Instant requestedAt, int attempts, String detail) {}

    public record ResolveRequest(boolean success) {}

    private final DeviceCommandService commands;
    private final TripService trips;
    private final TxRunner tx;

    public ReconciliationController(DeviceCommandService commands, TripService trips, TxRunner tx) {
        this.commands = commands;
        this.trips = trips;
        this.tx = tx;
    }

    @GetMapping
    public Map<String, Object> pending() {
        List<CommandRow> cmds = tx.inNewTx(() -> commands.pendingReconciliation().stream().map(c -> new CommandRow(c.getId(), c.getDeviceType().name(),
                c.getDeviceId(), c.getCommand().name(), c.getStatus().name(), c.getContextType(), c.getContextId(), c.getRequestedAt(),
                c.getAttempts(), c.getDetail())).toList());
        return Map.of("commands", cmds, "pendingTrips", trips.pendingReturns());
    }

    /** Xác nhận thủ công kết quả mở khóa sau khi kiểm tra thực địa. */
    @PostMapping("/commands/{id}/resolve")
    public Map<String, Object> resolve(@PathVariable Long id, @RequestBody ResolveRequest r) {
        DeviceCommand c = tx.inNewTx(() -> commands.get(id));
        if (c.getCommand() != CommandType.UNLOCK || !TripService.CTX_PICKUP.equals(c.getContextType())) {
            throw new vn.edu.hcmut.emobility.core.exception.BusinessException(vn.edu.hcmut.emobility.core.exception.ErrorCode.INVALID_STATE,
                    "Chỉ hỗ trợ đối soát thủ công lệnh mở khóa khi nhận xe; chuyến chờ trả dùng /trips/{id}/confirm");
        }
        trips.resolveUnlock(id, r.success(), "Đơn vị vận hành xác nhận thủ công (user #" + CurrentUser.require().id() + ")");
        return Map.of("ok", true);
    }

    @PostMapping("/trips/{id}/confirm")
    public ReturnResult confirmTrip(@PathVariable Long id) {
        return trips.operatorConfirmReturn(CurrentUser.require().id(), id);
    }
}
