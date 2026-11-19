package vn.edu.hcmut.emobility.charging;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * SC01 – thuật toán lập lịch sạc (thuần Java, không phụ thuộc framework → kiểm thử đơn vị được).
 * Ưu tiên = wBattery·(100 − pin) + wDemand·(trọng số nhu cầu Hub·100). Xếp tham lam theo ưu tiên giảm dần,
 * mỗi xe vào cổng cho thời điểm kết thúc sớm nhất, không chồng lấn các cam kết đã có (đặt chỗ sinh viên).
 */
public final class ChargingPlanner {

    private ChargingPlanner() {}

    public record Interval(Instant start, Instant end) {
        boolean overlaps(Instant s, Instant e) { return start.isBefore(e) && s.isBefore(end); }
    }

    public record VehicleNeed(long vehicleId, String code, int battery, double capacityKwh, double demandWeight) {}

    public record PortCapacity(long portId, String code, double powerKw, List<Interval> busy) {}

    public record Assignment(long vehicleId, long portId, Instant start, Instant end, double priority, int targetBattery) {}

    public record Unmet(long vehicleId, String code, int battery, String reason) {}

    public record Plan(List<Assignment> assignments, List<Unmet> unmet) {}

    public static double priority(int battery, double demandWeight, double wBattery, double wDemand) {
        return Math.round((wBattery * (100 - battery) + wDemand * demandWeight * 100) * 10) / 10.0;
    }

    /** Thời gian cần để sạc từ pin hiện tại tới mục tiêu, làm tròn lên bội 15 phút, tối thiểu 15 phút. */
    public static Duration required(int battery, int target, double capacityKwh, double powerKw) {
        double kwh = Math.max(0, target - battery) / 100.0 * capacityKwh;
        double hours = kwh / (powerKw * 0.9);
        long minutes = (long) Math.ceil(hours * 60 / 15.0) * 15;
        return Duration.ofMinutes(Math.max(15, minutes));
    }

    public static Plan plan(List<VehicleNeed> needs, List<PortCapacity> ports, Instant from, Instant to,
                            int target, double wBattery, double wDemand) {
        Map<Long, List<Interval>> busy = new HashMap<>();
        ports.forEach(p -> busy.put(p.portId(), new ArrayList<>(p.busy())));
        List<VehicleNeed> sorted = new ArrayList<>(needs);
        sorted.sort(Comparator.comparingDouble((VehicleNeed n) -> priority(n.battery(), n.demandWeight(), wBattery, wDemand)).reversed()
                .thenComparingLong(VehicleNeed::vehicleId));
        List<Assignment> out = new ArrayList<>();
        List<Unmet> unmet = new ArrayList<>();
        for (VehicleNeed n : sorted) {
            Assignment best = null;
            for (PortCapacity p : ports) {
                Duration d = required(n.battery(), target, n.capacityKwh(), p.powerKw());
                Instant start = earliest(busy.get(p.portId()), from, to, d);
                if (start == null) continue;
                Instant end = start.plus(d);
                if (best == null || end.isBefore(best.end())) {
                    best = new Assignment(n.vehicleId(), p.portId(), start, end, priority(n.battery(), n.demandWeight(), wBattery, wDemand), target);
                }
            }
            if (best == null) {
                unmet.add(new Unmet(n.vehicleId(), n.code(), n.battery(), "Không đủ tài nguyên sạc trong khung giờ"));
            } else {
                out.add(best);
                busy.get(best.portId()).add(new Interval(best.start(), best.end()));
            }
        }
        out.sort(Comparator.comparing(Assignment::start).thenComparingLong(Assignment::portId));
        return new Plan(out, unmet);
    }

    /** Thời điểm bắt đầu sớm nhất (bước 15 phút) để [start, start+d) không chồng lấn và kết thúc trước 'to'. */
    static Instant earliest(List<Interval> busy, Instant from, Instant to, Duration d) {
        Instant t = from;
        while (!t.plus(d).isAfter(to)) {
            Instant s = t, e = t.plus(d);
            Optional<Interval> clash = busy.stream().filter(i -> i.overlaps(s, e)).max(Comparator.comparing(Interval::end));
            if (clash.isEmpty()) return t;
            t = clash.get().end();
            long rem = t.getEpochSecond() % 900;
            if (rem != 0) t = t.plusSeconds(900 - rem);
        }
        return null;
    }
}
