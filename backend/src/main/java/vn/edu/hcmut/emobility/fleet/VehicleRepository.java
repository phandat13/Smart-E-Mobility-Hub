package vn.edu.hcmut.emobility.fleet;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByCode(String code);
    List<Vehicle> findByHubIdOrderByBatteryPercentDesc(Long hubId);
    List<Vehicle> findByHubIdAndStatusOrderByBatteryPercentDesc(Long hubId, VehicleStatus status);
    List<Vehicle> findByStatus(VehicleStatus status);
    List<Vehicle> findByStatusIn(Collection<VehicleStatus> statuses);
    List<Vehicle> findAllByOrderByCode();
    long countByHubIdAndStatus(Long hubId, VehicleStatus status);
    long countByHubId(Long hubId);

    /**
     * Compare-and-set: chuyển trạng thái CHỈ KHI xe vẫn ở trạng thái mong đợi.
     * Trả về 1 nếu thành công, 0 nếu xe đã bị giao dịch khác chiếm trước (góp ý #3).
     * Phải là thao tác đầu tiên trên xe trong giao dịch (không nạp entity trước đó).
     */
    @Modifying
    @Query("update Vehicle v set v.status = :to, v.version = v.version + 1, v.updatedAt = :now where v.id = :id and v.status = :from")
    int cas(@Param("id") Long id, @Param("from") VehicleStatus from, @Param("to") VehicleStatus to, @Param("now") Instant now);

    /** RE01 bước 1a–1b: kiểm tra lần cuối "Sẵn sàng" + đủ pin + đang ở Hub, rồi giữ xe – MỘT câu lệnh nguyên tử. */
    @Modifying
    @Query("update Vehicle v set v.status = :to, v.version = v.version + 1, v.updatedAt = :now "
            + "where v.id = :id and v.hubId is not null and v.status = vn.edu.hcmut.emobility.fleet.VehicleStatus.AVAILABLE "
            + "and v.batteryPercent >= :minBattery and v.errorCode is null")
    int casFromAvailable(@Param("id") Long id, @Param("minBattery") short minBattery,
                         @Param("to") VehicleStatus to, @Param("now") Instant now);

    /** RB01/MT03: khóa xe cho vận hành – chỉ khi xe vẫn Sẵn sàng tại đúng Hub. */
    @Modifying
    @Query("update Vehicle v set v.status = :to, v.version = v.version + 1, v.updatedAt = :now "
            + "where v.id = :id and v.hubId = :hubId and v.status in :from")
    int casAtHub(@Param("id") Long id, @Param("hubId") Long hubId, @Param("from") Collection<VehicleStatus> from,
                 @Param("to") VehicleStatus to, @Param("now") Instant now);

    @Modifying
    @Query("update Vehicle v set v.status = :to, v.version = v.version + 1, v.updatedAt = :now where v.id = :id and v.status in :from")
    int casFrom(@Param("id") Long id, @Param("from") Collection<VehicleStatus> from, @Param("to") VehicleStatus to, @Param("now") Instant now);

    /** Nhịp tim xe đang đỗ tại Hub (không tăng version, bỏ qua dòng đang bị giao dịch nghiệp vụ khóa). */
    @Modifying
    @Query(value = "update vehicle set last_seen_at = :now where id in (select id from vehicle where hub_id = :hubId for update skip locked)", nativeQuery = true)
    int heartbeat(@Param("hubId") Long hubId, @Param("now") Instant now);

    @Query("select v.id from Vehicle v where v.code = :code")
    Optional<Long> findIdByCode(@Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Vehicle v where v.id = :id")
    Optional<Vehicle> lockById(@Param("id") Long id);

    @Query("select v from Vehicle v where v.hubId = :hubId and v.status = vn.edu.hcmut.emobility.fleet.VehicleStatus.AVAILABLE "
            + "and v.batteryPercent >= :minBattery and v.id <> :excludeId order by v.batteryPercent desc")
    List<Vehicle> alternatives(@Param("hubId") Long hubId, @Param("minBattery") short minBattery,
                               @Param("excludeId") Long excludeId, Pageable page);

    /** Chỉ trả về id để bên gọi tự khóa dòng (tránh nạp entity rồi mới khóa). */
    @Query("select v.id from Vehicle v where v.hubId = :hubId and v.status = vn.edu.hcmut.emobility.fleet.VehicleStatus.AVAILABLE "
            + "and v.batteryPercent >= :minBattery and v.errorCode is null and v.id <> :excludeId order by v.batteryPercent desc")
    List<Long> alternativeIds(@Param("hubId") Long hubId, @Param("minBattery") short minBattery,
                              @Param("excludeId") Long excludeId, Pageable page);

    @Query("select v.id from Vehicle v where v.hubId = :hubId and v.status = vn.edu.hcmut.emobility.fleet.VehicleStatus.AVAILABLE "
            + "and v.batteryPercent >= :minBattery and v.errorCode is null order by v.batteryPercent desc")
    List<Long> availableIds(@Param("hubId") Long hubId, @Param("minBattery") short minBattery, Pageable page);

    @Query("select v.hubId, v.status, count(v), avg(v.batteryPercent) from Vehicle v where v.hubId is not null group by v.hubId, v.status")
    List<Object[]> countGrouped();
}
