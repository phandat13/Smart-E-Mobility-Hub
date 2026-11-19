package vn.edu.hcmut.emobility.personal;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PortReservationRepository extends JpaRepository<PortReservation, Long> {
    Optional<PortReservation> findBySourceTypeAndSourceIdAndStatus(PortReservationSource type, Long sourceId, PortReservationStatus status);

    @Query("select r from PortReservation r where r.portId = :portId and r.status = vn.edu.hcmut.emobility.personal.PortReservationStatus.ACTIVE "
            + "and r.startAt < :endAt and r.endAt > :startAt and r.id <> :excludeId order by r.startAt")
    List<PortReservation> overlapping(@Param("portId") Long portId, @Param("startAt") Instant startAt, @Param("endAt") Instant endAt,
                                      @Param("excludeId") Long excludeId);

    @Query("select r from PortReservation r where r.portId = :portId and r.status = vn.edu.hcmut.emobility.personal.PortReservationStatus.ACTIVE "
            + "and r.endAt > :from order by r.startAt")
    List<PortReservation> activeFrom(@Param("portId") Long portId, @Param("from") Instant from);
}
