package vn.edu.hcmut.emobility.unit;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.edu.hcmut.emobility.simulation.ScenarioType;
import vn.edu.hcmut.emobility.simulation.SimModel.*;
import vn.edu.hcmut.emobility.simulation.SimulationEngine;

/** SI03: mô phỏng chạy trên snapshot, tất định, sinh khuyến nghị hợp lệ. */
class SimulationEngineTest {

    private static final Snapshot SNAP = new Snapshot(Instant.parse("2026-11-20T10:00:00Z"), List.of(
            new HubState(1, "HUB-KTXA", "KTX A", "DORM", 10.8789, 106.8064, 24, 12, 0, 11, 1, 12, 6, 6, 80),
            new HubState(2, "HUB-KTXB", "KTX B", "DORM", 10.8822, 106.7826, 16, 4, 0, 4, 0, 4, 2, 2, 80),
            new HubState(5, "HUB-METRO", "Metro", "METRO", 10.867, 106.803, 30, 16, 0, 15, 1, 16, 8, 8, 82),
            new HubState(6, "HUB-VNU", "VNU", "ADMIN", 10.870, 106.801, 20, 14, 0, 13, 1, 14, 4, 4, 85)), 0);

    private static Params surge(int pct) {
        return new Params(List.of(5L, 1L, 2L), pct, 17, 0, 0, List.of(), 0);
    }

    @Test
    void deterministic() {
        assertEquals(SimulationEngine.run(SNAP, ScenarioType.DEMAND_SURGE, surge(60), 60),
                SimulationEngine.run(SNAP, ScenarioType.DEMAND_SURGE, surge(60), 60));
    }

    @Test
    void surgeLowersServiceRate() {
        int base = SimulationEngine.run(SNAP, ScenarioType.DEMAND_SURGE, surge(1), 60).serviceRatePct();
        int high = SimulationEngine.run(SNAP, ScenarioType.DEMAND_SURGE, surge(150), 60).serviceRatePct();
        assertTrue(high < base);
    }

    @Test
    void transferRecommendationsGoFromSurplusToDeficitAndRespectCaps() {
        Result r = SimulationEngine.run(SNAP, ScenarioType.DEMAND_SURGE, surge(60), 60);
        assertFalse(r.recommendations().isEmpty());
        r.recommendations().stream().filter(s -> s.type().equals("TRANSFER")).forEach(s -> {
            long from = ((Number) s.payload().get("fromHubId")).longValue(), to = ((Number) s.payload().get("toHubId")).longValue();
            int count = ((Number) s.payload().get("count")).intValue();
            assertNotEquals(from, to);
            assertTrue(count >= 1 && count <= 15);
            HubMetrics donor = r.hubs().stream().filter(h -> h.hubId() == from).findFirst().orElseThrow();
            assertEquals(0, donor.shortageVehicles(), "Hub cho xe không được là Hub đang thiếu");
        });
    }

    @Test
    void snapshotIsNotMutated() {
        Snapshot copy = new Snapshot(SNAP.takenAt(), List.copyOf(SNAP.hubs()), SNAP.vehiclesInUse());
        SimulationEngine.run(SNAP, ScenarioType.INFRA_FAILURE, new Params(List.of(1L), 0, 18, 100, 5, List.of(), 0), 120);
        assertEquals(copy, SNAP);
    }
}
