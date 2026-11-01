package vn.edu.hcmut.emobility.parking;

import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BookingNoShowJob {

    private static final Logger log = LoggerFactory.getLogger(BookingNoShowJob.class);

    private final BookingService service;

    public BookingNoShowJob(BookingService service) {
        this.service = service;
    }

    @Scheduled(fixedDelay = 60, timeUnit = TimeUnit.SECONDS)
    public void expireNoShows() {
        for (Long id : service.findNoShowIds()) {
            try {
                service.expireNoShow(id);
            } catch (RuntimeException ex) {
                log.warn("Không hủy được đơn no-show {}: {}", id, ex.getMessage());
            }
        }
    }
}
