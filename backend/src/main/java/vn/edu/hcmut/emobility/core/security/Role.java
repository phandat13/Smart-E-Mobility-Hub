package vn.edu.hcmut.emobility.core.security;

public enum Role {
    STUDENT,
    OPERATOR,
    DRIVER,
    TECHNICIAN;

    public String authority() { return "ROLE_" + name(); }
}
