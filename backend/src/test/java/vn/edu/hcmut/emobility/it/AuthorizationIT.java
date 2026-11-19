package vn.edu.hcmut.emobility.it;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/** NFR phân quyền + góp ý #2: vai trò xác định từ tài khoản, không do người dùng tự chọn. */
class AuthorizationIT extends IntegrationTestBase {

    @Autowired WebApplicationContext context;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private String login(String username, String portal) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"123456\",\"portal\":\"" + portal + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Matcher m = Pattern.compile("\"accessToken\"\\s*:\\s*\"([^\"]+)\"").matcher(body);
        if (!m.find()) throw new AssertionError("Không có token: " + body);
        return m.group(1);
    }

    @Test
    void eachRoleIsConfinedToItsOwnScope() throws Exception {
        String student = login("anh.nm2410717", "STUDENT");
        String operator = login("vanhanh.trangle", "INTERNAL");
        String driver = login("taixe.vanbinh", "INTERNAL");
        String tech = login("kythuat.vannam", "INTERNAL");

        mvc.perform(get("/api/v1/ops/dashboard").header("Authorization", "Bearer " + student)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/driver/orders").header("Authorization", "Bearer " + student)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/reservations").header("Authorization", "Bearer " + operator)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/tech/orders").header("Authorization", "Bearer " + driver)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/ops/transfers").header("Authorization", "Bearer " + tech)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/ops/dashboard")).andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/ops/dashboard").header("Authorization", "Bearer " + operator)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/reservations").header("Authorization", "Bearer " + student)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/driver/orders").header("Authorization", "Bearer " + driver)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/tech/orders").header("Authorization", "Bearer " + tech)).andExpect(status().isOk());
    }

    @Test
    void portalMismatchAndUngrantedContextAreRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"vanhanh.trangle\",\"password\":\"123456\",\"portal\":\"STUDENT\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PORTAL_MISMATCH"));

        String multi = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"truongca.hoang\",\"password\":\"123456\",\"portal\":\"INTERNAL\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.requiresContextSelection").value(true))
                .andReturn().getResponse().getContentAsString();
        Matcher m = Pattern.compile("\"accessToken\"\\s*:\\s*\"([^\"]+)\"").matcher(multi);
        m.find();
        String token = m.group(1);
        mvc.perform(post("/api/v1/auth/context").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"DRIVER\"}")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ROLE_NOT_GRANTED"));
        mvc.perform(post("/api/v1/auth/context").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"TECHNICIAN\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.user.activeRole").value("TECHNICIAN"));
    }
}
