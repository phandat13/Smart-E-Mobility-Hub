package vn.edu.hcmut.emobility.core.common;

import java.time.Duration;
import java.time.Instant;

public record TimeWindow(Instant start, Instant end) {
    public TimeWindow {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new IllegalArgumentException("Khung thời gian không hợp lệ");
        }
    }

    public Duration duration() { return Duration.between(start, end); }

    public boolean overlaps(TimeWindow other) {
        return start.isBefore(other.end) && other.start.isBefore(end);
    }

    public TimeWindow extendBy (Duration duration) { return new TimeWindow(start, end.plus(duration)); }
}