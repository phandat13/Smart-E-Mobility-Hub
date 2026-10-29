package vn.edu.hcmut.emobility.core.event;

import java.time.Instant;

public interface DomainEvent {
    default Instant occurredAt() { return Instant.now(); }
}
