package vn.edu.hcmut.emobility.simulation;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;
import vn.edu.hcmut.emobility.simulation.SimulationDtos.*;

/** SI01–SI05 */
@RestController
@RequestMapping("/api/v1/ops/simulation")
public class SimulationController {

    private final SimulationService sim;
    private final RecommendationApplyService apply;

    public SimulationController(SimulationService sim, RecommendationApplyService apply) {
        this.sim = sim;
        this.apply = apply;
    }

    @GetMapping("/scenarios")
    public List<ScenarioView> scenarios() {
        return sim.scenarios();
    }

    /** SI01: kiểm tra cấu hình + tóm tắt */
    @PostMapping("/scenarios/validate")
    public ScenarioSummary validate(@Valid @RequestBody ScenarioRequest r) {
        return sim.validate(r.type(), r.params(), r.horizonMinutes());
    }

    /** SI02 */
    @PostMapping("/scenarios")
    @ResponseStatus(HttpStatus.CREATED)
    public ScenarioView save(@Valid @RequestBody ScenarioRequest r) {
        return sim.save(CurrentUser.require().id(), r);
    }

    /** SI03 */
    @PostMapping("/runs")
    @ResponseStatus(HttpStatus.CREATED)
    public RunView run(@RequestBody RunRequest r) {
        return sim.run(CurrentUser.require().id(), r);
    }

    /** SI04 */
    @GetMapping("/runs")
    public List<RunListItem> history() {
        return sim.history();
    }

    @GetMapping("/runs/{id}")
    public RunView get(@PathVariable Long id) {
        return sim.get(id);
    }

    /** SI05 bước 1–4 */
    @PostMapping("/runs/{id}/apply/preview")
    public Preview preview(@PathVariable Long id, @Valid @RequestBody PreviewRequest r) {
        return apply.preview(id, r.recommendationIds());
    }

    /** SI05 bước 5–7 */
    @PostMapping("/runs/{id}/apply")
    public ApplyResult apply(@PathVariable Long id, @Valid @RequestBody ApplyRequest r) {
        return apply.apply(CurrentUser.require().id(), id, r);
    }
}
