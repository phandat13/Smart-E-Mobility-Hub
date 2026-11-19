package vn.edu.hcmut.emobility.core.crypto;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.core.config.AppProperties;

/**
 * NFR bảo mật: dữ liệu định danh (CCCD, SĐT) không đọc được ở dạng rõ nếu kho dữ liệu bị lộ.
 * AES-256-GCM (khóa = SHA-256(secret)), định dạng base64(iv12 || ciphertext||tag).
 * hash() = HMAC-SHA256 dùng để kiểm tra trùng mà không cần giải mã.
 */
@Service
public class CryptoService {

    private static final int IV_LEN = 12;
    private final SecretKeySpec aesKey;
    private final SecretKeySpec macKey;
    private final SecureRandom random = new SecureRandom();

    public CryptoService(AppProperties props) {
        try {
            byte[] secret = props.crypto().secret().getBytes(StandardCharsets.UTF_8);
            this.aesKey = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret), "AES");
            this.macKey = new SecretKeySpec(secret, "HmacSHA256");
        } catch (Exception e) {
            throw new IllegalStateException("Không khởi tạo được khóa mã hóa", e);
        }
    }

    public String encrypt(String plain) {
        try {
            byte[] iv = new byte[IV_LEN];
            random.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, aesKey, new GCMParameterSpec(128, iv));
            byte[] ct = c.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[IV_LEN + ct.length];
            System.arraycopy(iv, 0, out, 0, IV_LEN);
            System.arraycopy(ct, 0, out, IV_LEN, ct.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("Mã hóa thất bại", e);
        }
    }

    public String decrypt(String encoded) {
        try {
            byte[] in = Base64.getDecoder().decode(encoded);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, aesKey, new GCMParameterSpec(128, in, 0, IV_LEN));
            return new String(c.doFinal(in, IV_LEN, in.length - IV_LEN), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Giải mã thất bại", e);
        }
    }

    public String hash(String value) {
        return HexFormat.of().formatHex(hmac(macKey, value.getBytes(StandardCharsets.UTF_8)));
    }

    /** Ký dữ liệu (token xem trước khuyến nghị...). */
    public String sign(String data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hmac(macKey, data.getBytes(StandardCharsets.UTF_8)));
    }

    public static byte[] hmac(SecretKeySpec key, byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC thất bại", e);
        }
    }

    public static String mask(String phone) {
        if (phone == null || phone.length() < 6) return "***";
        return phone.substring(0, 4) + " ••• " + phone.substring(phone.length() - 3);
    }
}
