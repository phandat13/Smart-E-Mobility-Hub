package vn.edu.hcmut.emobility.simulation;

import java.util.*;
import vn.edu.hcmut.emobility.simulation.SimModel.*;

/**
 * SI03 – mô hình dòng (fluid model) bước 5 phút, tất định (không ngẫu nhiên) để kết quả tái lập được.
 * Chỉ thao tác trên bản sao Snapshot; không truy cập DB vận hành.
 */
public final class SimulationEngine {

    public static final int STEP_MIN = 5;
    private static final int TRIP_STEPS = 3;              // chuyến trung bình 15 phút
    private static final double LOW_BATTERY_SHARE = 0.10; // 10% xe sau chuyến xuống dưới 20%
    private static final double CHARGE_PER_PORT_STEP = 1.0 / 6; // 1 xe / cổng / 30 phút

    private SimulationEngine() {}

    static final Map<String, Integer> BASE_RATE = Map.of("METRO", 30, "DORM", 20, "CAMPUS", 15, "SERVICE", 10, "ADMIN", 8);
    static final Map<String, Double> ATTRACT = Map.of("METRO", 1.0, "DORM", 1.2, "CAMPUS", 1.0, "SERVICE", 0.6, "ADMIN", 0.5);

    static double hourProfile(int hour) {
        if (hour == 7 || hour == 8) return 1.6;
        if (hour == 11 || hour == 12) return 1.3;
        if (hour == 17 || hour == 18) return 1.8;
        if (hour >= 22 || hour <= 5) return 0.3;
        return 1.0;
    }

    static double attract(String type, int hour) {
        double a = ATTRACT.getOrDefault(type, 0.8);
        if (hour >= 16 && "DORM".equals(type)) a *= 1.6;
        if (hour >= 16 && "CAMPUS".equals(type)) a *= 0.7;
        if (hour < 11 && "CAMPUS".equals(type)) a *= 1.6;
        if (hour < 11 && "DORM".equals(type)) a *= 0.7;
        return a;
    }

    private static final class H {
        final HubState s;
        double avail, low, free, mult = 1.0, ports;
        double requested, served, unmet, redirected;
        double minAvail, peakOcc;
        final double[] arrivals;
        final double[] reserved;

        H(HubState s, int steps) {
            this.s = s;
            avail = s.availableVehicles();
            low = s.lowBatteryVehicles();
            free = Math.max(0, s.sharedCapacity() - s.occupiedSlots() - s.heldSlots());
            ports = s.workingPorts();
            minAvail = avail;
            peakOcc = s.sharedCapacity() == 0 ? 0 : (s.sharedCapacity() - free) / s.sharedCapacity();
            arrivals = new double[steps + TRIP_STEPS + 4];
            reserved = new double[steps + TRIP_STEPS + 4];
        }

        double occ() { return s.sharedCapacity() == 0 ? 0 : (s.sharedCapacity() - free) / s.sharedCapacity(); }
    }

    public static Result run(Snapshot snap, ScenarioType type, Params p, int horizonMinutes) {
        int steps = Math.max(1, horizonMinutes / STEP_MIN);
        List<H> hubs = snap.hubs().stream().map(h -> new H(h, steps)).toList();
        Map<Long, H> byId = new HashMap<>();
        hubs.forEach(h -> byId.put(h.s.id(), h));
        Set<Long> affected = new HashSet<>(p.hubIds() == null ? List.of() : p.hubIds());

        switch (type) {
            case DEMAND_SURGE -> affected.forEach(id -> { H h = byId.get(id); if (h != null) h.mult = 1 + p.demandIncreasePct() / 100.0; });
            case INFRA_FAILURE -> {
                List<H> targets = affected.stream().map(byId::get).filter(Objects::nonNull).toList();
                for (H h : targets) h.ports = Math.floor(h.ports * (1 - p.failedPortPct() / 100.0));
                int left = p.failedVehicleCount();
                for (int i = 0; left > 0 && !targets.isEmpty(); i++) {
                    H h = targets.get(i % targets.size());
                    if (h.avail >= 1) { h.avail -= 1; left--; } else if (targets.stream().allMatch(x -> x.avail < 1)) break;
                }
            }
            case REBALANCE -> {
                for (TransferPlan t : p.transfers()) {
                    H from = byId.get(t.fromHubId()), to = byId.get(t.toHubId());
                    if (from == null || to == null) continue;
                    double c = Math.min(t.count(), Math.min(from.avail, to.free));
                    if (c <= 0) continue;
                    from.avail -= c;
                    from.free += c;
                    from.minAvail = Math.min(from.minAvail, from.avail);
                    to.free -= c;                    // giữ chỗ tại Hub đích ngay khi xuất phát (góp ý #10)
                    to.reserved[TRIP_STEPS] += c;    // xe tới sau ~15 phút, chỗ đã được giữ
                }
            }
            case CHARGING_CAPACITY -> affected.forEach(id -> { H h = byId.get(id); if (h != null) h.ports += p.extraPorts(); });
        }

        List<SeriesPoint> series = new ArrayList<>();
        for (int step = 0; step < steps; step++) {
            int hour = (p.startHour() + (step * STEP_MIN) / 60) % 24;
            // 1. xe đến
            for (H h : hubs) {
                h.avail += h.reserved[step];
                double arr = h.arrivals[step];
                if (arr <= 0) continue;
                double park = Math.min(arr, Math.max(0, h.free));
                double overflow = arr - park;
                h.free -= park;
                h.avail += park * (1 - LOW_BATTERY_SHARE);
                h.low += park * LOW_BATTERY_SHARE;
                if (overflow > 1e-9) {
                    h.redirected += overflow;
                    H alt = nearestWithSpace(hubs, h);
                    if (alt != null) {
                        double p2 = Math.min(overflow, alt.free);
                        alt.free -= p2;
                        alt.avail += p2;
                    }
                }
            }
            // 2. sạc chuyển xe pin thấp thành xe sẵn sàng
            for (H h : hubs) {
                double c = Math.min(h.low, h.ports * CHARGE_PER_PORT_STEP);
                h.low -= c;
                h.avail += c;
            }
            // 3. nhu cầu thuê và phân bổ điểm đến
            for (H h : hubs) {
                double rate = BASE_RATE.getOrDefault(h.s.type(), 10) * hourProfile(hour) * h.mult * STEP_MIN / 60.0;
                double served = Math.min(rate, h.avail);
                h.requested += rate;
                h.served += served;
                h.unmet += rate - served;
                h.avail -= served;
                h.free += served;
                h.minAvail = Math.min(h.minAvail, h.avail);
                double wsum = hubs.stream().filter(o -> o != h).mapToDouble(o -> attract(o.s.type(), hour)).sum();
                if (wsum <= 0) continue;
                for (H o : hubs) {
                    if (o == h) continue;
                    o.arrivals[step + TRIP_STEPS] += served * attract(o.s.type(), hour) / wsum;
                }
            }
            for (H h : hubs) h.peakOcc = Math.max(h.peakOcc, h.occ());
            if (step % 3 == 0) {
                Map<String, Integer> occ = new LinkedHashMap<>();
                hubs.forEach(h -> occ.put(h.s.code(), (int) Math.round(h.occ() * 100)));
                series.add(new SeriesPoint(step * STEP_MIN, occ));
            }
        }

        double turnover = Math.max(1, horizonMinutes / 30.0);
        List<HubMetrics> metrics = hubs.stream().map(h -> new HubMetrics(h.s.id(), h.s.name(), r1(h.requested), r1(h.served), r1(h.unmet),
                h.requested <= 0 ? 100 : (int) Math.round(100 * h.served / h.requested),
                (int) Math.ceil(h.unmet / turnover - 1e-9), (int) Math.round(h.peakOcc * 100), h.peakOcc > 0.9, r1(h.redirected),
                (int) Math.floor(h.minAvail), (int) Math.round(h.avail), (int) Math.round(h.low))).toList();
        double req = hubs.stream().mapToDouble(h -> h.requested).sum(), srv = hubs.stream().mapToDouble(h -> h.served).sum();
        int risk = (int) metrics.stream().filter(m -> m.overloadRisk() || m.shortageVehicles() > 0).count();
        int shortage = metrics.stream().mapToInt(HubMetrics::shortageVehicles).sum();
        List<Suggestion> recs = recommend(metrics, hubs, horizonMinutes);
        int rate = req <= 0 ? 100 : (int) Math.round(100 * srv / req);
        String summary = "Tỉ lệ đáp ứng " + rate + "%, thiếu hụt " + shortage + " xe tại " + metrics.stream().filter(m -> m.shortageVehicles() > 0).count()
                + " Hub, " + metrics.stream().filter(HubMetrics::overloadRisk).count() + " Hub có nguy cơ lấp đầy >90%";
        return new Result(rate, r1(req), r1(srv), r1(req - srv), risk, shortage, metrics, series, recs, summary);
    }

    /** Khuyến nghị: ghép Hub thiếu với Hub dư (giữ đệm 2 xe), và ưu tiên sạc nơi xe pin thấp gây thiếu hụt. */
    static List<Suggestion> recommend(List<HubMetrics> metrics, List<H> hubs, int horizon) {
        List<Suggestion> out = new ArrayList<>();
        List<HubMetrics> deficits = new ArrayList<>(metrics.stream().filter(m -> m.shortageVehicles() > 0).toList());
        deficits.sort(Comparator.comparingInt(HubMetrics::shortageVehicles).reversed());
        Map<Long, Integer> spare = new HashMap<>();
        for (HubMetrics m : metrics) {
            int s = Math.min(m.minAvailable(), m.endAvailable()) - 2;
            if (m.shortageVehicles() == 0 && s > 0) spare.put(m.hubId(), s);
        }
        for (HubMetrics d : deficits) {
            int need = d.shortageVehicles();
            List<Map.Entry<Long, Integer>> donors = new ArrayList<>(spare.entrySet());
            donors.sort(Map.Entry.<Long, Integer>comparingByValue().reversed());
            for (Map.Entry<Long, Integer> e : donors) {
                if (need <= 0) break;
                int c = Math.min(Math.min(need, e.getValue()), 15);
                if (c <= 0) continue;
                String fromName = metrics.stream().filter(m -> m.hubId() == e.getKey()).findFirst().map(HubMetrics::name).orElse("?");
                out.add(new Suggestion("TRANSFER", Map.<String, Object>of("fromHubId", e.getKey(), "toHubId", d.hubId(), "count", c,
                        "fromHubName", fromName, "toHubName", d.name()),
                        "Chuyển " + c + " xe từ " + fromName + " → " + d.name() + ": " + d.name() + " thiếu ~" + d.shortageVehicles()
                                + " xe (đáp ứng " + d.serviceRatePct() + "%), " + fromName + " dư " + e.getValue() + " xe"));
                spare.put(e.getKey(), e.getValue() - c);
                need -= c;
            }
        }
        for (H h : hubs) {
            HubMetrics m = metrics.stream().filter(x -> x.hubId() == h.s.id()).findFirst().orElseThrow();
            if (m.unmet() > 0.5 && m.endLowBattery() >= 2) {
                out.add(new Suggestion("ADJUST_CHARGING", Map.<String, Object>of("hubId", h.s.id(), "hubName", h.s.name(), "horizonHours", Math.max(1, Math.min(24, horizon / 60))),
                        "Ưu tiên sạc tại " + h.s.name() + ": " + m.endLowBattery() + " xe pin thấp đang làm giảm khả năng phục vụ"));
            }
        }
        return out;
    }

    private static H nearestWithSpace(List<H> hubs, H from) {
        H best = null;
        double bd = Double.MAX_VALUE;
        for (H o : hubs) {
            if (o == from || o.free < 1) continue;
            double d = Math.hypot(o.s.lat() - from.s.lat(), o.s.lng() - from.s.lng());
            if (d < bd) { bd = d; best = o; }
        }
        return best;
    }

    private static double r1(double v) { return Math.round(v * 10) / 10.0; }
}
