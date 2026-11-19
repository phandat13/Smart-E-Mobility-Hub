package vn.edu.hcmut.emobility.personal;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;

/**
 * Giữ cổng sạc theo khung giờ cho cả đặt chỗ sinh viên (PV01/PV04) và lịch sạc (SC01/SC02).
 * Trình tự: khóa dòng cổng (FOR UPDATE) → kiểm tra lần cuối không chồng lấn → ghi.
 * Exclusion constraint ex_port_no_overlap là chốt chặn cuối ở DB.
 */
@Service
public class PortReservationService {

    private final PortReservationRepository repo;
    private final ChargingPortRepository ports;

    public PortReservationService(PortReservationRepository repo, ChargingPortRepository ports) {
        this.repo = repo;
        this.ports = ports;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public PortReservation reserve(Long portId, Instant start, Instant end, PortReservationSource src, Long srcId) {
        lockUsablePort(portId);
        if (!repo.overlapping(portId, start, end, -1L).isEmpty()) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Cổng sạc đã có cam kết khác trong khung giờ này");
        }
        return repo.saveAndFlush(new PortReservation(portId, start, end, src, srcId));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<PortReservation> active(PortReservationSource src, Long srcId) {
        return repo.findBySourceTypeAndSourceIdAndStatus(src, srcId, PortReservationStatus.ACTIVE);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void release(PortReservationSource src, Long srcId, PortReservationStatus status) {
        active(src, srcId).ifPresent(r -> r.setStatus(status));
    }

    /** Dời cam kết sang cổng/khung giờ khác (SC02, góp ý #15). Trả về các cam kết gây xung đột nếu không dời được. */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<PortReservation> conflicts(Long portId, Instant start, Instant end, Long excludeReservationId) {
        return repo.overlapping(portId, start, end, excludeReservationId == null ? -1L : excludeReservationId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void move(PortReservation r, Long newPortId, Instant start, Instant end) {
        lockUsablePort(newPortId);
        if (!repo.overlapping(newPortId, start, end, r.getId()).isEmpty()) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Cổng sạc đã có cam kết khác trong khung giờ này");
        }
        r.move(newPortId, start, end);
        repo.flush();
    }

    /** Tìm cổng thay thế cùng Hub, cùng chuẩn đầu sạc, trống trong khung giờ (trả về cổng đã khóa dòng). */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<ChargingPort> alternative(Long hubId, String connector, Instant start, Instant end, Long excludePortId) {
        for (Long id : ports.freePortIds(hubId, connector, start, end, excludePortId == null ? -1L : excludePortId)) {
            ChargingPort p = ports.lockById(id).orElse(null);
            if (p != null && p.getStatus().usable() && !p.isDisableAfterSession()
                    && repo.overlapping(id, start, end, -1L).isEmpty()) {
                return Optional.of(p);
            }
        }
        return Optional.empty();
    }

    private ChargingPort lockUsablePort(Long portId) {
        ChargingPort p = ports.lockById(portId).orElseThrow(() -> BusinessException.notFound("Cổng sạc", portId));
        if (!p.getStatus().usable() || p.isDisableAfterSession()) {
            throw new BusinessException(ErrorCode.SLOT_UNAVAILABLE, "Cổng sạc " + p.getCode() + " đang không hoạt động");
        }
        return p;
    }
}
