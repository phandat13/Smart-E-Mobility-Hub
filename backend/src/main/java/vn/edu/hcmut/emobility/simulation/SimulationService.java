package vn.edu.hcmut.emobility.simulation;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.JsonSupport;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.hub.Hub;
import vn.edu.hcmut.emobility.hub.HubRepository;
import vn.edu.hcmut.emobility.simulation.SimModel.*;
import vn.edu.hcmut.emobility.simulation.SimulationDtos.*;

/**
 * SI01 tạo kịch bản, SI02 lưu cấu hình, SI03 chạy mô phỏng trên snapshot, SI04 xem kết quả & lịch sử.
 * NFR: chạy mô phỏng KHÔNG thay đổi dữ liệu vận hành thật – chỉ ghi simulation_run/recommendation.
 */
@Service
public class SimulationService {

    private static final Logger log = LoggerFactory.getLogger(SimulationService.class);

    private final ScenarioRepository scenarios;
    private final SimulationRunRepository runs;
    private final RecommendationRepository recommendations;
    private final SnapshotService snapshots;
    private final HubRepository hubs;
    private final JsonSupport json;
    private final AuditService audit;
    private final TxRunner tx;
    private final Clock clock;

    public SimulationService(ScenarioRepository scenarios, SimulationRunRepository runs, RecommendationRepository recommendations,
                             SnapshotService snapshots, HubRepository hubs, JsonSupport json, AuditService audit, TxRunner tx, Clock clock) {
        this.scenarios = scenarios;
        this.runs = runs;
        this.recommendations = recommendations;
        this.snapshots = snapshots;
        this.hubs = hubs;
        this.json = json;
        this.audit = audit;
        this.tx = tx;
        this.clock = clock;
    }

    /** SI01 bước 3–4: kiểm tra cấu hình và trả bản tóm tắt (E1–E3). */
    @Transactional(readOnly = true)
    public ScenarioSummary validate(ScenarioType type, Map<String, Object> raw, int horizon) {
        List<String> errors = new ArrayList<>();
        Params p = normalize(raw, errors);
        Map<Long, Hub> hubMap = new HashMap<>();
        hubs.findAll().forEach(h -> hubMap.put(h.getId(), h));
        for (Long id : p.hubIds()) {
            Hub h = hubMap.get(id);
            if (h == null || !h.isActive()) errors.add("Hub #" + id + " không thuộc phạm vi mô phỏng (không tồn tại hoặc ngưng hoạt động)");
        }
        switch (type) {
            case DEMAND_SURGE -> {
                if (p.hubIds().isEmpty()) errors.add("Chọn ít nhất một Hub áp dụng");
                if (p.demandIncreasePct() < 1 || p.demandIncreasePct() > 300) errors.add("Mức tăng nhu cầu phải trong 1–300%");
            }
            case INFRA_FAILURE -> {
                if (p.hubIds().isEmpty()) errors.add("Chọn ít nhất một Hub bị ảnh hưởng");
                if (p.failedPortPct() < 0 || p.failedPortPct() > 100) errors.add("Tỉ lệ cổng hỏng phải trong 0–100%");
                if (p.failedVehicleCount() < 0 || p.failedVehicleCount() > 200) errors.add("Số xe hỏng phải trong 0–200");
                if (p.failedPortPct() == 0 && p.failedVehicleCount() == 0) errors.add("Cần ít nhất một yếu tố đứt gãy (cổng hoặc xe)");
            }
            case REBALANCE -> {
                if (p.transfers().isEmpty()) errors.add("Thêm ít nhất một phương án điều chuyển");
                for (TransferPlan t : p.transfers()) {
                    if (t.fromHubId() == t.toHubId()) errors.add("Hub nguồn và đích phải khác nhau");
                    if (t.count() < 1 || t.count() > 30) errors.add("Số xe mỗi phương án 1–30");
                    if (!hubMap.containsKey(t.fromHubId()) || !hubMap.containsKey(t.toHubId())) errors.add("Hub trong phương án điều chuyển không tồn tại");
                }
            }
            case CHARGING_CAPACITY -> {
                if (p.hubIds().isEmpty()) errors.add("Chọn ít nhất một Hub");
                if (p.extraPorts() < 1 || p.extraPorts() > 20) errors.add("Số cổng bổ sung 1–20");
            }
        }
        if (horizon < 15 || horizon > 1440) errors.add("Khung thời gian mô phỏng từ 15 phút đến 24 giờ");
        String hubNames = String.join(", ", p.hubIds().stream().map(id -> hubMap.containsKey(id) ? hubMap.get(id).getName() : "#" + id).toList());
        String summary = switch (type) {
            case DEMAND_SURGE -> "Đột biến tải +" + p.demandIncreasePct() + "% tại " + hubNames;
            case INFRA_FAILURE -> "Đứt gãy hạ tầng tại " + hubNames + ": " + p.failedPortPct() + "% cổng sạc, " + p.failedVehicleCount() + " xe hỏng";
            case REBALANCE -> "Điều chuyển " + p.transfers().size() + " phương án, tổng " + p.transfers().stream().mapToInt(TransferPlan::count).sum() + " xe";
            case CHARGING_CAPACITY -> "Bổ sung " + p.extraPorts() + " cổng sạc tại " + hubNames;
        } + " · bắt đầu " + p.startHour() + "h · " + horizon + " phút";
        return new ScenarioSummary(errors.isEmpty(), errors, summary, p);
    }

    @SuppressWarnings("unchecked")
    Params normalize(Map<String, Object> raw, List<String> errors) {
        try {
            List<Long> hubIds = raw.get("hubIds") instanceof List<?> l ? l.stream().map(o -> ((Number) o).longValue()).toList() : List.of();
            List<TransferPlan> transfers = new ArrayList<>();
            if (raw.get("transfers") instanceof List<?> tl) {
                for (Object o : tl) {
                    Map<String, Object> m = (Map<String, Object>) o;
                    transfers.add(new TransferPlan(((Number) m.get("fromHubId")).longValue(), ((Number) m.get("toHubId")).longValue(),
                            ((Number) m.get("count")).intValue()));
                }
            }
            int start = num(raw.get("startHour"), clock.instant().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).getHour());
            if (start < 0 || start > 23) errors.add("Giờ bắt đầu 0–23");
            return new Params(hubIds, num(raw.get("demandIncreasePct"), 0), start, num(raw.get("failedPortPct"), 0),
                    num(raw.get("failedVehicleCount"), 0), transfers, num(raw.get("extraPorts"), 0));
        } catch (RuntimeException e) {
            errors.add("Tham số kịch bản sai định dạng");
            return new Params(List.of(), 0, 0, 0, 0, List.of(), 0);
        }
    }

    private static int num(Object o, int def) { return o instanceof Number n ? n.intValue() : def; }

    /** SI02: lưu cấu hình (E2 trùng tên → cần xác nhận ghi đè). */
    @Transactional
    public ScenarioView save(Long operatorId, ScenarioRequest r) {
        ScenarioSummary sum = validate(r.type(), r.params(), r.horizonMinutes());
        if (!sum.valid()) throw new BusinessException(ErrorCode.SCENARIO_INVALID, String.join("; ", sum.errors()), Map.of("errors", sum.errors()));
        Optional<Scenario> same = scenarios.findAllByOrderByIdDesc().stream().filter(s -> s.getName().equalsIgnoreCase(r.name().trim())).findFirst();
        Scenario s;
        if (same.isPresent()) {
            if (!r.overwrite()) throw new BusinessException(ErrorCode.SCENARIO_NAME_TAKEN, "Kịch bản trùng tên – xác nhận ghi đè hoặc đặt tên khác", Map.of("requiresOverwrite", true));
            s = same.get();
            s.update(r.name().trim(), r.description(), r.type(), json.write(r.params()), r.horizonMinutes());
        } else {
            s = scenarios.saveAndFlush(new Scenario(r.name().trim(), r.description(), r.type(), json.write(r.params()), r.horizonMinutes(), operatorId));
        }
        audit.record(operatorId, "SCENARIO_SAVE", "SCENARIO", s.getId(), Map.of("type", r.type().name()));
        return view(s);
    }

    @Transactional(readOnly = true)
    public List<ScenarioView> scenarios() {
        return scenarios.findAllByOrderByIdDesc().stream().map(this::view).toList();
    }

    /** SI03: snapshot → áp dụng giả định → mô phỏng trên vùng dữ liệu riêng → khuyến nghị → lưu kết quả. */
    public RunView run(Long operatorId, RunRequest req) {
        Long scenarioId = req.scenarioId();
        if (scenarioId == null) {
            if (req.inline() == null) throw new BusinessException(ErrorCode.SCENARIO_INVALID, "Chọn kịch bản để chạy");
            ScenarioRequest in = req.inline();
            String name = (in.name() == null || in.name().isBlank() ? "Nháp" : in.name()) + " · " + Codes.next("RUN", clock.instant());
            scenarioId = tx.inNewTx(() -> save(operatorId, new ScenarioRequest(name, in.description(), in.type(), in.params(), in.horizonMinutes(), false)).id());
        }
        Long sid = scenarioId;
        Scenario sc = tx.inNewTx(() -> scenarios.findById(sid).orElseThrow(() -> BusinessException.notFound("Kịch bản", sid)));
        Map<String, Object> raw = json.readMap(sc.getParams());
        ScenarioSummary sum = tx.inNewTx(() -> validate(sc.getType(), raw, sc.getHorizonMinutes()));
        if (!sum.valid()) throw new BusinessException(ErrorCode.SCENARIO_INVALID, String.join("; ", sum.errors()));
        Snapshot snap = snapshots.capture();
        if (snap.hubs().isEmpty()) throw new BusinessException(ErrorCode.INSUFFICIENT_DATA, "Không có dữ liệu trạng thái mạng lưới");
        Long runId = tx.inNewTx(() -> runs.saveAndFlush(new SimulationRun(Codes.next("SIM", clock.instant()), sid, snap.takenAt(), json.write(snap), operatorId)).getId());
        try {
            Result result = SimulationEngine.run(snap, sc.getType(), sum.normalized(), sc.getHorizonMinutes());
            tx.runInNewTx(() -> {
                SimulationRun run = runs.findById(runId).orElseThrow();
                run.completed(json.write(result), clock.instant());
                for (Suggestion s : result.recommendations()) {
                    recommendations.save(new Recommendation(runId, RecommendationType.valueOf(s.type()), json.write(s.payload()), s.rationale()));
                }
                audit.record(operatorId, "SIMULATION_RUN", "SIMULATION_RUN", runId, Map.of("scenario", sc.getName(), "serviceRate", result.serviceRatePct()));
            });
        } catch (RuntimeException e) {
            log.warn("Mô phỏng {} thất bại: {}", runId, e.getMessage());
            tx.runInNewTx(() -> runs.findById(runId).ifPresent(r -> r.failed(String.valueOf(e.getMessage()), clock.instant())));
            throw new BusinessException(ErrorCode.SIMULATION_FAILED);
        }
        return tx.inNewTx(() -> get(runId));
    }

    @Transactional(readOnly = true)
    public List<RunListItem> history() {
        Map<Long, String> names = new HashMap<>();
        scenarios.findAll().forEach(s -> names.put(s.getId(), s.getName()));
        return runs.findTop50ByOrderByIdDesc().stream().map(r -> {
            Result res = r.getMetrics() == null ? null : json.read(r.getMetrics(), Result.class);
            List<Recommendation> recs = recommendations.findByRunIdOrderById(r.getId());
            return new RunListItem(r.getId(), r.getCode(), names.getOrDefault(r.getScenarioId(), "?"), r.getStatus(), r.getSnapshotTakenAt(),
                    res == null ? null : res.serviceRatePct(), res == null ? null : res.totalShortage(), recs.size(),
                    (int) recs.stream().filter(x -> x.getStatus() == RecommendationStatus.APPLIED).count());
        }).toList();
    }

    @Transactional(readOnly = true)
    public RunView get(Long runId) {
        SimulationRun r = runs.findById(runId).orElseThrow(() -> BusinessException.notFound("Kết quả mô phỏng", runId));
        Scenario sc = scenarios.findById(r.getScenarioId()).orElse(null);
        Result res = r.getMetrics() == null ? null : json.read(r.getMetrics(), Result.class);
        return new RunView(r.getId(), r.getCode(), r.getScenarioId(), sc == null ? "?" : sc.getName(), sc == null ? null : sc.getType(), r.getStatus(),
                r.getSnapshotTakenAt(), r.getFinishedAt(), res, r.getError(),
                recommendations.findByRunIdOrderById(runId).stream().map(this::recView).toList(), json.read(r.getSnapshot(), Snapshot.class));
    }

    RecommendationView recView(Recommendation x) {
        return new RecommendationView(x.getId(), x.getType(), json.readMap(x.getPayload()), x.getRationale(), x.getStatus(), x.getAppliedRef(),
                x.getApplyResult(), x.getAppliedAt());
    }

    private ScenarioView view(Scenario s) {
        Map<String, Object> params = json.readMap(s.getParams());
        return new ScenarioView(s.getId(), s.getName(), s.getDescription(), s.getType(), params, s.getHorizonMinutes(), s.getCreatedAt(),
                validate(s.getType(), params, s.getHorizonMinutes()).summary());
    }

    public Instant now() { return clock.instant(); }
}
