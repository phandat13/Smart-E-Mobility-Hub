package vn.edu.hcmut.emobility.it;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.simulation.RecommendationApplyService;
import vn.edu.hcmut.emobility.simulation.ScenarioType;
import vn.edu.hcmut.emobility.simulation.SimulationDtos.*;
import vn.edu.hcmut.emobility.simulation.SimulationService;

/** NFR What-if: tách biệt dữ liệu thật; góp ý #14: áp dụng khuyến nghị phải kiểm tra lại với trạng thái thực tế. */
class SimulationIT extends IntegrationTestBase {

    @Autowired SimulationService sim;
    @Autowired RecommendationApplyService apply;

    private String operationalFingerprint() {
        return jdbc.queryForObject("select md5(string_agg(x, ',' order by x)) from ("
                + "select 'v' || id || status || battery_percent || coalesce(hub_id, 0) as x from vehicle union all "
                + "select 's' || id || status from parking_slot union all select 'p' || id || status from charging_port union all "
                + "select 'r' || count(*) from reservation union all select 't' || count(*) from transfer_order union all "
                + "select 'c' || count(*) from charging_schedule) q", String.class);
    }

    @Test
    void runningSimulationDoesNotChangeOperationalData() {
        heartbeatAll();
        String before = operationalFingerprint();
        sim.run(3L, new RunRequest(null, new ScenarioRequest("IT surge", null, ScenarioType.DEMAND_SURGE,
                Map.of("hubIds", List.of(5, 1, 2), "demandIncreasePct", 60, "startHour", 17), 60, false)));
        assertEquals(before, operationalFingerprint());
    }

    @Test
    void applyRequiresFreshPreviewToken_andRevalidatesEachRecommendation() {
        heartbeatAll();
        RunView run = sim.run(3L, new RunRequest(null, new ScenarioRequest("IT apply", null, ScenarioType.DEMAND_SURGE,
                Map.of("hubIds", List.of(5, 1, 2), "demandIncreasePct", 120, "startHour", 17), 60, false)));
        List<Long> ids = run.recommendations().stream().map(RecommendationView::id).toList();
        if (ids.isEmpty()) return;
        BusinessException bad = assertThrows(BusinessException.class, () -> apply.apply(3L, run.id(), new ApplyRequest(ids, "123.forged")));
        assertEquals(ErrorCode.PREVIEW_TOKEN_INVALID, bad.getCode());
        Preview p = apply.preview(run.id(), ids);
        assertEquals(ids.size(), p.items().size());
        ApplyResult res = apply.apply(3L, run.id(), new ApplyRequest(ids, p.previewToken()));
        assertEquals(ids.size(), res.results().size());
        res.results().forEach(r -> assertTrue(r.appliedRef() != null || r.message() != null));
        // áp dụng lại cùng khuyến nghị không tạo thao tác trùng
        Preview p2 = apply.preview(run.id(), ids);
        p2.items().forEach(f -> assertFalse(f.feasible(), "Khuyến nghị đã xử lý không được áp dụng lại"));
    }
}
