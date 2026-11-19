package vn.edu.hcmut.emobility.it;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.personal.BookingService;
import vn.edu.hcmut.emobility.personal.PersonalDtos.ConfirmRequest;
import vn.edu.hcmut.emobility.personal.ServiceType;
import vn.edu.hcmut.emobility.rental.RentalDtos.ReservationView;
import vn.edu.hcmut.emobility.rental.RentalDtos.ReserveRequest;
import vn.edu.hcmut.emobility.rental.ReservationService;

/** NFR "Tính nhất quán khi truy cập đồng thời" + góp ý #3, #4, #7. */
class ConsistencyIT extends IntegrationTestBase {

    @Autowired ReservationService reservations;
    @Autowired BookingService bookings;

    @Test
    void hundredConcurrentReservationsOnOneVehicle_exactlyOneSucceeds() throws Exception {
        heartbeatAll();
        long vehicle = vehicleId(availableVehicle(1));
        List<Long> students = createStudents("cc", 100);
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<String>> futures = new ArrayList<>();
        for (Long sid : students) {
            futures.add(pool.submit(() -> {
                go.await();
                try {
                    reservations.reserve(sid, new ReserveRequest(vehicle, null));
                    return "OK";
                } catch (BusinessException e) {
                    return e.getCode().name();
                } catch (DataIntegrityViolationException e) {
                    return "DB_GUARD";
                }
            }));
        }
        go.countDown();
        Map<String, Integer> tally = new HashMap<>();
        for (Future<String> f : futures) tally.merge(f.get(60, TimeUnit.SECONDS), 1, Integer::sum);
        pool.shutdown();
        assertEquals(1, tally.getOrDefault("OK", 0).intValue(), "Đúng 1 yêu cầu thành công: " + tally);
        assertEquals(99, tally.getOrDefault("VEHICLE_UNAVAILABLE", 0).intValue() + tally.getOrDefault("DB_GUARD", 0).intValue(), tally.toString());
        assertEquals(1, jdbc.queryForObject("select count(*) from reservation where vehicle_id = ? and status = 'RESERVED'", Integer.class, vehicle).intValue());
        assertEquals("RESERVED", vehicleStatus(vehicle));
    }

    @Test
    void extendWithSameIdempotencyKeyTwice_addsTimeOnlyOnce_andMaxTwoExtensions() {
        heartbeatAll();
        long student = createStudents("ext", 1).get(0);
        ReservationView r = reservations.reserve(student, new ReserveRequest(vehicleId(availableVehicle(3)), null));
        ReservationView a = reservations.extend(student, r.id(), "key-1");
        ReservationView b = reservations.extend(student, r.id(), "key-1"); // bấm lặp do mạng chậm
        assertEquals(r.expiresAt().plus(10, ChronoUnit.MINUTES), a.expiresAt());
        assertEquals(a.expiresAt(), b.expiresAt(), "Không được cộng thời gian hai lần");
        assertEquals(1, b.extensionCount());
        reservations.extend(student, r.id(), "key-2");
        BusinessException ex = assertThrows(BusinessException.class, () -> reservations.extend(student, r.id(), "key-3"));
        assertEquals(ErrorCode.MAX_EXTENSIONS_REACHED, ex.getCode());
        reservations.cancel(student, r.id());
        BusinessException late = assertThrows(BusinessException.class, () -> reservations.extend(student, r.id(), "key-4"));
        assertEquals(ErrorCode.RESERVATION_NOT_ACTIVE, late.getCode(), "Đơn đã hủy đồng thời thì không được gia hạn");
    }

    @Test
    void bookBoth_whenPortAlreadyTaken_rollsBackParkingToo() {
        heartbeatAll();
        long owner = jdbc.queryForObject("select id from app_user where username = 'anh.nm2410717'", Long.class);
        long pv = jdbc.queryForObject("select id from personal_vehicle where plate_number = '59-X1 123.45'", Long.class);
        long slot = jdbc.queryForObject("select id from parking_slot where hub_id = 2 and kind = 'PERSONAL' order by code limit 1", Long.class);
        long port = jdbc.queryForObject("select id from charging_port where hub_id = 2 and connector_type = 'TYPE_2' order by code limit 1", Long.class);
        Instant start = Instant.now().plus(3, ChronoUnit.HOURS).truncatedTo(ChronoUnit.MINUTES);
        Instant end = start.plus(1, ChronoUnit.HOURS);
        // người khác đã giữ cổng trong khung giờ này
        jdbc.update("insert into port_reservation (port_id, start_at, end_at, source_type, source_id, status) values (?, ?, ?, 'BOOKING', 999999, 'ACTIVE')",
                port, java.sql.Timestamp.from(start), java.sql.Timestamp.from(end));
        BusinessException ex = assertThrows(BusinessException.class,
                () -> bookings.confirm(owner, new ConfirmRequest(2L, pv, ServiceType.BOTH, start, end, slot, port)));
        assertEquals(ErrorCode.SLOT_UNAVAILABLE, ex.getCode());
        assertEquals(0, jdbc.queryForObject("select count(*) from slot_booking where slot_id = ? and start_at = ?", Integer.class,
                slot, java.sql.Timestamp.from(start)).intValue(), "Không được giữ dở dang chỗ đỗ khi không giữ được cổng sạc");
    }
}
