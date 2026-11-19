package vn.edu.hcmut.emobility.hub;

public enum PortStatus {
    AVAILABLE, OCCUPIED, PENDING_CHECK, FAULTY, MAINTENANCE, DISABLED;

    public boolean usable() { return this == AVAILABLE || this == OCCUPIED || this == PENDING_CHECK; }
}
