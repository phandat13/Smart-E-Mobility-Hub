package vn.edu.hcmut.emobility.unit;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import vn.edu.hcmut.emobility.account.CitizenIdValidator;
import vn.edu.hcmut.emobility.core.crypto.OfflineOtp;
import vn.edu.hcmut.emobility.core.payment.PaymentSimulator;

class SmallRulesTest {

    @Test
    void offlineOtp_acceptsSameWindowAndNeighbour_rejectsOthers() {
        String secret = "0123456789abcdef0123456789abcdef";
        Instant t = Instant.parse("2026-11-20T10:02:00Z");
        String otp = OfflineOtp.generate(secret, OfflineOtp.counterAt(t));
        assertTrue(OfflineOtp.verify(secret, otp, t));
        assertTrue(OfflineOtp.verify(secret, otp, t.plusSeconds(300)), "Lệch 1 cửa sổ vẫn chấp nhận");
        assertFalse(OfflineOtp.verify(secret, otp, t.plusSeconds(1200)), "Lệch 4 cửa sổ phải từ chối");
        assertFalse(OfflineOtp.verify("ffffffffffffffffffffffffffffffff", otp, t), "Sai secret phải từ chối");
        assertFalse(OfflineOtp.verify(secret, "12ab56", t));
    }

    @Test
    void citizenId() {
        assertTrue(CitizenIdValidator.isValid("079202001234"));
        assertFalse(CitizenIdValidator.isValid("000202001234"), "Mã tỉnh 000 không hợp lệ");
        assertFalse(CitizenIdValidator.isValid("12345"));
        assertFalse(CitizenIdValidator.isValid("07920200123a"));
    }

    @Test
    void payment() {
        PaymentSimulator p = new PaymentSimulator();
        assertEquals(new BigDecimal("10500.00"), p.tripCost("E_BIKE", 25, 2.8));      // 3000 + 25*300
        assertEquals(new BigDecimal("15500.00"), p.tripCost("E_SCOOTER", 25, 2.8));   // 3000 + 25*500
        assertEquals(new BigDecimal("6000.00"), p.parkingCost(61));                    // làm tròn lên 2 giờ
        assertEquals(new BigDecimal("4000.00"), p.chargingCost(1.12));                 // 3920 → 4000
    }
}
