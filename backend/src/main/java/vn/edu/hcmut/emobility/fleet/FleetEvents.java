package vn.edu.hcmut.emobility.fleet;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.core.event.VehicleAvailabilityChanged;

/** Phát sự kiện thay đổi số liệu Hub → WebSocket đẩy lên giao diện sau khi commit (NFR ≤ 2 giây). */
@Component
public class FleetEvents {
    private final ApplicationEventPublisher events;

    public FleetEvents(ApplicationEventPublisher events) {
        this.events = events;
    }

    public void hubChanged(Long hubId) {
        if (hubId != null) events.publishEvent(new VehicleAvailabilityChanged(hubId));
    }
}
