package vn.edu.hcmut.emobility.core.exception;

import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiError> business(BusinessException ex, HttpServletRequest req) {
        return build(ex.getCode(), ex.getMessage(), ex.getDetails(), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalidBody(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, Object> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));
        return build(ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.getMessage(), fields, req);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> invalidParam(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, Object> fields = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> fields.put(v.getPropertyPath().toString(), v.getMessage()));
        return build(ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.getMessage(), fields, req);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> unreadable(Exception ex, HttpServletRequest req) {
        return build(ErrorCode.VALIDATION_FAILED, "Định dạng yêu cầu không hợp lệ", Map.of(), req);
    }

    /**
     * Ràng buộc DB là "chốt chặn cuối" chống giữ trùng tài nguyên (NFR nhất quán đồng thời):
     * ánh xạ tên constraint sang mã lỗi nghiệp vụ để người dùng nhận thông báo đúng.
     */
    private static final Map<String, ErrorCode> CONSTRAINTS = Map.ofEntries(
            Map.entry("ux_reservation_active_student", ErrorCode.ACTIVE_RESERVATION_EXISTS),
            Map.entry("ux_trip_active_student", ErrorCode.ACTIVE_RESERVATION_EXISTS),
            Map.entry("ux_reservation_active_vehicle", ErrorCode.VEHICLE_UNAVAILABLE),
            Map.entry("ux_trip_active_vehicle", ErrorCode.VEHICLE_UNAVAILABLE),
            Map.entry("ex_slot_no_overlap", ErrorCode.SLOT_UNAVAILABLE),
            Map.entry("ex_port_no_overlap", ErrorCode.SLOT_UNAVAILABLE),
            Map.entry("ux_transfer_item_active_vehicle", ErrorCode.VEHICLE_IN_OTHER_OPERATION),
            Map.entry("ux_personal_vehicle_plate", ErrorCode.PLATE_NUMBER_TAKEN),
            Map.entry("ux_incident_open_target", ErrorCode.INCIDENT_ALREADY_OPEN),
            Map.entry("app_user_username_key", ErrorCode.USERNAME_TAKEN),
            Map.entry("hub_name_key", ErrorCode.HUB_NAME_TAKEN),
            Map.entry("hub_code_key", ErrorCode.HUB_NAME_TAKEN),
            Map.entry("scenario_name_key", ErrorCode.SCENARIO_NAME_TAKEN));

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> integrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        String msg = String.valueOf(ex.getMostSpecificCause().getMessage());
        log.debug("Integrity violation: {}", msg);
        for (Map.Entry<String, ErrorCode> e : CONSTRAINTS.entrySet()) {
            if (msg.contains(e.getKey())) {
                return build(e.getValue(), e.getValue().getMessage(), Map.of(), req);
            }
        }
        return build(ErrorCode.CONFLICT, "Tài nguyên không còn khả dụng", Map.of(), req);
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, OptimisticLockException.class,
            org.springframework.dao.PessimisticLockingFailureException.class})
    ResponseEntity<ApiError> optimistic(Exception ex, HttpServletRequest req) {
        return build(ErrorCode.CONFLICT, ErrorCode.CONFLICT.getMessage(), Map.of(), req);
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    ResponseEntity<ApiError> denied(Exception ex, HttpServletRequest req) {
        return build(ErrorCode.FORBIDDEN, ErrorCode.FORBIDDEN.getMessage(), Map.of(), req);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> noRoute(NoResourceFoundException ex, HttpServletRequest req) {
        return build(ErrorCode.NOT_FOUND, "Không tìm thấy đường dẫn", Map.of(), req);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest req) {
        log.error("Unhandled error at {} {}", req.getMethod(), req.getRequestURI(), ex);
        return build(ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.getMessage(), Map.of(), req);
    }

    private ResponseEntity<ApiError> build(ErrorCode code, String msg, Map<String, Object> details,
                                           HttpServletRequest req) {
        return ResponseEntity.status(code.getStatus())
                .body(ApiError.of(code, msg, details, req.getRequestURI()));
    }
}
