package vn.edu.hcmut.emobility.it;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.DockerClientFactory;
import vn.edu.hcmut.emobility.TestcontainersConfiguration;
import vn.edu.hcmut.emobility.iot.TelemetryService;

/**
 * Nền cho kiểm thử tích hợp: PostgreSQL 16 thật (Testcontainers) + Flyway schema/seed.
 * Tự bỏ qua nếu máy không có Docker. Tắt bộ lập lịch để kết quả tất định.
 */
@SpringBootTest(properties = {"app.scheduling.enabled=false", "app.iot.mode=simulated"})
@Import(TestcontainersConfiguration.class)
@EnabledIf("vn.edu.hcmut.emobility.it.IntegrationTestBase#dockerAvailable")
public abstract class IntegrationTestBase {

    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected TelemetryService telemetry;

    public static boolean dockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

    /** Nhịp tim thiết bị cho mọi Hub để dữ liệu cảm biến "còn mới". */
    protected void heartbeatAll() {
        jdbc.queryForList("select id from hub", Long.class).forEach(telemetry::hubHeartbeat);
    }

    protected long vehicleId(String code) {
        return jdbc.queryForObject("select id from vehicle where code = ?", Long.class, code);
    }

    /** Chọn động một xe Sẵn sàng tại Hub để các lớp kiểm thử không phụ thuộc thứ tự chạy. */
    protected String availableVehicle(long hubId) {
        return jdbc.queryForObject("select code from vehicle where hub_id = ? and status = 'AVAILABLE' and battery_percent >= 20 "
                + "and error_code is null order by battery_percent desc, id limit 1", String.class, hubId);
    }

    protected String vehicleStatus(long id) {
        return jdbc.queryForObject("select status from vehicle where id = ?", String.class, id);
    }

    /** Tạo nhanh n tài khoản sinh viên (không cần hồ sơ) cho kiểm thử. */
    protected List<Long> createStudents(String prefix, int n) {
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            Long id = jdbc.queryForObject("insert into app_user (username, password_hash, full_name, status) values (?, 'x', ?, 'ACTIVE') returning id",
                    Long.class, prefix + i + "_" + System.nanoTime(), "SV " + i);
            jdbc.update("insert into user_role (user_id, role) values (?, 'STUDENT')", id);
            ids.add(id);
        }
        return ids;
    }
}
