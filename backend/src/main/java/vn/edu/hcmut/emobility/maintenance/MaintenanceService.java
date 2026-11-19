package vn.edu.hcmut.emobility.maintenance;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.account.AppUser;
import vn.edu.hcmut.emobility.account.AppUserRepository;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.core.security.Role;
import vn.edu.hcmut.emobility.fleet.*;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.hub.PortStatus;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.*;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;

/** MT02 xử lý & phân công, MT03 lệnh bảo trì, MT04 phiếu bảo trì, MT05 cập nhật + xác minh trước khi phục hồi. */
@Service
public class MaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceService.class);
    private static final Set<VehicleStatus> LOCKABLE = Set.of(VehicleStatus.AVAILABLE, VehicleStatus.FAULTY, VehicleStatus.PENDING_CHECK, VehicleStatus.NEEDS_CHARGE);
    private static final Set<MaintenanceOrderStatus> OPEN_ORDER = Set.of(MaintenanceOrderStatus.PENDING, MaintenanceOrderStatus.IN_PROGRESS);

    private final MaintenanceOrderRepository orders;
    private final MaintenanceTicketRepository tickets;
    private final IncidentRepository incidentRepo;
    private final IncidentService incidents;
    private final VehicleRepository vehicles;
    private final ChargingPortRepository ports;
    private final AppUserRepository users;
    private final ImpactService impact;
    private final ResourceVerifier verifier;
    private final AlertService alerts;
    private final NotificationService notifications;
    private final FleetEvents events;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public MaintenanceService(MaintenanceOrderRepository orders, MaintenanceTicketRepository tickets, IncidentRepository incidentRepo,
                              IncidentService incidents, VehicleRepository vehicles, ChargingPortRepository ports, AppUserRepository users,
                              ImpactService impact, ResourceVerifier verifier, AlertService alerts, NotificationService notifications,
                              FleetEvents events, AuditService audit, TxRunner tx, AppProperties props, Clock clock) {
        this.orders = orders;
        this.tickets = tickets;
        this.incidentRepo = incidentRepo;
        this.incidents = incidents;
        this.vehicles = vehicles;
        this.ports = ports;
        this.users = users;
        this.impact = impact;
        this.verifier = verifier;
        this.alerts = alerts;
        this.notifications = notifications;
        this.events = events;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TechnicianView> technicians() {
        return users.findActiveByRole(Role.TECHNICIAN).stream()
                .map(u -> new TechnicianView(u.getId(), u.getFullName(), orders.findByTechnicianIdAndStatusInOrderByIdDesc(u.getId(), OPEN_ORDER).size()))
                .toList();
    }

    /** MT02 bước 3: từ phiếu sự cố → tạo phiếu bảo trì và phân công kỹ thuật viên. */
    @Transactional
    public OrderView assignIncident(Long operatorId, Long incidentId, AssignRequest r) {
        Incident inc = incidentRepo.lockById(incidentId).orElseThrow(() -> BusinessException.notFound("Phiếu sự cố", incidentId));
        if (inc.getStatus() != IncidentStatus.OPEN && inc.getStatus() != IncidentStatus.ASSIGNED) {
            throw new BusinessException(ErrorCode.INVALID_STATE, "Phiếu sự cố đã đóng");
        }
        requireTechnician(r.technicianId());
        lockTarget(inc.getTargetType(), inc.getTargetId(), "Sự cố " + inc.getCode());
        MaintenanceOrder o = orders.saveAndFlush(new MaintenanceOrder(Codes.next("BT", clock.instant()), r.technicianId(),
                r.priority() == null ? inc.getSeverity() : r.priority(), r.dueAt(), inc.getId(), null, r.note(), operatorId));
        if (inc.getTargetType() != TargetType.HUB) tickets.save(new MaintenanceTicket(o.getId(), inc.getTargetType(), inc.getTargetId()));
        inc.setStatus(IncidentStatus.ASSIGNED);
        notifyTech(o, incidents.label(inc.getTargetType(), inc.getTargetId()));
        audit.record(operatorId, "MAINTENANCE_ASSIGN", "MAINTENANCE_ORDER", o.getId(), Map.of("incident", inc.getCode()));
        return view(o);
    }

    /**
     * MT03 bước 2 – nguyên tử: kiểm tra lần cuối các xe không nằm trong đơn đặt/chuyến đi/lệnh điều chuyển
     * (UPDATE có điều kiện trên tập trạng thái cho phép) → MAINTENANCE_LOCKED + tạo lệnh. Một xe xung đột → rollback.
     */
    @Transactional
    public OrderView createOrder(Long operatorId, MaintenanceOrderRequest r) {
        requireTechnician(r.technicianId());
        List<Long> ids = new ArrayList<>(new TreeSet<>(r.vehicleIds()));
        Instant now = clock.instant();
        List<Long> conflict = new ArrayList<>();
        for (Long id : ids) {
            if (vehicles.casFrom(id, LOCKABLE, VehicleStatus.MAINTENANCE_LOCKED, now) == 0) conflict.add(id);
        }
        if (!conflict.isEmpty()) {
            List<String> codes = vehicles.findAllById(conflict).stream().map(v -> v.getCode() + " (" + v.getStatus() + ")").toList();
            throw new BusinessException(ErrorCode.VEHICLE_IN_OTHER_OPERATION,
                    "Xung đột: " + String.join(", ", codes) + ". Không xe nào bị khóa – vui lòng xử lý trước khi tạo lệnh bảo trì",
                    Map.of("conflicts", codes));
        }
        MaintenanceOrder o = orders.saveAndFlush(new MaintenanceOrder(Codes.next("BT", now), r.technicianId(),
                r.priority() == null ? Severity.MEDIUM : r.priority(), r.dueAt(), null, r.alertId(), r.note(), operatorId));
        for (Long id : ids) {
            tickets.save(new MaintenanceTicket(o.getId(), TargetType.VEHICLE, id));
            Vehicle v = vehicles.lockById(id).orElseThrow();
            impact.onVehicleUnavailable(v, "khóa bảo trì " + o.getCode());
            events.hubChanged(v.getHubId());
        }
        if (r.alertId() != null) {
            try {
                alerts.acknowledge(r.alertId());
            } catch (BusinessException ignored) {
                // đã xử lý
            }
        }
        notifyTech(o, ids.size() + " xe");
        audit.record(operatorId, "MAINTENANCE_CREATE", "MAINTENANCE_ORDER", o.getId(), Map.of("vehicles", ids));
        return view(o);
    }

    @Transactional(readOnly = true)
    public List<OrderView> list() {
        return orders.findTop100ByOrderByIdDesc().stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderView> mine(Long techId) {
        return orders.findByTechnicianIdAndStatusInOrderByIdDesc(techId, EnumSet.allOf(MaintenanceOrderStatus.class)).stream()
                .sorted(Comparator.comparing((MaintenanceOrder o) -> OPEN_ORDER.contains(o.getStatus()) ? 0 : 1)
                        .thenComparing(o -> -o.getPriority().ordinal()))
                .map(this::view).toList();
    }

    /** MT04: kỹ thuật viên ghi nhận tình trạng hỏng, hạng mục sửa chữa, linh kiện thay thế. */
    @Transactional
    public TicketView fillTicket(Long techId, Long ticketId, TicketFillRequest r) {
        MaintenanceTicket t = myTicket(techId, ticketId);
        if (!targetExists(t.getTargetType(), t.getTargetId())) throw new BusinessException(ErrorCode.NOT_FOUND, "Xe không tồn tại trong hệ thống hoặc đã bị xóa");
        t.fill(r.diagnosis(), r.repairItems(), r.replacedParts());
        orders.lockById(t.getOrderId()).ifPresent(o -> { if (o.getStatus() == MaintenanceOrderStatus.PENDING) o.setStatus(MaintenanceOrderStatus.IN_PROGRESS); });
        audit.record(techId, "TICKET_FILL", "MAINTENANCE_TICKET", ticketId, null);
        return ticket(t);
    }

    /** Dữ liệu cảm biến hiện tại để kỹ thuật viên kiểm tra trước khi xác nhận Hoàn tất. */
    @Transactional(readOnly = true)
    public Map<String, Object> precheck(Long techId, Long ticketId) {
        MaintenanceTicket t = myTicket(techId, ticketId);
        Map<String, Object> m = new LinkedHashMap<>();
        Instant now = clock.instant();
        long freshLimit = 2L * props.iot().telemetryIntervalSeconds();
        if (t.getTargetType() == TargetType.VEHICLE) {
            Vehicle v = vehicles.findById(t.getTargetId()).orElseThrow();
            boolean fresh = v.getLastSeenAt() != null && Duration.between(v.getLastSeenAt(), now).getSeconds() <= freshLimit;
            m.put("sensorFresh", fresh);
            m.put("lastSeenAt", v.getLastSeenAt());
            m.put("errorCode", v.getErrorCode());
            m.put("batteryPercent", v.getBatteryPercent());
            m.put("batteryOk", v.getBatteryPercent() >= props.vehicle().minBatteryPercent());
            m.put("atHub", v.getHubId() != null);
            m.put("otherOpenIncidents", incidentRepo.findByStatusInOrderByIdDesc(IncidentService.OPEN).stream()
                    .filter(i -> i.getTargetType() == TargetType.VEHICLE && i.getTargetId().equals(v.getId()) && !orderIncident(t, i)).count());
        } else if (t.getTargetType() == TargetType.CHARGING_PORT) {
            ChargingPort p = ports.findById(t.getTargetId()).orElseThrow();
            m.put("sensorFresh", p.getLastSeenAt() != null && Duration.between(p.getLastSeenAt(), now).getSeconds() <= freshLimit);
            m.put("lastSeenAt", p.getLastSeenAt());
            m.put("errorCode", p.getErrorCode());
        }
        return m;
    }

    /**
     * MT05 – cập nhật tiến trình. "Hoàn tất" → đóng sự cố liên quan, tài nguyên sang Chờ kiểm tra,
     * hệ thống XÁC MINH lại dữ liệu cảm biến/pin/sự cố mở rồi mới đưa về Sẵn sàng (E2: không đạt → Cần sạc/Báo lỗi).
     */
    public ProgressResult updateProgress(Long techId, Long ticketId, ProgressRequest r) {
        record Step(TicketView view, TargetType type, Long target, boolean verify, boolean orderClosed) {}
        Step s = tx.inNewTx(() -> {
            MaintenanceTicket t = myTicket(techId, ticketId);
            if (!t.isOpen()) throw new BusinessException(ErrorCode.INVALID_STATE, "Phiếu đã kết thúc");
            t.setProgress(r.progress());
            if (r.note() != null) t.setVerificationNote(r.note());
            boolean verify = false;
            switch (r.progress()) {
                case DONE -> {
                    restoreToPendingCheck(t.getTargetType(), t.getTargetId());
                    resolveIncidents(t);
                    verify = true;
                }
                case UNREPAIRABLE -> retire(t.getTargetType(), t.getTargetId());
                default -> { }
            }
            MaintenanceOrder o = orders.lockById(t.getOrderId()).orElseThrow();
            boolean allDone = tickets.findByOrderIdOrderById(o.getId()).stream().noneMatch(MaintenanceTicket::isOpen);
            o.setStatus(allDone ? MaintenanceOrderStatus.DONE : MaintenanceOrderStatus.IN_PROGRESS);
            audit.record(techId, "TICKET_PROGRESS", "MAINTENANCE_TICKET", ticketId, Map.of("progress", r.progress().name()));
            return new Step(ticket(t), t.getTargetType(), t.getTargetId(), verify, allDone);
        });
        String status = null, verification = null;
        if (s.verify()) {
            ResourceVerifier.Outcome out = tx.inNewTx(() -> s.type() == TargetType.VEHICLE ? verifier.verifyVehicle(s.target())
                    : s.type() == TargetType.CHARGING_PORT ? verifier.verifyPort(s.target()) : verifier.verifySlot(s.target()));
            status = out.result();
            verification = out.reason();
            if (!"AVAILABLE".equals(status)) {
                String st = status, reason = verification;
                tx.runInNewTx(() -> alerts.raise(AlertType.DEVICE_ERROR, null, s.type().name(), s.target(), AlertSeverity.WARNING,
                        incidents.label(s.type(), s.target()) + " chưa đạt xác minh sau bảo trì: " + st + " – " + reason));
            }
        }
        return new ProgressResult(s.view(), status, verification, s.orderClosed());
    }

    private void restoreToPendingCheck(TargetType type, Long id) {
        if (type == TargetType.VEHICLE) {
            vehicles.lockById(id).ifPresent(v -> {
                if (v.getStatus() == VehicleStatus.MAINTENANCE_LOCKED || v.getStatus() == VehicleStatus.FAULTY) {
                    v.setStatus(VehicleStatus.PENDING_CHECK);
                    v.setErrorCode(null);
                }
            });
        } else if (type == TargetType.CHARGING_PORT) {
            ports.lockById(id).ifPresent(p -> {
                if (p.getStatus() == PortStatus.MAINTENANCE || p.getStatus() == PortStatus.FAULTY) {
                    p.setStatus(PortStatus.PENDING_CHECK);
                    p.setErrorCode(null);
                }
            });
        }
    }

    /** E1/MT05-E1: hỏng nặng → ngừng sử dụng, loại khỏi phân bổ. */
    private void retire(TargetType type, Long id) {
        if (type == TargetType.VEHICLE) {
            vehicles.lockById(id).ifPresent(v -> { v.setStatus(VehicleStatus.OUT_OF_SERVICE); events.hubChanged(v.getHubId()); });
        } else if (type == TargetType.CHARGING_PORT) {
            ports.lockById(id).ifPresent(p -> { p.setStatus(PortStatus.DISABLED); events.hubChanged(p.getHubId()); });
        }
    }

    private void resolveIncidents(MaintenanceTicket t) {
        incidentRepo.findByStatusInOrderByIdDesc(IncidentService.OPEN).stream()
                .filter(i -> i.getTargetType() == t.getTargetType() && i.getTargetId().equals(t.getTargetId()))
                .forEach(i -> incidentRepo.lockById(i.getId()).ifPresent(x -> x.setStatus(IncidentStatus.RESOLVED)));
    }

    /** MT02 bước 5: Đơn vị vận hành nghiệm thu và đóng phiếu sự cố. */
    @Transactional
    public IncidentView closeIncident(Long operatorId, Long incidentId) {
        Incident i = incidentRepo.lockById(incidentId).orElseThrow(() -> BusinessException.notFound("Phiếu sự cố", incidentId));
        boolean openOrders = orders.findByIncidentId(incidentId).stream().anyMatch(o -> OPEN_ORDER.contains(o.getStatus()));
        if (openOrders) throw new BusinessException(ErrorCode.INVALID_STATE, "Phiếu bảo trì liên quan chưa hoàn tất");
        i.close(clock.instant());
        alerts.resolveIfOpen(AlertType.DEVICE_ERROR, i.getHubId(), i.getTargetType().name(), i.getTargetId());
        audit.record(operatorId, "INCIDENT_CLOSE", "INCIDENT", incidentId, null);
        if (i.getReporterId() != null) {
            notifications.notify(i.getReporterId(), "INCIDENT_CLOSED", "Sự cố đã được xử lý", "Phiếu " + i.getCode() + " đã được xử lý xong. Cảm ơn bạn!");
        }
        return incidents.view(i);
    }

    private void lockTarget(TargetType type, Long id, String reason) {
        if (type == TargetType.VEHICLE) {
            Vehicle v = vehicles.lockById(id).orElseThrow();
            if (v.getStatus().inCustomerUse() || v.getStatus() == VehicleStatus.TRANSFER_LOCKED || v.getStatus() == VehicleStatus.IN_TRANSIT) {
                if (v.getStatus() != VehicleStatus.RESERVED) {
                    throw new BusinessException(ErrorCode.VEHICLE_IN_OTHER_OPERATION, "Xe " + v.getCode() + " đang " + v.getStatus());
                }
            }
            if (v.getStatus() != VehicleStatus.MAINTENANCE_LOCKED && v.getStatus() != VehicleStatus.OUT_OF_SERVICE) {
                v.setStatus(VehicleStatus.MAINTENANCE_LOCKED);
                impact.onVehicleUnavailable(v, reason);
                events.hubChanged(v.getHubId());
            }
        } else if (type == TargetType.CHARGING_PORT) {
            ChargingPort p = ports.lockById(id).orElseThrow();
            if (p.getStatus() == PortStatus.OCCUPIED) {
                throw new BusinessException(ErrorCode.PORT_IN_USE, "Cổng đang sạc – dừng phiên sạc trước khi bảo trì");
            }
            p.setStatus(PortStatus.MAINTENANCE);
            impact.onPortUnavailable(p, reason);
            events.hubChanged(p.getHubId());
        }
    }

    private boolean orderIncident(MaintenanceTicket t, Incident i) {
        return orders.findById(t.getOrderId()).map(o -> i.getId().equals(o.getIncidentId())).orElse(false);
    }

    private void requireTechnician(Long id) {
        AppUser u = users.findById(id).orElseThrow(() -> BusinessException.notFound("Kỹ thuật viên", id));
        if (!u.hasRole(Role.TECHNICIAN)) throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Người được phân công không phải kỹ thuật viên");
    }

    private void notifyTech(MaintenanceOrder o, String what) {
        notifications.notify(o.getTechnicianId(), "MAINTENANCE_ASSIGNED", "Lệnh bảo trì mới", "Lệnh " + o.getCode() + " – " + what + " (ưu tiên " + o.getPriority() + ")");
    }

    private MaintenanceTicket myTicket(Long techId, Long ticketId) {
        MaintenanceTicket t = tickets.lockById(ticketId).orElseThrow(() -> BusinessException.notFound("Phiếu bảo trì", ticketId));
        MaintenanceOrder o = orders.findById(t.getOrderId()).orElseThrow();
        if (!techId.equals(o.getTechnicianId())) throw BusinessException.notFound("Phiếu bảo trì", ticketId);
        return t;
    }

    private boolean targetExists(TargetType type, Long id) {
        return switch (type) {
            case VEHICLE -> vehicles.existsById(id);
            case CHARGING_PORT -> ports.existsById(id);
            default -> true;
        };
    }

    OrderView view(MaintenanceOrder o) {
        String tech = o.getTechnicianId() == null ? null : users.findById(o.getTechnicianId()).map(AppUser::getFullName).orElse("?");
        String inc = o.getIncidentId() == null ? null : incidentRepo.findById(o.getIncidentId()).map(Incident::getCode).orElse(null);
        return new OrderView(o.getId(), o.getCode(), tech, o.getTechnicianId(), o.getStatus(), o.getPriority(), o.getDueAt(), inc, o.getNote(),
                o.getCreatedAt(), tickets.findByOrderIdOrderById(o.getId()).stream().map(this::ticket).toList());
    }

    private TicketView ticket(MaintenanceTicket t) {
        return new TicketView(t.getId(), t.getTargetType(), t.getTargetId(), incidents.label(t.getTargetType(), t.getTargetId()), t.getProgress(),
                t.getDiagnosis(), t.getRepairItems(), t.getReplacedParts(), t.getVerificationNote());
    }
}
