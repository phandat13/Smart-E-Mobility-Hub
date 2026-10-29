package vn.edu.hcmut.emobility.core.event;

/** RE01, RE03, RE06, RB02... */
public record VehicleAvailabilityChanged(Long hubId) implements DomainEvent {}
