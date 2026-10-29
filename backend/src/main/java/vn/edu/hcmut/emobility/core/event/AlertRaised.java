package vn.edu.hcmut.emobility.core.event;

/** Cảnh báo mới cho Dashboard (quá tải, mất cân đối, lỗi thiết bị, mất kết nối). */
public record AlertRaised(Long alertId, String type, Long hubId, String severity, String message)
        implements DomainEvent {}
