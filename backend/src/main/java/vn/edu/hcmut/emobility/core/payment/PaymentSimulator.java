package vn.edu.hcmut.emobility.core.payment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;

/**
 * Dịch vụ thanh toán MÔ PHỎNG (ngoài phạm vi: ví điện tử, ngân hàng, hóa đơn điện tử).
 * Nhận dữ liệu sử dụng (thời lượng, quãng đường, điện năng) và trả về chi phí (VND).
 */
@Service
public class PaymentSimulator {

    public static final long UNLOCK_FEE = 3_000;
    public static final long BIKE_PER_MIN = 300;
    public static final long SCOOTER_PER_MIN = 500;
    public static final long PARKING_PER_HOUR = 3_000;
    public static final long CHARGING_PER_KWH = 3_500;

    public BigDecimal tripCost(String vehicleType, long minutes, double distanceKm) {
        long perMin = "E_SCOOTER".equals(vehicleType) ? SCOOTER_PER_MIN : BIKE_PER_MIN;
        long billedMinutes = Math.max(1, minutes);
        return round(BigDecimal.valueOf(UNLOCK_FEE + perMin * billedMinutes));
    }

    public BigDecimal parkingCost(long minutes) {
        long hours = Math.max(1, (minutes + 59) / 60);
        return round(BigDecimal.valueOf(hours * PARKING_PER_HOUR));
    }

    public BigDecimal chargingCost(double kwh) {
        return round(BigDecimal.valueOf(kwh * CHARGING_PER_KWH));
    }

    private static BigDecimal round(BigDecimal v) {
        // Làm tròn tới 500đ
        return v.divide(BigDecimal.valueOf(500), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(500)).setScale(2);
    }
}
