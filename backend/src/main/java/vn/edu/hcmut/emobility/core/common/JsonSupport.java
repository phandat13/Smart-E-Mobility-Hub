package vn.edu.hcmut.emobility.core.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Bao gói Jackson để tuần tự hóa các cột JSONB (snapshot, params, payload...). */
@Component
public class JsonSupport {

    private final ObjectMapper mapper;

    public JsonSupport(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String write(Object value) {
        if (value == null) return null;
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Không tuần tự hóa được JSON", e);
        }
    }

    public <T> T read(String json, Class<T> type) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("JSON không hợp lệ", e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> readMap(String json) {
        Map<String, Object> m = read(json, Map.class);
        return m == null ? new LinkedHashMap<>() : m;
    }

    public <T> T convert(Object value, Class<T> type) {
        try {
            return mapper.convertValue(value, type);
        } catch (Exception e) {
            throw new IllegalArgumentException("Dữ liệu không đúng định dạng", e);
        }
    }
}
