package vn.edu.hcmut.emobility.unit;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.edu.hcmut.emobility.charging.ChargingPlanner;
import vn.edu.hcmut.emobility.charging.ChargingPlanner.*;

/** SC01: ưu tiên theo pin + nhu cầu, không chồng lấn cam kết đã có (góp ý #12). */
class ChargingPlannerTest {

    private static final Instant T0 = Instant.parse("2026-11-20T10:00:00Z");

    @Test
    void lowerBatteryGetsHigherPriority() {
        assertTrue(ChargingPlanner.priority(10, 0.8, 0.6, 0.4) > ChargingPlanner.priority(50, 0.8, 0.6, 0.4));
    }

    @Test
    void requiredDurationRoundsUpTo15Minutes() {
        // 0.5 kWh * (90-10)% = 0.4 kWh / (3.3*0.9) ≈ 8 phút → 15 phút
        assertEquals(Duration.ofMinutes(15), ChargingPlanner.required(10, 90, 0.5, 3.3));
        // 1.8 kWh * 80% = 1.44 kWh / 2.97 ≈ 29 phút → 30 phút
        assertEquals(Duration.ofMinutes(30), ChargingPlanner.required(10, 90, 1.8, 3.3));
    }

    @Test
    void neverOverlapsExistingStudentCommitment() {
        Interval booked = new Interval(T0, T0.plus(Duration.ofHours(1)));
        PortCapacity port = new PortCapacity(1, "C-01", 3.3, List.of(booked));
        Plan plan = ChargingPlanner.plan(List.of(new VehicleNeed(7, "UG-007", 12, 1.8, 0.8)), List.of(port),
                T0, T0.plus(Duration.ofHours(4)), 90, 0.6, 0.4);
        assertEquals(1, plan.assignments().size());
        Assignment a = plan.assignments().get(0);
        assertFalse(a.start().isBefore(booked.end()), "Không được xếp vào khung giờ đã cam kết với sinh viên");
    }

    @Test
    void reportsUnmetWhenCapacityInsufficient() {
        PortCapacity port = new PortCapacity(1, "C-01", 3.3, List.of());
        List<VehicleNeed> needs = List.of(new VehicleNeed(1, "A", 5, 1.8, 1), new VehicleNeed(2, "B", 8, 1.8, 1), new VehicleNeed(3, "C", 9, 1.8, 1));
        // A cần 45 phút, B 30 phút, C 30 phút → khung 90 phút chỉ vừa A + B
        Plan plan = ChargingPlanner.plan(needs, List.of(port), T0, T0.plus(Duration.ofMinutes(90)), 90, 0.6, 0.4);
        assertEquals(2, plan.assignments().size());
        assertEquals(1, plan.unmet().size());
        assertEquals("C", plan.unmet().get(0).code(), "Xe pin cao nhất (ưu tiên thấp nhất) không được đáp ứng");
    }

    @Test
    void assignmentsOnSamePortDoNotOverlap() {
        PortCapacity port = new PortCapacity(1, "C-01", 3.3, List.of());
        List<VehicleNeed> needs = List.of(new VehicleNeed(1, "A", 10, 1.8, 1), new VehicleNeed(2, "B", 15, 1.8, 1));
        Plan plan = ChargingPlanner.plan(needs, List.of(port), T0, T0.plus(Duration.ofHours(3)), 90, 0.6, 0.4);
        Assignment x = plan.assignments().get(0), y = plan.assignments().get(1);
        assertFalse(x.start().isBefore(y.end()) && y.start().isBefore(x.end()));
    }
}
