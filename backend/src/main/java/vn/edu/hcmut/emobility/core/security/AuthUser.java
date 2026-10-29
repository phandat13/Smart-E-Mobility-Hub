package vn.edu.hcmut.emobility.core.security;

import java.security.Principal;

public record AuthUser(Long id, String username, Role role) implements Principal {

    @Override
    public String getName() { return String.valueOf(id); }

    public boolean is(Role r) { return role == r; }
}
