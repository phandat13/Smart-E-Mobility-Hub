package vn.edu.hcmut.emobility.core.event;

public record IncidentReportRequested(
        Long reporterId,
        Long hubId,
        String targetType,  // VEHICLE | HUB | SLOT | PORT
        Long targetId,
        String category,   // LOW | MEDIUM | HIGH | CRITICAL
        String description,
        java.util.List<String> photoUrls) implements DomainEvent {}