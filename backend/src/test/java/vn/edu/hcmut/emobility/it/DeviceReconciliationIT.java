package vn.edu.hcmut.emobility.it;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.edu.hcmut.emobility.core.crypto.OfflineOtp;
import vn.edu.hcmut.emobility.core.iot.*;
import vn.edu.hcmut.emobility.iot.TelemetryMessage;
import vn.edu.hcmut.emobility.rental.RentalDtos.*;
import vn.edu.hcmut.emobility.rental.TripService;

/** Góp ý #5 (mở khóa không xác định) và #6 (trả xe offline chỉ hoàn tất khi có bằng chứng vật lý). */
class DeviceReconciliationIT extends IntegrationTestBase {

    @Autowired TripService trips;
    @Autowired SimulatedIotGateway gateway;
    @Autowired DeviceCommandService commands;

    @Test
    void unknownUnlockResult_keepsVehicleReconciling_thenReconcilesFromDeviceState() {
        heartbeatAll();
        long student = createStudents("unk", 1).get(0);
        String code = availableVehicle(5);
        long v = vehicleId(code);
        gateway.enqueue(DeviceType.VEHICLE, v, SimulatedIotGateway.Behavior.LOST_RESPONSE); // thiết bị đã mở nhưng mất phản hồi
        PickupResult r = trips.pickup(student, new PickupRequest(code, null));
        assertEquals(PickupState.RECONCILING, r.state());
        assertEquals("UNLOCK_RECONCILING", vehicleStatus(v), "Không được đưa xe về Available khi chưa rõ kết quả");
        DeviceCommand c = commands.pendingReconciliation().stream()
                .filter(x -> x.getDeviceId().equals(v) && x.getCommand() == CommandType.UNLOCK).findFirst().orElseThrow();
        trips.reconcileUnlock(c);
        assertEquals("IN_USE", vehicleStatus(v));
        assertNotNull(trips.active(student).trip(), "Đối soát xác nhận đã mở khóa → chuyến đi bắt đầu");
    }

    @Test
    void offlineReturn_completesOnlyAfterPhysicalEvidence() {
        heartbeatAll();
        long student = createStudents("off", 1).get(0);
        String code = availableVehicle(7);
        long v = vehicleId(code);
        PickupResult started = trips.pickup(student, new PickupRequest(code, null));
        assertEquals(PickupState.STARTED, started.state());
        TripView t = started.trip();
        Instant now = Instant.now();
        String otp = OfflineOtp.generate(t.offlineSecret(), OfflineOtp.counterAt(now));
        ReturnResult rr = trips.offlineReturn(student, t.id(), new OfflineReturnRequest(otp, now));
        assertEquals(ReturnState.PENDING_RECONCILIATION, rr.state(), "OTP không thay thế xác nhận vật lý");
        trips.reconcileReturn(t.id());
        assertEquals("PENDING_RECONCILIATION", jdbc.queryForObject("select status from trip where id = ?", String.class, t.id()));
        // Bằng chứng vật lý: cảm biến ô báo xe nằm trong ô hợp lệ + khóa an toàn
        long slot = jdbc.queryForObject("select id from parking_slot where hub_id = 7 and kind = 'SHARED' and status = 'AVAILABLE' order by code limit 1", Long.class);
        telemetry.ingest(TelemetryMessage.slot(slot, true, v), false);
        gateway.setLock(v, LockState.LOCKED);
        telemetry.ingest(TelemetryMessage.vehicle(v, null, null, LockState.LOCKED, null), false);
        trips.reconcileReturn(t.id());
        assertEquals("COMPLETED", jdbc.queryForObject("select status from trip where id = ?", String.class, t.id()));
    }
}
