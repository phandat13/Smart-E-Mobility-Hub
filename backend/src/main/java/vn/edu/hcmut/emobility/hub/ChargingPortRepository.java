package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChargingPortRepository extends JpaRepository<ChargingPort, Long> {
    List<ChargingPort> findByHubIdOrderByCode(Long hubId);
    List<ChargingPort> findByStatus(PortStatus status);
    boolean existsByHubIdAndCode(Long hubId, String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ChargingPort p where p.id = :id")
    Optional<ChargingPort> lockById(@Param("id") Long id);

    /** Nhịp tim cảm biến cổng sạc (không tăng version, bỏ qua dòng đang bị giao dịch nghiệp vụ khóa). */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "update charging_port set last_seen_at = :now where id in (select id from charging_port where hub_id = :hubId for update skip locked)", nativeQuery = true)
    int heartbeat(@Param("hubId") Long hubId, @Param("now") Instant now);

    @Query("select p.hubId, p.status, count(p) from ChargingPort p group by p.hubId, p.status")
    List<Object[]> countGrouped();

    /** Cổng tương thích còn trống trong khung giờ (không chồng lấn bất kỳ cam kết ACTIVE nào). */
    @Query(value = "select p.* from charging_port p where p.hub_id = :hubId and p.connector_type = :connector "
            + "and p.status in ('AVAILABLE', 'OCCUPIED', 'PENDING_CHECK') and p.disable_after_session = false "
            + "and not exists (select 1 from port_reservation r where r.port_id = p.id and r.status = 'ACTIVE' "
            + "and tstzrange(r.start_at, r.end_at) && tstzrange(cast(:startAt as timestamptz), cast(:endAt as timestamptz))) "
            + "order by p.power_kw desc, p.code", nativeQuery = true)
    List<ChargingPort> freePorts(@Param("hubId") Long hubId, @Param("connector") String connector,
                                 @Param("startAt") Instant startAt, @Param("endAt") Instant endAt);

    /** Như freePorts nhưng chỉ trả id, cổng đang AVAILABLE (dùng trước khi khóa dòng). */
    @Query(value = "select p.id from charging_port p where p.hub_id = :hubId and p.connector_type = :connector "
            + "and p.status = 'AVAILABLE' and p.disable_after_session = false and p.id <> :excludeId "
            + "and not exists (select 1 from port_reservation r where r.port_id = p.id and r.status = 'ACTIVE' "
            + "and tstzrange(r.start_at, r.end_at) && tstzrange(cast(:startAt as timestamptz), cast(:endAt as timestamptz))) "
            + "order by p.power_kw desc, p.code", nativeQuery = true)
    List<Long> freePortIds(@Param("hubId") Long hubId, @Param("connector") String connector,
                           @Param("startAt") Instant startAt, @Param("endAt") Instant endAt, @Param("excludeId") Long excludeId);
}
