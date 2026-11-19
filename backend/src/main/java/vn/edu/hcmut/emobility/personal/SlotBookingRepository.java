package vn.edu.hcmut.emobility.personal;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SlotBookingRepository extends JpaRepository<SlotBooking, Long> {
    List<SlotBooking> findByOwnerIdOrderByIdDesc(Long ownerId);
    Optional<SlotBooking> findByQrToken(String qrToken);
    boolean existsByPersonalVehicleIdAndStatusIn(Long vehicleId, Collection<BookingStatus> statuses);
    long countByHubIdAndStatusIn(Long hubId, Collection<BookingStatus> statuses);
    List<SlotBooking> findBySlotIdAndStatusIn(Long slotId, Collection<BookingStatus> statuses);
    List<SlotBooking> findByPortIdAndStatusIn(Long portId, Collection<BookingStatus> statuses);
    List<SlotBooking> findByStatusIn(Collection<BookingStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from SlotBooking b where b.id = :id")
    Optional<SlotBooking> lockById(@Param("id") Long id);

    @Query("select b.id from SlotBooking b where b.status = vn.edu.hcmut.emobility.personal.BookingStatus.BOOKED and b.startAt < :cutoff")
    List<Long> findNoShow(@Param("cutoff") Instant cutoff);

    /** Kiểm tra khung giờ tiếp giáp trên cùng ô (PV04). */
    @Query("select case when count(b) > 0 then true else false end from SlotBooking b where b.slotId = :slotId and b.id <> :excludeId "
            + "and b.status in (vn.edu.hcmut.emobility.personal.BookingStatus.BOOKED, vn.edu.hcmut.emobility.personal.BookingStatus.IN_USE, "
            + "vn.edu.hcmut.emobility.personal.BookingStatus.CHECKOUT_REQUESTED, vn.edu.hcmut.emobility.personal.BookingStatus.AWAITING_EXIT) "
            + "and b.startAt < :endAt and b.endAt > :startAt")
    boolean slotOverlaps(@Param("slotId") Long slotId, @Param("excludeId") Long excludeId,
                         @Param("startAt") Instant startAt, @Param("endAt") Instant endAt);
}
