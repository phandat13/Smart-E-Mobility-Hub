package vn.edu.hcmut.emobility.core.iot;

import java.time.Clock;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.exception.BusinessException;

/**
 * Gửi lệnh tới thiết bị và lưu vết. Luôn gọi NGOÀI giao dịch nghiệp vụ:
 * ghi lệnh (tx riêng) → gửi → ghi kết quả (tx riêng). Bản ghi UNKNOWN là đầu vào cho đối soát.
 */
@Service
public class DeviceCommandService {

    private static final Logger log = LoggerFactory.getLogger(DeviceCommandService.class);

    public record Result(Long commandId, CommandOutcome outcome) {
        public boolean ok() { return outcome == CommandOutcome.SUCCESS; }
    }

    private final DeviceCommandRepository repo;
    private final IotGateway gateway;
    private final TxRunner tx;
    private final Clock clock;

    public DeviceCommandService(DeviceCommandRepository repo, IotGateway gateway, TxRunner tx, Clock clock) {
        this.repo = repo;
        this.gateway = gateway;
        this.tx = tx;
        this.clock = clock;
    }

    public Result execute(DeviceType type, Long deviceId, CommandType command, String contextType, Long contextId) {
        Long id = tx.inNewTx(() -> repo.save(new DeviceCommand(type, deviceId, command, contextType, contextId, clock.instant())).getId());
        CommandOutcome outcome;
        try {
            outcome = gateway.send(type, deviceId, command);
        } catch (RuntimeException e) {
            log.warn("Lỗi gửi lệnh {} tới {}#{}: {}", command, type, deviceId, e.getMessage());
            outcome = CommandOutcome.UNKNOWN;
        }
        CommandOutcome finalOutcome = outcome;
        tx.runInNewTx(() -> repo.findById(id).ifPresent(c -> c.complete(switch (finalOutcome) {
            case SUCCESS -> CommandStatus.SUCCEEDED;
            case FAILED -> CommandStatus.FAILED;
            case UNKNOWN -> CommandStatus.UNKNOWN;
        }, clock.instant(), finalOutcome == CommandOutcome.UNKNOWN ? "Không nhận được phản hồi trong thời gian quy định" : null)));
        return new Result(id, outcome);
    }

    public List<DeviceCommand> pendingReconciliation() {
        return repo.findByStatusOrderByIdAsc(CommandStatus.UNKNOWN);
    }

    /** Gọi trong giao dịch của bên đối soát. */
    public void markReconciled(Long commandId, boolean success, String detail) {
        DeviceCommand c = repo.findById(commandId).orElseThrow(() -> BusinessException.notFound("Lệnh thiết bị", commandId));
        c.complete(success ? CommandStatus.RECONCILED_SUCCESS : CommandStatus.RECONCILED_FAILED, clock.instant(), detail);
    }

    public void incrementAttempts(Long commandId) {
        repo.findById(commandId).ifPresent(DeviceCommand::incrementAttempts);
    }

    public DeviceCommand get(Long id) {
        return repo.findById(id).orElseThrow(() -> BusinessException.notFound("Lệnh thiết bị", id));
    }
}
