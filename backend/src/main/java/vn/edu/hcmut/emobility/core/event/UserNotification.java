package vn.edu.hcmut.emobility.core.event;

import java.util.Map;

public record UserNotification(Long userId, String type, String title, String body, Map<String, Object> data)
        implements DomainEvent {}
