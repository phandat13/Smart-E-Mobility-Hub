package vn.edu.hcmut.emobility.hub;

import java.time.Instant;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.hub.HubDtos.*;

/** AC01 + dữ liệu chọn chỗ/cổng cho PV01 (mọi vai trò đã đăng nhập). */
@RestController
@RequestMapping("/api/v1/hubs")
public class HubController {

    private final HubQueryService query;

    public HubController(HubQueryService query) {
        this.query = query;
    }

    @GetMapping
    public SearchResult search(@RequestParam(required = false) String q, @RequestParam(required = false) String area,
                               @RequestParam(required = false) Double lat, @RequestParam(required = false) Double lng) {
        return query.search(q, area, lat, lng);
    }

    @GetMapping("/{id}")
    public HubDetail detail(@PathVariable Long id) {
        return query.detail(id);
    }

    @GetMapping("/{id}/slots")
    public List<SlotView> slots(@PathVariable Long id, @RequestParam(required = false) SlotKind kind,
                                @RequestParam(required = false) Instant start, @RequestParam(required = false) Instant end) {
        return query.slots(id, kind, start, end);
    }

    @GetMapping("/{id}/ports")
    public List<PortView> ports(@PathVariable Long id, @RequestParam(required = false) String connector,
                                @RequestParam(required = false) Instant start, @RequestParam(required = false) Instant end) {
        return query.ports(id, connector, start, end);
    }
}
