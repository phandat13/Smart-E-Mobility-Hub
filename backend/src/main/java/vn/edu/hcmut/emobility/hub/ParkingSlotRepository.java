package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {
    List<ParkingSlot> findByHubIdOrderByCode(Long hubId);
    List<ParkingSlot> findByHubIdAndKindOrderByCode(Long hubId, SlotKind kind);
    Optional<ParkingSlot> findByVehicleId(Long vehicleId);
    Optional<ParkingSlot> findByHubIdAndCode(Long hubId, String code);
    List<ParkingSlot> findByStatus(SlotStatus status);
    List<ParkingSlot> findByHeldForItemId(Long itemId);
    long countByHubIdAndKindAndStatus(Long hubId, SlotKind kind, SlotStatus status);
    long countByHubIdAndKind(Long hubId, SlotKind kind);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ParkingSlot s where s.id = :id")
    Optional<ParkingSlot> lockById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ParkingSlot s where s.vehicleId = :vehicleId")
    Optional<ParkingSlot> lockByVehicleId(@Param("vehicleId") Long vehicleId);

    /** Góp ý #10: khóa N ô trống tại Hub đích để giữ capacity cho xe đang điều chuyển tới. */
    @Query(value = "select * from parking_slot where hub_id = :hubId and kind = 'SHARED' and status = 'AVAILABLE' "
            + "order by code limit :n for update skip locked", nativeQuery = true)
    List<ParkingSlot> lockFreeSharedSlots(@Param("hubId") Long hubId, @Param("n") int n);

    @Query("select s.hubId, s.kind, s.status, count(s) from ParkingSlot s group by s.hubId, s.kind, s.status")
    List<Object[]> countGrouped();

    /** Ô cá nhân không bị chiếm trong khung giờ yêu cầu (PV01 bước 3). */
    @Query(value = "select s.* from parking_slot s where s.hub_id = :hubId and s.kind = 'PERSONAL' "
            + "and s.status not in ('FAULTY', 'DISABLED') and not exists (select 1 from slot_booking b where b.slot_id = s.id "
            + "and b.status in ('BOOKED', 'IN_USE', 'CHECKOUT_REQUESTED', 'AWAITING_EXIT') "
            + "and tstzrange(b.start_at, b.end_at) && tstzrange(cast(:startAt as timestamptz), cast(:endAt as timestamptz))) "
            + "order by s.code", nativeQuery = true)
    List<ParkingSlot> freePersonalSlots(@Param("hubId") Long hubId, @Param("startAt") Instant startAt, @Param("endAt") Instant endAt);

    @Query(value = "select s.id from parking_slot s where s.hub_id = :hubId and s.kind = 'PERSONAL' "
            + "and s.status not in ('FAULTY', 'DISABLED') and not exists (select 1 from slot_booking b where b.slot_id = s.id "
            + "and b.status in ('BOOKED', 'IN_USE', 'CHECKOUT_REQUESTED', 'AWAITING_EXIT') "
            + "and tstzrange(b.start_at, b.end_at) && tstzrange(cast(:startAt as timestamptz), cast(:endAt as timestamptz))) "
            + "order by s.code", nativeQuery = true)
    List<Long> freePersonalSlotIds(@Param("hubId") Long hubId, @Param("startAt") Instant startAt, @Param("endAt") Instant endAt);

    /** Nhịp tim cảm biến: cập nhật độ mới dữ liệu, không tăng version (không xung đột với nghiệp vụ). */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "update parking_slot set last_seen_at = :now where id in (select id from parking_slot where hub_id = :hubId for update skip locked)", nativeQuery = true)
    int heartbeat(@Param("hubId") Long hubId, @Param("now") Instant now);

    @Query("select count(s) from ParkingSlot s where s.hubId = :hubId and s.status in :statuses")
    long countByHubIdAndStatusIn(@Param("hubId") Long hubId, @Param("statuses") Collection<SlotStatus> statuses);
}
