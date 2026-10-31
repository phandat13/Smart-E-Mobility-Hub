package vn.edu.hcmut.emobility.rental;

import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReservationExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(ReservationExpiryJob.class);

    private final ReservationService service;

    public ReservationExpiryJob(ReservationService service) {
        this.service = service;
    }

    /** Mỗi đơn chạy trong transaction riêng: một đơn lỗi không chặn các đơn còn lại, lượt sau sẽ thử lại. */
    @Scheduled(fixedDelay = 30, timeUnit = TimeUnit.SECONDS)
    public void expireOverdue() {
        for (Long id : service.findExpiredIds()) {
            try {
                service.expire(id);
            } catch (RuntimeException ex) {
                log.warn("Không hết hạn được đơn {}: {}", id, ex.getMessage());
            }
        }
    }
}
