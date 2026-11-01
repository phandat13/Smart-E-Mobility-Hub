package vn.edu.hcmut.emobility.parking;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ParkingSlot;
import vn.edu.hcmut.emobility.hub.ResourceStatus;
import vn.edu.hcmut.emobility.hub.SlotKind;

public interface SlotBookingRepository extends JpaRepository<SlotBooking, Long> {

    List<SlotBooking> findByOwnerIdOrderByStartAtDesc(Long ownerId);

    boolean existsByPersonalVehicleId(Long personalVehicleId);

    boolean existsByPersonalVehicleIdAndStatusIn(Long personalVehicleId, Collection<BookingStatus> statuses);

    /** Khóa dòng để check-in (PV03) và job no-show không ghi đè lên nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SlotBooking> findByQrTokenAndOwnerId(String qrToken, Long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from SlotBooking b where b.id = :id")
    Optional<SlotBooking> findByIdForUpdate(Long id);

    /** Hai khoảng [a, b) và [c, d) giao nhau khi a < d và c < b, giống toán tử && của tstzrange. */
    @Query("""
            select count(b) from SlotBooking b
            where b.personalVehicleId = :vehicleId and b.status in :active
              and b.startAt < :endAt and b.endAt > :startAt
            """)
    long countVehicleOverlap(Long vehicleId, Collection<BookingStatus> active, Instant startAt, Instant endAt);

    @Query("""
            select s from ParkingSlot s
            where s.hubId = :hubId and s.kind = :kind and s.status not in :outOfOrder
              and not exists (
                  select b.id from SlotBooking b
                  where b.slotId = s.id and b.status in :active
                    and b.startAt < :endAt and b.endAt > :startAt)
            order by s.code
            """)
    List<ParkingSlot> findFreeSlots(Long hubId, SlotKind kind, Collection<ResourceStatus> outOfOrder,
                                    Collection<BookingStatus> active, Instant startAt, Instant endAt);

    @Query("""
            select p from ChargingPort p
            where p.hubId = :hubId and p.connectorType = :connectorType and p.status not in :outOfOrder
              and not exists (
                  select b.id from SlotBooking b
                  where b.portId = p.id and b.status in :active
                    and b.startAt < :endAt and b.endAt > :startAt)
            order by p.code
            """)
    List<ChargingPort> findFreePorts(Long hubId, String connectorType, Collection<ResourceStatus> outOfOrder,
                                     Collection<BookingStatus> active, Instant startAt, Instant endAt);

    @Query("select b.id from SlotBooking b where b.status = :status and b.startAt <= :cutoff")
    List<Long> findIdsStartedBefore(BookingStatus status, Instant cutoff);
}
