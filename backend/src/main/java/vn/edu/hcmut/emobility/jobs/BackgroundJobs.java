package vn.edu.hcmut.emobility.jobs;

import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.charging.ChargingSessionService;
import vn.edu.hcmut.emobility.charging.SmartChargingService;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.iot.CommandType;
import vn.edu.hcmut.emobility.core.iot.DeviceCommand;
import vn.edu.hcmut.emobility.core.iot.DeviceCommandService;
import vn.edu.hcmut.emobility.fleet.ResourceVerifier;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.hub.PortStatus;
import vn.edu.hcmut.emobility.hub.SlotStatus;
import vn.edu.hcmut.emobility.iot.DeviceSimulator;
import vn.edu.hcmut.emobility.monitoring.AlertDetectionService;
import vn.edu.hcmut.emobility.personal.BookingService;
import vn.edu.hcmut.emobility.personal.CheckInService;
import vn.edu.hcmut.emobility.rebalance.TransferService;
import vn.edu.hcmut.emobility.rental.ReservationService;
import vn.edu.hcmut.emobility.rental.TripService;

/**
 * Mục 2.3 – các chức năng phi tương tác do hệ thống tự động thực hiện.
 * Mỗi công việc tự bắt lỗi để một lỗi không làm dừng bộ lập lịch.
 */
@Component
public class BackgroundJobs {

    private static final Logger log = LoggerFactory.getLogger(BackgroundJobs.class);

    private final ReservationService reservations;
    private final BookingService bookings;
    private final CheckInService checkIn;
    private final TripService trips;
    private final DeviceCommandService commands;
    private final ResourceVerifier verifier;
    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final AlertDetectionService detection;
    private final SmartChargingService charging;
    private final ChargingSessionService chargingSessions;
    private final TransferService transfers;
    private final ObjectProvider<DeviceSimulator> simulator;
    private final TxRunner tx;

    public BackgroundJobs(ReservationService reservations, BookingService bookings, CheckInService checkIn, TripService trips,
                          DeviceCommandService commands, ResourceVerifier verifier, VehicleRepository vehicles, ParkingSlotRepository slots,
                          ChargingPortRepository ports, AlertDetectionService detection, SmartChargingService charging,
                          ChargingSessionService chargingSessions, TransferService transfers, ObjectProvider<DeviceSimulator> simulator, TxRunner tx) {
        this.reservations = reservations;
        this.bookings = bookings;
        this.checkIn = checkIn;
        this.trips = trips;
        this.commands = commands;
        this.verifier = verifier;
        this.vehicles = vehicles;
        this.slots = slots;
        this.ports = ports;
        this.detection = detection;
        this.charging = charging;
        this.chargingSessions = chargingSessions;
        this.transfers = transfers;
        this.simulator = simulator;
        this.tx = tx;
    }

    /** Tự động hết hạn đơn đặt trước (mỗi 1 phút). */
    @Scheduled(fixedDelayString = "60000", initialDelayString = "15000")
    public void expireReservations() {
        run("expire-reservations", () -> {
            int a = reservations.expireDue();
            int b = bookings.expireNoShows();
            if (a + b > 0) log.info("Hết hạn {} đơn đặt xe, {} đặt chỗ đỗ/sạc", a, b);
        });
    }

    /** Xác minh tài nguyên "Chờ kiểm tra" trước khi đưa trở lại phục vụ. */
    @Scheduled(fixedDelayString = "PT${app.iot.telemetry-interval-seconds:30}S", initialDelayString = "10000")
    public void verifyResources() {
        run("verify-resources", () -> {
            tx.inNewTx(() -> vehicles.findByStatus(VehicleStatus.PENDING_CHECK).stream().map(v -> v.getId()).toList())
                    .forEach(id -> safe(() -> verifier.verifyVehicle(id)));
            tx.inNewTx(() -> slots.findByStatus(SlotStatus.PENDING_CHECK).stream().map(s -> s.getId()).toList())
                    .forEach(id -> safe(() -> verifier.verifySlot(id)));
            tx.inNewTx(() -> ports.findByStatus(PortStatus.PENDING_CHECK).stream().map(p -> p.getId()).toList())
                    .forEach(id -> safe(() -> verifier.verifyPort(id)));
        });
    }

    /** Cảnh báo quá tải, mất cân đối, Hub mất kết nối, xe/thiết bị lỗi. */
    @Scheduled(fixedDelayString = "PT${app.iot.telemetry-interval-seconds:30}S", initialDelayString = "20000")
    public void detectAlerts() {
        run("detect-alerts", () -> {
            detection.detectHubConditions();
            detection.detectDeviceErrors();
        });
    }

    /** Đối soát kết quả thiết bị không xác định (góp ý #5, #6, #8). */
    @Scheduled(fixedDelayString = "20000", initialDelayString = "25000")
    public void reconcile() {
        run("reconcile", () -> {
            for (DeviceCommand c : tx.inNewTx(commands::pendingReconciliation)) {
                if (c.getCommand() == CommandType.UNLOCK && TripService.CTX_PICKUP.equals(c.getContextType())) {
                    safeRun(() -> trips.reconcileUnlock(c));
                }
            }
            trips.pendingReturnIds().forEach(id -> safeRun(() -> trips.reconcileReturn(id)));
            safeRun(checkIn::reconcileCheckouts);
        });
    }

    /** Cập nhật thứ tự ưu tiên sạc mỗi 10 phút; dừng phiên quá khung giờ. */
    @Scheduled(fixedDelayString = "PT${app.charging.recalc-interval-minutes:10}M", initialDelayString = "30000")
    public void chargingPriorities() {
        run("charging-priority", () -> {
            int n = charging.recalcPriorities();
            if (n > 0) log.info("Cập nhật ưu tiên cho {} mục lịch sạc", n);
        });
    }

    @Scheduled(fixedDelayString = "60000", initialDelayString = "35000")
    public void chargingWindows() {
        run("charging-window", () -> chargingSessions.activeFleetSessionsPastWindow()
                .forEach(id -> safeRun(() -> chargingSessions.stopFleetSession(id, "Hết khung giờ lịch sạc"))));
    }

    /** Hàng đợi lệnh điều chuyển chờ tài xế rảnh (RB01-E1). */
    @Scheduled(fixedDelayString = "60000", initialDelayString = "40000")
    public void transferQueue() {
        run("transfer-queue", transfers::assignQueued);
    }

    /** Thiết bị giả lập gửi dữ liệu định kỳ (≤ 30 giây). */
    @Scheduled(fixedDelayString = "PT${app.iot.telemetry-interval-seconds:30}S", initialDelayString = "2000")
    public void simulateDevices() {
        Optional.ofNullable(simulator.getIfAvailable()).ifPresent(s -> run("device-simulator", s::tick));
    }

    private void run(String name, Runnable r) {
        try {
            r.run();
        } catch (RuntimeException e) {
            log.warn("Tiến trình nền {} lỗi: {}", name, e.getMessage());
        }
    }

    private void safe(Runnable r) {
        try {
            tx.runInNewTx(r);
        } catch (RuntimeException e) {
            log.debug("Bỏ qua: {}", e.getMessage());
        }
    }

    private void safeRun(Runnable r) {
        try {
            r.run();
        } catch (RuntimeException e) {
            log.debug("Bỏ qua: {}", e.getMessage());
        }
    }
}
