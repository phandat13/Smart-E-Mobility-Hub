package vn.edu.hcmut.emobility.hub;

import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.event.HubCountersProvider;

/**
 * Cung cấp số liệu Hub để đẩy qua WebSocket /topic/hubs/{id} ngay sau khi giao dịch commit.
 * Chạy trong giao dịch mới vì được gọi ở pha AFTER_COMMIT.
 */
@Component
public class HubCountersProviderImpl implements HubCountersProvider {

    private final HubStatsService stats;
    private final TxRunner tx;

    public HubCountersProviderImpl(HubStatsService stats, TxRunner tx) {
        this.stats = stats;
        this.tx = tx;
    }

    @Override
    public Object countersOf(Long hubId) {
        return tx.inNewTx(() -> stats.one(hubId));
    }
}
