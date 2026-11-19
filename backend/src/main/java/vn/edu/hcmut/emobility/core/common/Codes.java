package vn.edu.hcmut.emobility.core.common;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Sinh mã nghiệp vụ dễ đọc, ví dụ DX-071026-0153. */
public final class Codes {
    private static final SecureRandom RND = new SecureRandom();
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("ddMMyy").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final String ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private Codes() {}

    public static String next(String prefix, Instant now) {
        return prefix + "-" + DAY.format(now) + "-" + String.format("%04d", RND.nextInt(10_000));
    }

    public static String token(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(ALNUM.charAt(RND.nextInt(ALNUM.length())));
        return sb.toString();
    }

    public static String hexSecret(int bytes) {
        byte[] b = new byte[bytes];
        RND.nextBytes(b);
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x", x));
        return sb.toString();
    }
}
