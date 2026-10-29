package vn.edu.hcmut.emobility.core.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import vn.edu.hcmut.emobility.core.exception.ApiError;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;

public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private static final Logger audit = LoggerFactory.getLogger("AUDIT");

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException ex)
            throws IOException {
        String who = CurrentUser.find().map(u -> u.username() + "/" + u.role()).orElse("anonymous");
        audit.warn("ACCESS_DENIED user={} {} {}", who, req.getMethod(), req.getRequestURI());
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write(ApiError.of(ErrorCode.FORBIDDEN, ErrorCode.FORBIDDEN.getMessage(), null,
                req.getRequestURI()).toJson());
    }
}
