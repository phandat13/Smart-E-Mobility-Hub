package vn.edu.hcmut.emobility.core.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import vn.edu.hcmut.emobility.core.exception.ApiError;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;

public class RestAuthEntryPoint implements AuthenticationEntryPoint {

    static final String ERROR_ATTR = "emobility.authError";

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex)
            throws IOException {
        ErrorCode code = req.getAttribute(ERROR_ATTR) instanceof ErrorCode c ? c : ErrorCode.UNAUTHORIZED;
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write(ApiError.of(code, code.getMessage(), null, req.getRequestURI()).toJson());
    }
}
