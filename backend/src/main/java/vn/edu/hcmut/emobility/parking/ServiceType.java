package vn.edu.hcmut.emobility.parking;

public enum ServiceType {
    PARK,
    CHARGE,
    BOTH;

    public boolean needsPort() { return this != PARK; }
}
