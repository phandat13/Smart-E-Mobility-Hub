package vn.edu.hcmut.emobility.core.crypto;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.spec.SecretKeySpec;

/**
 * OTP trả xe offline (RE06-E2), kiểu TOTP: HMAC-SHA256(secret chuyến đi, ⌊epoch/300⌋) → 6 chữ số.
 * Ứng dụng nhận secret khi bắt đầu chuyến và tự tính OTP khi mất mạng.
 * Góp ý #6: OTP CHỈ xác thực người dùng/yêu cầu trả xe, không thay thế bằng chứng vật lý.
 */
public final class OfflineOtp {

    public static final long STEP_SECONDS = 300;

    private OfflineOtp() {}

    public static String generate(String secretHex, long counter) {
        SecretKeySpec key = new SecretKeySpec(secretHex.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        byte[] h = CryptoService.hmac(key, ByteBuffer.allocate(8).putLong(counter).array());
        int offset = h[h.length - 1] & 0x0f;
        int bin = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16)
                | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
        return String.format("%06d", bin % 1_000_000);
    }

    public static long counterAt(Instant t) {
        return Math.floorDiv(t.getEpochSecond(), STEP_SECONDS);
    }

    /** Chấp nhận OTP của cửa sổ thời điểm trả xe khai báo, lệch tối đa ±1 cửa sổ (±5 phút). */
    public static boolean verify(String secretHex, String otp, Instant claimedAt) {
        if (otp == null || !otp.matches("\\d{6}")) return false;
        long c = counterAt(claimedAt);
        for (long d = -1; d <= 1; d++) {
            if (generate(secretHex, c + d).equals(otp)) return true;
        }
        return false;
    }
}
