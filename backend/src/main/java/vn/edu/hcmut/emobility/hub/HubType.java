package vn.edu.hcmut.emobility.hub;

/** Loại Hub; demandWeight dùng cho ưu tiên sạc (SC01) và mô hình nhu cầu (SI03). */
public enum HubType {
    METRO(30, 1.0), DORM(20, 0.8), CAMPUS(15, 0.6), SERVICE(10, 0.5), ADMIN(8, 0.4);

    private final int basePickupsPerHour;
    private final double demandWeight;

    HubType(int basePickupsPerHour, double demandWeight) {
        this.basePickupsPerHour = basePickupsPerHour;
        this.demandWeight = demandWeight;
    }

    public int basePickupsPerHour() { return basePickupsPerHour; }
    public double demandWeight() { return demandWeight; }
}
