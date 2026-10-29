package vn.edu.hcmut.emobility.core.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class RealtimePublisher {

    private static final Logger log = LoggerFactory.getLogger(RealtimePublisher.class);

    private final SimpMessagingTemplate ws;
    private final ObjectProvider<HubCountersProvider> hubCounters;

    public RealtimePublisher(SimpMessagingTemplate ws, ObjectProvider<HubCountersProvider> hubCounters) {
        this.ws = ws;
        this.hubCounters = hubCounters;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onAvailability(VehicleAvailabilityChanged e) {
        HubCountersProvider p = hubCounters.getIfAvailable();
        if (p == null || e.hubId() == null) return;
        safeSend("/topic/hubs/" + e.hubId(), p.countersOf(e.hubId()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onAlert(AlertRaised e) {
        safeSend("/topic/alerts", e);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotification(UserNotification n) {
        try {
            ws.convertAndSendToUser(String.valueOf(n.userId()), "/queue/notifications", n);
        } catch (RuntimeException ex) {
            log.warn("Không gửi được thông báo tới user {}: {}", n.userId(), ex.getMessage());
        }
    }

    private void safeSend(String dest, Object payload) {
        try {
            ws.convertAndSend(dest, payload);
        } catch (RuntimeException ex) {
            log.warn("Không gửi được tới {}: {}", dest, ex.getMessage());
        }
    }
}
