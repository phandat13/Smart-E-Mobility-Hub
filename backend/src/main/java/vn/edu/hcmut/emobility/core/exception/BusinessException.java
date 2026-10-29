package vn.edu.hcmut.emobility.core.exception;

import java.util.Map;

public class BusinessException extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, Object> details;

    public BusinessException(ErrorCode code) {
        this(code, code.getMessage(), Map.of());
    }

    public BusinessException(ErrorCode code, String message) {
        this(code, message, Map.of());
    }

    public BusinessException(ErrorCode code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details == null ? Map.of() : Map.copyOf(details);
    }

    public static BusinessException notFound(String what, Object id) {
        return new BusinessException(ErrorCode.NOT_FOUND, what + " không tồn tại", Map.of("id", id));
    }

    public ErrorCode getCode() { return code; }
    public Map<String, Object> getDetails() { return details; }
}
