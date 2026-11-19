package vn.edu.hcmut.emobility.account;

/**
 * Kiểm tra CCCD 12 số: 3 số mã tỉnh (001–096), 1 số thế kỷ/giới tính (0–9), 2 số năm sinh, 6 số ngẫu nhiên.
 * AC02-E2: "số CCCD không chuẩn" → phản hồi lý do và yêu cầu điều chỉnh.
 */
public final class CitizenIdValidator {
    private CitizenIdValidator() {}

    public static boolean isValid(String id) {
        if (id == null || !id.matches("\\d{12}")) return false;
        int province = Integer.parseInt(id.substring(0, 3));
        return province >= 1 && province <= 96;
    }
}
