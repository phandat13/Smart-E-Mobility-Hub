package vn.edu.hcmut.emobility.core.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;

@Service
public class JwtService {

    private static final String ISSUER = "emobility-hub";

    private final SecretKey key;
    private final Duration ttl;
    private final Clock clock;

    public JwtService(AppProperties props, Clock clock) {
        byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("app.jwt.secret phải dài ít nhất 32 byte");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.ttl = Duration.ofMinutes(props.jwt().ttlMinutes());
        this.clock = clock;
    }

    public record IssuedToken(String accessToken, Instant expiresAt) {}

    public IssuedToken issue(AuthUser user) {
        Instant now = clock.instant();
        Instant exp = now.plus(ttl);
        String token = Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(user.id()))
                .claim("username", user.username())
                .claim("role", user.role().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
        return new IssuedToken(token, exp);
    }

    public AuthUser parse(String token) {
        try {
            Claims c = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(ISSUER)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return new AuthUser(Long.valueOf(c.getSubject()),
                    c.get("username", String.class),
                    Role.valueOf(c.get("role", String.class)));
        } catch (JwtException | IllegalArgumentException | NullPointerException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }
}
