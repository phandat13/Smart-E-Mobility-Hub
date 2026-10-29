package vn.edu.hcmut.emobility.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.edu.hcmut.emobility.core.exception.ApiError;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;

public class IotApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Device-Key";
    private final byte[] expected;

    public IotApiKeyFilter(String apiKey) {
        this.expected = apiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith("/api/v1/iot/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String key = req.getHeader(HEADER);
        if (key == null || !MessageDigest.isEqual(expected, key.getBytes(StandardCharsets.UTF_8))) {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write(ApiError.of(ErrorCode.UNAUTHORIZED, "Thiết bị không hợp lệ", null,
                    req.getRequestURI()).toJson());
            return;
        }
        chain.doFilter(req, res);
    }
}
