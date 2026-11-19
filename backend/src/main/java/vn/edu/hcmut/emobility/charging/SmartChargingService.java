package vn.edu.hcmut.emobility.charging;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.account.AppUser;
import vn.edu.hcmut.emobility.account.AppUserRepository;
import vn.edu.hcmut.emobility.charging.ChargingDtos.*;
import vn.edu.hcmut.emobility.charging.ChargingPlanner.*;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.JsonSupport;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.personal.*;

/**
 * SC01 lập lịch sạc thông minh, SC02 điều chỉnh lịch sạc.
 * Góp ý #12: trước khi lưu luôn re-check cổng, công suất và các cam kết đã xác nhận; KHÔNG dời khung giờ đã cam kết
 * với sinh viên và KHÔNG gián đoạn phiên sạc đang diễn ra.
 */
@Service
public class SmartChargingService {

    private static final Logger log = LoggerFactory.getLogger(SmartChargingService.class);
    private static final Set<VehicleStatus> CHARGE_CANDIDATES = Set.of(VehicleStatus.NEEDS_CHARGE, VehicleStatus.AVAILABLE, VehicleStatus.PENDING_CHECK);

    private final ChargingScheduleRepository schedules;
    private final ChargingScheduleItemRepository items;
    private final ChargingSessionRepository sessions;
    private final VehicleRepository vehicles;
    private final ChargingPortRepository ports;
    private final HubRepository hubs;
    private final HubStatsService stats;
    private final PortReservationRepository portReservations;
    private final PortReservationService portService;
    private final SlotBookingRepository bookings;
    private final AppUserRepository users;
    private final JsonSupport json;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public SmartChargingService(ChargingScheduleRepository schedules, ChargingScheduleItemRepository items, ChargingSessionRepository sessions,
                                VehicleRepository vehicles, ChargingPortRepository ports, HubRepository hubs, HubStatsService stats,
                                PortReservationRepository portReservations, PortReservationService portService, SlotBookingRepository bookings,
                                AppUserRepository users, JsonSupport json, AuditService audit, TxRunner tx, AppProperties props, Clock clock) {
        this.schedules = schedules;
        this.items = items;
        this.sessions = sessions;
        this.vehicles = vehicles;
        this.ports = ports;
        this.hubs = hubs;
        this.stats = stats;
        this.portReservations = portReservations;
        this.portService = portService;
        this.bookings = bookings;
        this.users = users;
        this.json = json;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    /** SC01 bước 1–5: tính lịch nháp (chưa giữ tài nguyên). */
    @Transactional
    public ScheduleView generate(Long operatorId, GenerateRequest r) {
        return view(generateDraft(operatorId, r.hubId(), r.horizonHours()), null);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ChargingSchedule generateDraft(Long operatorId, Long hubId, int horizonHours) {
        Hub hub = hubs.findById(hubId).orElseThrow(() -> BusinessException.notFound("Hub", hubId));
        if (!hub.isActive()) throw new BusinessException(ErrorCode.HUB_INACTIVE);
        Instant now = clock.instant();
        if (stats.isStale(hub, now)) throw new BusinessException(ErrorCode.INSUFFICIENT_DATA, "Hub chưa gửi dữ liệu trạng thái gần đây – không tạo lịch");
        Instant from = now.plusSeconds(900 - now.getEpochSecond() % 900);
        Instant to = from.plus(Duration.ofHours(horizonHours));
        Set<Long> replaceable = replaceableReservations(hubId);
        List<PortCapacity> caps = new ArrayList<>();
        for (ChargingPort p : ports.findByHubIdOrderByCode(hubId)) {
            if (!p.getStatus().usable() || p.isDisableAfterSession()) continue;
            List<Interval> busy = portReservations.activeFrom(p.getId(), from).stream()
                    .filter(x -> !replaceable.contains(x.getId()))
                    .map(x -> new Interval(x.getStartAt(), x.getEndAt())).toList();
            caps.add(new PortCapacity(p.getId(), p.getCode(), p.getPowerKw(), busy));
        }
        double demand = hub.getType().demandWeight();
        Set<Long> charging = new HashSet<>();
        sessions.findByStatus(SessionStatus.ACTIVE).forEach(s -> { if (s.getVehicleId() != null) charging.add(s.getVehicleId()); });
        List<VehicleNeed> needs = vehicles.findByHubIdOrderByBatteryPercentDesc(hubId).stream()
                .filter(v -> CHARGE_CANDIDATES.contains(v.getStatus()) && !charging.contains(v.getId()))
                .filter(v -> v.getStatus() == VehicleStatus.NEEDS_CHARGE || v.getBatteryPercent() < 60)
                .map(v -> new VehicleNeed(v.getId(), v.getCode(), v.getBatteryPercent(), v.getBatteryCapacityKwh(), demand)).toList();
        if (needs.isEmpty()) throw new BusinessException(ErrorCode.INVALID_STATE, "Không có phương tiện cần sạc tại Hub " + hub.getName());
        if (caps.isEmpty()) throw new BusinessException(ErrorCode.INSUFFICIENT_DATA, "Hub không có cổng sạc hoạt động – không thể tạo lịch hợp lệ");
        Plan plan = ChargingPlanner.plan(needs, caps, from, to, props.charging().targetBattery(), props.charging().wBattery(), props.charging().wDemand());
        ChargingSchedule s = schedules.saveAndFlush(new ChargingSchedule(Codes.next("LS", now), hubId, from, to,
                plan.unmet().isEmpty() ? null : json.write(plan.unmet()), operatorId));
        for (Assignment a : plan.assignments()) {
            items.save(new ChargingScheduleItem(s.getId(), a.vehicleId(), a.portId(), a.start(), a.end(), a.priority(), a.targetBattery()));
        }
        return s;
    }

    /** Cam kết của lịch đang áp dụng (chưa chạy) được phép thay thế khi xác nhận lịch mới. */
    private Set<Long> replaceableReservations(Long hubId) {
        Set<Long> ids = new HashSet<>();
        schedules.findFirstByHubIdAndStatusOrderByIdDesc(hubId, ScheduleStatus.CONFIRMED).ifPresent(cur ->
                items.findByScheduleIdAndStatus(cur.getId(), ScheduleItemStatus.SCHEDULED).forEach(i ->
                        portService.active(PortReservationSource.SCHEDULE_ITEM, i.getId()).ifPresent(r -> ids.add(r.getId()))));
        return ids;
    }

    /** SC01 bước 6: xác nhận – re-check từng xe/cổng và giữ cổng (exclusion constraint) trong một giao dịch. */
    @Transactional
    public ScheduleView confirm(Long operatorId, Long scheduleId) {
        return view(confirmInTx(operatorId, scheduleId), "Lịch sạc đã được xác nhận và áp dụng");
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ChargingSchedule confirmInTx(Long operatorId, Long scheduleId) {
        ChargingSchedule s = schedules.lockById(scheduleId).orElseThrow(() -> BusinessException.notFound("Lịch sạc", scheduleId));
        if (s.getStatus() != ScheduleStatus.DRAFT) throw new BusinessException(ErrorCode.SCHEDULE_NOT_EDITABLE);
        schedules.findFirstByHubIdAndStatusOrderByIdDesc(s.getHubId(), ScheduleStatus.CONFIRMED).ifPresent(old -> {
            ChargingSchedule locked = schedules.lockById(old.getId()).orElseThrow();
            for (ChargingScheduleItem i : items.findByScheduleIdAndStatus(locked.getId(), ScheduleItemStatus.SCHEDULED)) {
                i.setStatus(ScheduleItemStatus.CANCELLED);
                portService.release(PortReservationSource.SCHEDULE_ITEM, i.getId(), PortReservationStatus.CANCELLED);
            }
            locked.setStatus(ScheduleStatus.SUPERSEDED);
        });
        portReservations.flush();
        for (ChargingScheduleItem i : items.findByScheduleIdOrderByStartAt(scheduleId)) {
            Vehicle v = vehicles.findById(i.getVehicleId()).orElse(null);
            if (v == null || !s.getHubId().equals(v.getHubId()) || !CHARGE_CANDIDATES.contains(v.getStatus())) {
                i.setStatus(ScheduleItemStatus.CANCELLED);
                continue;
            }
            try {
                portService.reserve(i.getPortId(), i.getStartAt(), i.getEndAt(), PortReservationSource.SCHEDULE_ITEM, i.getId());
            } catch (BusinessException e) {
                throw new BusinessException(ErrorCode.SCHEDULE_OVERLAP, "Cổng " + portCode(i.getPortId()) + " vừa có cam kết khác trong khung "
                        + i.getStartAt() + " – vui lòng lập lại lịch");
            }
        }
        s.confirm(operatorId, clock.instant());
        audit.record(operatorId, "CHARGING_SCHEDULE_CONFIRM", "CHARGING_SCHEDULE", s.getId(), Map.of("hub", s.getHubId()));
        return s;
    }

    @Transactional
    public ScheduleView discard(Long operatorId, Long scheduleId) {
        ChargingSchedule s = schedules.lockById(scheduleId).orElseThrow(() -> BusinessException.notFound("Lịch sạc", scheduleId));
        if (s.getStatus() != ScheduleStatus.DRAFT) throw new BusinessException(ErrorCode.SCHEDULE_NOT_EDITABLE);
        s.setStatus(ScheduleStatus.DISCARDED);
        return view(s, "Đã hủy lịch nháp");
    }

    @Transactional(readOnly = true)
    public List<ScheduleView> list() {
        return schedules.findTop50ByOrderByIdDesc().stream().map(s -> view(s, null)).toList();
    }

    @Transactional(readOnly = true)
    public ScheduleView get(Long id) {
        return view(schedules.findById(id).orElseThrow(() -> BusinessException.notFound("Lịch sạc", id)), null);
    }

    /** SC02 bước 4: kiểm tra xung đột trước khi lưu (không thay đổi dữ liệu). */
    @Transactional(readOnly = true)
    public AdjustCheck validate(Long itemId, AdjustRequest r) {
        ChargingScheduleItem i = items.findById(itemId).orElseThrow(() -> BusinessException.notFound("Mục lịch sạc", itemId));
        return check(i, r);
    }

    /** SC02 bước 6: lưu – khóa mục lịch + cổng, re-check lần cuối, dời cam kết cổng (exclusion constraint chốt chặn). */
    @Transactional
    public ScheduleView adjust(Long operatorId, Long itemId, AdjustRequest r) {
        ChargingScheduleItem i = items.lockById(itemId).orElseThrow(() -> BusinessException.notFound("Mục lịch sạc", itemId));
        ChargingSchedule s = schedules.lockById(i.getScheduleId()).orElseThrow();
        Long portId = r.portId() != null ? r.portId() : i.getPortId();
        ports.lockById(portId);
        AdjustCheck c = check(i, r);
        if (!c.ok()) throw new BusinessException(ErrorCode.SCHEDULE_OVERLAP, String.join("; ", c.conflicts()), Map.of("conflicts", c.conflicts()));
        Instant start = r.startAt() != null ? r.startAt() : i.getStartAt();
        Instant end = r.endAt() != null ? r.endAt() : i.getEndAt();
        boolean moved = !portId.equals(i.getPortId()) || !start.equals(i.getStartAt()) || !end.equals(i.getEndAt());
        if (moved && s.getStatus() == ScheduleStatus.CONFIRMED) {
            PortReservation pr = portService.active(PortReservationSource.SCHEDULE_ITEM, i.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_EDITABLE, "Mục lịch không còn cam kết cổng"));
            portService.move(pr, portId, start, end);
        }
        if (moved) i.move(portId, start, end);
        if (r.priority() != null) i.setPriority(r.priority());
        audit.record(operatorId, "CHARGING_SCHEDULE_ADJUST", "CHARGING_ITEM", itemId,
                Map.of("port", portId, "start", start.toString(), "end", end.toString(), "warnings", c.warnings()));
        return view(s, c.warnings().isEmpty() ? "Đã lưu điều chỉnh" : "Đã lưu điều chỉnh – lưu ý: " + String.join("; ", c.warnings()));
    }

    private AdjustCheck check(ChargingScheduleItem i, AdjustRequest r) {
        List<String> conflicts = new ArrayList<>(), warnings = new ArrayList<>();
        ChargingSchedule s = schedules.findById(i.getScheduleId()).orElseThrow();
        if (s.getStatus() != ScheduleStatus.DRAFT && s.getStatus() != ScheduleStatus.CONFIRMED) {
            return new AdjustCheck(false, List.of("Lịch không còn hiệu lực để chỉnh sửa"), List.of());
        }
        Long portId = r.portId() != null ? r.portId() : i.getPortId();
        Instant start = r.startAt() != null ? r.startAt() : i.getStartAt();
        Instant end = r.endAt() != null ? r.endAt() : i.getEndAt();
        boolean moved = !portId.equals(i.getPortId()) || !start.equals(i.getStartAt()) || !end.equals(i.getEndAt());
        if (i.getStatus() == ScheduleItemStatus.ACTIVE && moved) {
            conflicts.add("Phiên sạc của xe này đang diễn ra – chỉ được đổi mức ưu tiên, không đổi giờ/cổng");
        } else if (i.getStatus() != ScheduleItemStatus.SCHEDULED && i.getStatus() != ScheduleItemStatus.ACTIVE) {
            conflicts.add("Mục lịch ở trạng thái " + i.getStatus() + ", không thể chỉnh sửa");
        }
        if (!moved) return new AdjustCheck(conflicts.isEmpty(), conflicts, warnings);
        Instant now = clock.instant();
        if (!end.isAfter(start)) conflicts.add("Giờ kết thúc phải sau giờ bắt đầu");
        if (start.isBefore(now.minusSeconds(60))) conflicts.add("Không thể đặt lịch vào thời điểm đã qua");
        if (Duration.between(start, end).toMinutes() < 15) conflicts.add("Thời lượng tối thiểu 15 phút");
        ChargingPort p = ports.findById(portId).orElse(null);
        if (p == null || !p.getHubId().equals(s.getHubId())) {
            conflicts.add("Cổng không thuộc Hub của lịch");
        } else {
            if (!p.getStatus().usable() || p.isDisableAfterSession()) conflicts.add("Cổng " + p.getCode() + " đang " + p.getStatus());
            Vehicle v = vehicles.findById(i.getVehicleId()).orElse(null);
            if (v != null) {
                Duration need = ChargingPlanner.required(v.getBatteryPercent(), i.getTargetBattery(), v.getBatteryCapacityKwh(), p.getPowerKw());
                if (Duration.between(start, end).compareTo(need) < 0) {
                    warnings.add("Công suất " + p.getPowerKw() + " kW cần ~" + need.toMinutes() + " phút để đạt " + i.getTargetBattery() + "% – khung giờ mới ngắn hơn");
                }
            }
            if (end.isAfter(now) && start.isBefore(now)) {
                sessions.findFirstByPortIdAndStatusIn(portId, ChargingSessionService.LIVE)
                        .filter(x -> !Objects.equals(x.getScheduleItemId(), i.getId()))
                        .ifPresent(x -> conflicts.add("Cổng " + p.getCode() + " đang có phiên sạc khác – không gián đoạn phiên đang diễn ra"));
            }
            Long self = portService.active(PortReservationSource.SCHEDULE_ITEM, i.getId()).map(PortReservation::getId).orElse(-1L);
            for (PortReservation x : portService.conflicts(portId, start, end, self)) {
                if (x.getSourceType() == PortReservationSource.BOOKING) {
                    String code = bookings.findById(x.getSourceId()).map(SlotBooking::getCode).orElse("#" + x.getSourceId());
                    conflicts.add("Trùng khung giờ đã cam kết với sinh viên (" + code + ") – không được dời cam kết này");
                } else {
                    String vc = items.findById(x.getSourceId()).flatMap(it -> vehicles.findById(it.getVehicleId())).map(Vehicle::getCode).orElse("?");
                    conflicts.add("Trùng lịch sạc đã xác nhận của xe " + vc);
                }
            }
            if (s.getStatus() == ScheduleStatus.DRAFT) {
                items.findByScheduleIdOrderByStartAt(s.getId()).stream()
                        .filter(o -> !o.getId().equals(i.getId()) && o.getPortId().equals(portId) && o.getStatus() == ScheduleItemStatus.SCHEDULED)
                        .filter(o -> o.getStartAt().isBefore(end) && start.isBefore(o.getEndAt()))
                        .forEach(o -> conflicts.add("Trùng mục khác trong lịch nháp (xe " + vehicles.findById(o.getVehicleId()).map(Vehicle::getCode).orElse("?") + ")"));
            }
        }
        return new AdjustCheck(conflicts.isEmpty(), conflicts, warnings);
    }

    /** Mục 2.3: mỗi 10 phút tính lại thứ tự ưu tiên trong phạm vi lịch đã xác nhận (không đổi giờ/cổng). */
    public int recalcPriorities() {
        return tx.inNewTx(() -> {
            int n = 0;
            Instant now = clock.instant();
            for (ChargingScheduleItem i : items.overdue(now)) {
                ChargingScheduleItem locked = items.lockById(i.getId()).orElseThrow();
                if (locked.getStatus() == ScheduleItemStatus.SCHEDULED) {
                    locked.setStatus(ScheduleItemStatus.MISSED);
                    portService.release(PortReservationSource.SCHEDULE_ITEM, locked.getId(), PortReservationStatus.RELEASED);
                }
            }
            for (ChargingScheduleItem i : items.findByStatus(ScheduleItemStatus.SCHEDULED)) {
                Vehicle v = vehicles.findById(i.getVehicleId()).orElse(null);
                Hub h = v == null || v.getHubId() == null ? null : hubs.findById(v.getHubId()).orElse(null);
                if (v == null || h == null) continue;
                double p = ChargingPlanner.priority(v.getBatteryPercent(), h.getType().demandWeight(), props.charging().wBattery(), props.charging().wDemand());
                if (Math.abs(p - i.getPriority()) > 0.05) {
                    items.lockById(i.getId()).ifPresent(x -> x.setPriority(p));
                    n++;
                }
            }
            return n;
        });
    }

    private String portCode(Long portId) {
        return ports.findById(portId).map(ChargingPort::getCode).orElse("#" + portId);
    }

    @SuppressWarnings("unchecked")
    ScheduleView view(ChargingSchedule s, String message) {
        Hub hub = hubs.findById(s.getHubId()).orElse(null);
        List<ItemView> iv = items.findByScheduleIdOrderByStartAt(s.getId()).stream().map(i -> {
            Vehicle v = vehicles.findById(i.getVehicleId()).orElse(null);
            ChargingPort p = ports.findById(i.getPortId()).orElse(null);
            ChargingSession ses = i.getSessionId() == null ? null : sessions.findById(i.getSessionId()).orElse(null);
            return new ItemView(i.getId(), i.getVehicleId(), v == null ? "?" : v.getCode(), v == null ? 0 : v.getBatteryPercent(),
                    i.getPortId(), p == null ? "?" : p.getCode(), p == null ? 0 : p.getPowerKw(), i.getStartAt(), i.getEndAt(), i.getPriority(),
                    i.getTargetBattery(), i.getStatus(), ses == null ? null : ses.getStatus().name(), ses == null ? null : ses.getStartedAt());
        }).toList();
        List<UnmetView> unmet = new ArrayList<>();
        if (s.getUnmet() != null) {
            for (Object o : json.read(s.getUnmet(), List.class)) {
                Map<String, Object> m = (Map<String, Object>) o;
                unmet.add(new UnmetView(((Number) m.get("vehicleId")).longValue(), (String) m.get("code"), ((Number) m.get("battery")).intValue(), (String) m.get("reason")));
            }
        }
        long needing = vehicles.countByHubIdAndStatus(s.getHubId(), VehicleStatus.NEEDS_CHARGE);
        int portsOk = (int) ports.findByHubIdOrderByCode(s.getHubId()).stream().filter(p -> p.getStatus().usable()).count();
        String by = s.getConfirmedBy() == null ? null : users.findById(s.getConfirmedBy()).map(AppUser::getFullName).orElse(null);
        return new ScheduleView(s.getId(), s.getCode(), s.getHubId(), hub == null ? "?" : hub.getName(), s.getStatus(), s.getHorizonStart(),
                s.getHorizonEnd(), s.getConfirmedAt(), by, iv, unmet, (int) needing, portsOk, message);
    }
}
