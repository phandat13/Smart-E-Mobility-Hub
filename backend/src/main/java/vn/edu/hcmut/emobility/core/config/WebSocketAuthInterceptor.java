package vn.edu.hcmut.emobility.core.config;

import java.util.List;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.security.AuthUser;
import vn.edu.hcmut.emobility.core.security.JwtService;
import vn.edu.hcmut.emobility.core.security.Role;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    public WebSocketAuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (acc == null || acc.getCommand() == null) return message;

        if (acc.getCommand() == StompCommand.CONNECT) {
            String header = acc.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new AccessDeniedException("Thiếu token");
            }
            try {
                AuthUser user = jwtService.parse(header.substring(7).trim());
                acc.setUser(new UsernamePasswordAuthenticationToken(
                        user, null, List.of(new SimpleGrantedAuthority(user.role().authority()))));
            } catch (BusinessException e) {
                throw new AccessDeniedException("Token không hợp lệ");
            }
        }

        if (acc.getCommand() == StompCommand.SUBSCRIBE) {
            String dest = acc.getDestination();
            if (dest != null && dest.startsWith("/topic/alerts") && !hasRole(acc, Role.OPERATOR)) {
                throw new AccessDeniedException("Chỉ đơn vị vận hành được nhận cảnh báo");
            }
        }
        return message;
    }

    private boolean hasRole(StompHeaderAccessor acc, Role role) {
        return acc.getUser() instanceof UsernamePasswordAuthenticationToken t
                && t.getPrincipal() instanceof AuthUser u && u.is(role);
    }
}
