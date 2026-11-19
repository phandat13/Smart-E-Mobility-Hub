package vn.edu.hcmut.emobility.simulation;

import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.charging.ChargingSchedule;
import vn.edu.hcmut.emobility.charging.SmartChargingService;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.JsonSupport;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.crypto.CryptoService;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.rebalance.TransferOrder;
import vn.edu.hcmut.emobility.rebalance.TransferService;
import vn.edu.hcmut.emobility.simulation.SimModel.HubState;
import vn.edu.hcmut.emobility.simulation.SimModel.Snapshot;
import vn.edu.hcmut.emobility.simulation.SimulationDtos.*;

/**
 * SI05 – Áp dụng khuyến nghị (góp ý #14): chọn khuyến nghị → đọc trạng thái thực tế → kiểm tra lại toàn bộ tài nguyên
 * → phát hiện khác biệt/xung đột → xác nhận lần cuối (token) → tạo lệnh điều chuyển / lịch sạc THẬT qua đúng
 * use case RB01/SC01 (vẫn khóa & giữ tài nguyên nguyên tử) → ghi audit. Kết quả mô phỏng gốc không bị sửa.
 */
@Service
public class RecommendationApplyService {

    private final SimulationRunRepository runs;
    private final RecommendationRepository recommendations;
    private final SnapshotService snapshots;
    private final TransferService transfers;
    private final SmartChargingService charging;
    private final CryptoService crypto;
    private final JsonSupport json;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public RecommendationApplyService(SimulationRunRepository runs, RecommendationRepository recommendations, SnapshotService snapshots,
                                      TransferService transfers, SmartChargingService charging, CryptoService crypto, JsonSupport json,
                                      AuditService audit, TxRunner tx, AppProperties props, Clock clock) {
        this.runs = runs;
        this.recommendations = recommendations;
        this.snapshots = snapshots;
        this.transfers = transfers;
        this.charging = charging;
        this.crypto = crypto;
        this.json = json;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    /** Bước 1–4: đọc live state, so sánh snapshot, kiểm tra khả thi từng khuyến nghị, cấp token xác nhận. */
    public Preview preview(Long runId, List<Long> ids) {
        SimulationRun run = tx.inNewTx(() -> runs.findById(runId).orElseThrow(() -> BusinessException.notFound("Kết quả mô phỏng", runId)));
        if (run.getStatus() != RunStatus.COMPLETED) throw new BusinessException(ErrorCode.INVALID_STATE, "Mô phỏng chưa hoàn tất");
        Snapshot snap = json.read(run.getSnapshot(), Snapshot.class);
        Snapshot live = snapshots.capture();
        List<Recommendation> recs = tx.inNewTx(() -> load(runId, ids));
        Set<Long> involved = new HashSet<>();
        recs.forEach(r -> involved.addAll(hubsOf(r)));
        Map<Long, HubState> s = index(snap), l = index(live);
        List<HubDiff> diffs = new ArrayList<>();
        boolean stale = false;
        for (Long hid : involved) {
            HubState a = s.get(hid), b = l.get(hid);
            if (a == null || b == null) {
                diffs.add(new HubDiff(hid, a != null ? a.name() : b != null ? b.name() : "#" + hid, a == null ? 0 : a.availableVehicles(),
                        b == null ? 0 : b.availableVehicles(), 0, 0, 0, 0, true));
                stale = true;
                continue;
            }
            int d = Math.abs(a.availableVehicles() - b.availableVehicles());
            boolean sig = d >= 5 || (a.availableVehicles() > 0 && (double) d / a.availableVehicles() > props.simulation().driftThreshold())
                    || a.workingPorts() != b.workingPorts();
            stale |= sig;
            diffs.add(new HubDiff(hid, b.name(), a.availableVehicles(), b.availableVehicles(), free(a), free(b), a.workingPorts(), b.workingPorts(), sig));
        }
        List<Feasibility> items = recs.stream().map(r -> feasibility(r, l)).toList();
        Instant now = clock.instant();
        String token = token(runId, ids, now);
        return new Preview(runId, run.getCode(), run.getSnapshotTakenAt(), live.takenAt(), stale,
                stale ? "Trạng thái thực tế đã khác biệt đáng kể so với bản sao mô phỏng – kết quả có thể đã lỗi thời, nên chạy lại mô phỏng (SI03) trước khi áp dụng" : null,
                diffs, items, token, now.plusSeconds(props.simulation().previewTokenTtlSeconds()));
    }

    /** Bước 5–7: xác nhận lần cuối → mỗi khuyến nghị kiểm tra lại & thực thi trong giao dịch riêng (E2 giữ các thao tác đã thành công). */
    public ApplyResult apply(Long operatorId, Long runId, ApplyRequest req) {
        verifyToken(runId, req.recommendationIds(), req.previewToken());
        List<ApplyItemResult> results = new ArrayList<>();
        for (Long id : req.recommendationIds()) {
            try {
                results.add(tx.inNewTx(() -> applyOne(operatorId, runId, id)));
            } catch (BusinessException e) {
                String msg = e.getMessage();
                tx.runInNewTx(() -> {
                    recommendations.lockById(id).ifPresent(r -> {
                        if (r.getStatus() == RecommendationStatus.PROPOSED) r.failed(msg, operatorId, clock.instant());
                    });
                    audit.record(operatorId, "APPLY_RECOMMENDATION_FAILED", "RECOMMENDATION", id, Map.of("reason", msg));
                });
                results.add(new ApplyItemResult(id, RecommendationStatus.FAILED, null, msg));
            }
        }
        int ok = (int) results.stream().filter(r -> r.status() == RecommendationStatus.APPLIED).count();
        return new ApplyResult(runId, results, ok, results.size() - ok);
    }

    private ApplyItemResult applyOne(Long operatorId, Long runId, Long id) {
        Recommendation r = recommendations.lockById(id).orElseThrow(() -> BusinessException.notFound("Khuyến nghị", id));
        if (!r.getRunId().equals(runId)) throw BusinessException.notFound("Khuyến nghị", id);
        if (r.getStatus() == RecommendationStatus.APPLIED) {
            return new ApplyItemResult(id, r.getStatus(), r.getAppliedRef(), "Đã áp dụng trước đó (" + r.getAppliedRef() + ")");
        }
        if (r.getStatus() != RecommendationStatus.PROPOSED) throw new BusinessException(ErrorCode.INVALID_STATE, "Khuyến nghị ở trạng thái " + r.getStatus());
        // Kiểm tra lại với trạng thái thực tế tại thời điểm commit
        Feasibility f = feasibility(r, index(snapshots.capture()));
        if (!f.feasible()) throw new BusinessException(ErrorCode.RECOMMENDATION_INFEASIBLE, f.reason());
        Map<String, Object> p = json.readMap(r.getPayload());
        String ref, result;
        if (r.getType() == RecommendationType.TRANSFER) {
            TransferOrder o = transfers.createFromRecommendation(operatorId, num(p.get("fromHubId")), num(p.get("toHubId")), (int) num(p.get("count")), id);
            ref = o.getCode();
            result = "Đã tạo lệnh điều chuyển " + o.getCode() + " (" + o.getStatus() + ")";
        } else {
            ChargingSchedule s = charging.generateDraft(operatorId, num(p.get("hubId")), (int) Math.max(1, num(p.getOrDefault("horizonHours", 2))));
            charging.confirmInTx(operatorId, s.getId());
            ref = s.getCode();
            result = "Đã lập và xác nhận lịch sạc " + s.getCode();
        }
        r.applied(ref, result, operatorId, clock.instant());
        audit.record(operatorId, "APPLY_RECOMMENDATION", "RECOMMENDATION", id, Map.of("run", runId, "type", r.getType().name(), "ref", ref, "payload", p));
        return new ApplyItemResult(id, RecommendationStatus.APPLIED, ref, result);
    }

    private Feasibility feasibility(Recommendation r, Map<Long, HubState> live) {
        Map<String, Object> p = json.readMap(r.getPayload());
        if (r.getStatus() != RecommendationStatus.PROPOSED) {
            return new Feasibility(r.getId(), r.getType(), r.getRationale(), false, "Khuyến nghị đã " + r.getStatus());
        }
        if (r.getType() == RecommendationType.TRANSFER) {
            long from = num(p.get("fromHubId")), to = num(p.get("toHubId"));
            int count = (int) num(p.get("count"));
            String summary = "Chuyển " + count + " xe " + p.get("fromHubName") + " → " + p.get("toHubName");
            HubState a = live.get(from), b = live.get(to);
            if (a == null || b == null) return new Feasibility(r.getId(), r.getType(), summary, false, "Hub nguồn/đích không còn hoạt động");
            if (a.availableVehicles() < count) return new Feasibility(r.getId(), r.getType(), summary, false,
                    "Hub nguồn chỉ còn " + a.availableVehicles() + "/" + count + " xe sẵn sàng");
            if (free(b) < count) return new Feasibility(r.getId(), r.getType(), summary, false, "Hub đích chỉ còn " + free(b) + "/" + count + " chỗ trống");
            return new Feasibility(r.getId(), r.getType(), summary, true, "Đủ xe tại nguồn và đủ chỗ tại đích");
        }
        long hubId = num(p.get("hubId"));
        String summary = "Ưu tiên sạc tại " + p.get("hubName");
        HubState h = live.get(hubId);
        if (h == null) return new Feasibility(r.getId(), r.getType(), summary, false, "Hub không còn hoạt động");
        if (h.workingPorts() == 0) return new Feasibility(r.getId(), r.getType(), summary, false, "Hub không còn cổng sạc hoạt động");
        if (h.lowBatteryVehicles() == 0) return new Feasibility(r.getId(), r.getType(), summary, false, "Không còn xe pin thấp cần sạc");
        return new Feasibility(r.getId(), r.getType(), summary, true, h.workingPorts() + " cổng hoạt động, " + h.lowBatteryVehicles() + " xe cần sạc");
    }

    private List<Recommendation> load(Long runId, List<Long> ids) {
        List<Recommendation> list = recommendations.findAllById(ids);
        if (list.size() != new HashSet<>(ids).size() || list.stream().anyMatch(r -> !r.getRunId().equals(runId))) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Khuyến nghị không thuộc kết quả mô phỏng này");
        }
        return list;
    }

    private Set<Long> hubsOf(Recommendation r) {
        Map<String, Object> p = json.readMap(r.getPayload());
        return r.getType() == RecommendationType.TRANSFER ? Set.of(num(p.get("fromHubId")), num(p.get("toHubId"))) : Set.of(num(p.get("hubId")));
    }

    private String token(Long runId, List<Long> ids, Instant at) {
        String data = runId + "|" + ids.stream().sorted().map(String::valueOf).collect(Collectors.joining(",")) + "|" + at.getEpochSecond();
        return at.getEpochSecond() + "." + crypto.sign(data);
    }

    private void verifyToken(Long runId, List<Long> ids, String token) {
        try {
            String[] parts = token.split("\\.", 2);
            long issued = Long.parseLong(parts[0]);
            Instant at = Instant.ofEpochSecond(issued);
            if (at.plusSeconds(props.simulation().previewTokenTtlSeconds()).isBefore(clock.instant())) throw new IllegalStateException("expired");
            if (!token(runId, ids, at).equals(token)) throw new IllegalStateException("mismatch");
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.PREVIEW_TOKEN_INVALID);
        }
    }

    private static Map<Long, HubState> index(Snapshot s) {
        Map<Long, HubState> m = new HashMap<>();
        s.hubs().forEach(h -> m.put(h.id(), h));
        return m;
    }

    private static int free(HubState h) { return Math.max(0, h.sharedCapacity() - h.occupiedSlots() - h.heldSlots()); }

    private static long num(Object o) { return o instanceof Number n ? n.longValue() : Long.parseLong(String.valueOf(o)); }
}
