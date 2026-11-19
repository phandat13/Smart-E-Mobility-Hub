-- =====================================================================
-- Smart E-Mobility Hub – schema v1
-- Các nguyên tắc nhất quán (NFR "Tính nhất quán khi truy cập đồng thời"):
--   (1) Chuyển trạng thái tài nguyên bằng UPDATE có điều kiện (compare-and-set) + cột version.
--   (2) Partial unique index làm "chốt chặn cuối" chống giữ trùng một tài nguyên.
--   (3) Exclusion constraint chống chồng lấn khung giờ (ô đỗ, cổng sạc).
--   (4) Trạng thái "chờ đối soát" khi kết quả thiết bị không xác định (góp ý #5, #6, #8).
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------- Tài khoản
CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    status        VARCHAR(30)  NOT NULL, -- PENDING_VERIFICATION, ACTIVE, LOCKED
    version       BIGINT NOT NULL DEFAULT 0
);

-- Góp ý #2: vai trò gắn với tài khoản (được cấp trước), KHÔNG do người dùng tự chọn khi đăng nhập.
CREATE TABLE user_role (
    user_id BIGINT      NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL, -- STUDENT, OPERATOR, DRIVER, TECHNICIAN
    PRIMARY KEY (user_id, role)
);

CREATE TABLE student_profile (
    id                   BIGSERIAL PRIMARY KEY,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id              BIGINT       NOT NULL UNIQUE REFERENCES app_user (id),
    student_code         VARCHAR(20)  NOT NULL UNIQUE,
    email                VARCHAR(100) NOT NULL UNIQUE,
    school               VARCHAR(100),
    address              VARCHAR(255),
    -- NFR bảo mật: dữ liệu định danh lưu dạng mã hóa AES-GCM + hash để kiểm tra trùng
    phone_encrypted      VARCHAR(255) NOT NULL,
    phone_hash           VARCHAR(64)  NOT NULL UNIQUE,
    citizen_id_encrypted VARCHAR(255) NOT NULL,
    citizen_id_hash      VARCHAR(64)  NOT NULL UNIQUE,
    verified             BOOLEAN      NOT NULL DEFAULT FALSE
);

-- ------------------------------------------------------------- Hub & hạ tầng
CREATE TABLE hub (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code                VARCHAR(20)  NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL UNIQUE,
    address             VARCHAR(255),
    area                VARCHAR(50),
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    type                VARCHAR(20)  NOT NULL, -- METRO, DORM, CAMPUS, SERVICE, ADMIN
    parking_capacity    INTEGER      NOT NULL CHECK (parking_capacity > 0),
    status              VARCHAR(20)  NOT NULL, -- ACTIVE, INACTIVE
    deactivation_reason VARCHAR(255),
    last_sync_at        TIMESTAMPTZ,           -- thời điểm nhận dữ liệu thiết bị gần nhất (góp ý #1)
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE vehicle (
    id                   BIGSERIAL PRIMARY KEY,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code                 VARCHAR(20) NOT NULL UNIQUE,
    type                 VARCHAR(20) NOT NULL, -- E_BIKE, E_SCOOTER
    model                VARCHAR(50),
    hub_id               BIGINT REFERENCES hub (id),
    -- AVAILABLE, RESERVED, PICKUP_PENDING, UNLOCK_RECONCILING, IN_USE, RETURN_RECONCILING,
    -- PENDING_CHECK, NEEDS_CHARGE, CHARGING, TRANSFER_LOCKED, IN_TRANSIT, FAULTY,
    -- MAINTENANCE_LOCKED, OUT_OF_SERVICE
    status               VARCHAR(30) NOT NULL,
    battery_percent      SMALLINT    NOT NULL CHECK (battery_percent BETWEEN 0 AND 100),
    battery_capacity_kwh DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (battery_capacity_kwh > 0),
    range_km             DOUBLE PRECISION NOT NULL,
    lock_state           VARCHAR(20) NOT NULL DEFAULT 'LOCKED', -- LOCKED, UNLOCKED, UNKNOWN
    error_code           VARCHAR(50),
    last_seen_at         TIMESTAMPTZ,
    odometer_km          DOUBLE PRECISION NOT NULL DEFAULT 0,
    rating_sum           INTEGER NOT NULL DEFAULT 0,
    rating_count         INTEGER NOT NULL DEFAULT 0,
    version              BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX ix_vehicle_hub_status ON vehicle (hub_id, status);

CREATE TABLE parking_slot (
    id               BIGSERIAL PRIMARY KEY,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hub_id           BIGINT      NOT NULL REFERENCES hub (id),
    code             VARCHAR(20) NOT NULL,
    kind             VARCHAR(20) NOT NULL, -- SHARED (xe dùng chung), PERSONAL (xe cá nhân, đặt theo khung giờ)
    status           VARCHAR(30) NOT NULL, -- AVAILABLE, HELD, OCCUPIED, PENDING_CHECK, FAULTY, DISABLED
    vehicle_id       BIGINT REFERENCES vehicle (id),
    held_for_item_id BIGINT,               -- góp ý #10: ô được giữ cho xe đang điều chuyển tới
    last_seen_at     TIMESTAMPTZ,
    version          BIGINT NOT NULL DEFAULT 0,
    UNIQUE (hub_id, code)
);
CREATE UNIQUE INDEX ux_slot_one_vehicle ON parking_slot (vehicle_id) WHERE vehicle_id IS NOT NULL;

CREATE TABLE charging_port (
    id                    BIGSERIAL PRIMARY KEY,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hub_id                BIGINT      NOT NULL REFERENCES hub (id),
    code                  VARCHAR(20) NOT NULL,
    power_kw              DOUBLE PRECISION NOT NULL CHECK (power_kw > 0),
    connector_type        VARCHAR(20) NOT NULL, -- TYPE_2, CCS2, J1772, STD_220V
    status                VARCHAR(30) NOT NULL, -- AVAILABLE, OCCUPIED, PENDING_CHECK, FAULTY, MAINTENANCE, DISABLED
    disable_after_session BOOLEAN NOT NULL DEFAULT FALSE,
    error_code            VARCHAR(50),
    last_seen_at          TIMESTAMPTZ,
    version               BIGINT NOT NULL DEFAULT 0,
    UNIQUE (hub_id, code)
);

-- Lệnh gửi thiết bị + kết quả; dùng cho đối soát khi kết quả không xác định (góp ý #5)
CREATE TABLE device_command (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_type  VARCHAR(20) NOT NULL, -- VEHICLE, PORT, SLOT
    device_id    BIGINT      NOT NULL,
    command      VARCHAR(20) NOT NULL, -- UNLOCK, LOCK, START_CHARGE, STOP_CHARGE, OPEN_GATE
    status       VARCHAR(30) NOT NULL, -- SENT, SUCCEEDED, FAILED, UNKNOWN, RECONCILED_SUCCESS, RECONCILED_FAILED
    context_type VARCHAR(30),
    context_id   BIGINT,
    requested_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    attempts     INTEGER NOT NULL DEFAULT 0,
    detail       VARCHAR(255)
);
CREATE INDEX ix_device_command_status ON device_command (status);

CREATE TABLE telemetry_record (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_type VARCHAR(20) NOT NULL,
    device_id   BIGINT      NOT NULL,
    payload     JSONB       NOT NULL,
    received_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_telemetry_device ON telemetry_record (device_type, device_id, received_at DESC);

CREATE TABLE alert (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type          VARCHAR(30) NOT NULL, -- OVERLOAD, IMBALANCE, DEVICE_ERROR, OFFLINE, RECONCILIATION, CHARGING_CONFLICT, CAPACITY_CONFLICT
    hub_id        BIGINT REFERENCES hub (id),
    resource_type VARCHAR(30),
    resource_id   BIGINT,
    severity      VARCHAR(20) NOT NULL, -- INFO, WARNING, CRITICAL
    status        VARCHAR(20) NOT NULL, -- OPEN, ACKNOWLEDGED, RESOLVED
    message       VARCHAR(500) NOT NULL,
    resolved_at   TIMESTAMPTZ
);
-- Mỗi (loại, hub, tài nguyên) chỉ có 1 cảnh báo chưa xử lý
CREATE UNIQUE INDEX ux_alert_open ON alert (type, COALESCE(hub_id, 0), COALESCE(resource_type, ''), COALESCE(resource_id, 0))
    WHERE status <> 'RESOLVED';

-- ------------------------------------------------------------- RE: xe dùng chung
CREATE TABLE reservation (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code            VARCHAR(30) NOT NULL UNIQUE,
    student_id      BIGINT      NOT NULL REFERENCES app_user (id),
    vehicle_id      BIGINT      NOT NULL REFERENCES vehicle (id),
    hub_id          BIGINT      NOT NULL REFERENCES hub (id),
    status          VARCHAR(20) NOT NULL, -- RESERVED, PICKUP_PENDING, PICKED_UP, COMPLETED, CANCELLED, EXPIRED
    reserved_at     TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    extension_count SMALLINT    NOT NULL DEFAULT 0 CHECK (extension_count BETWEEN 0 AND 2),
    direct          BOOLEAN     NOT NULL DEFAULT FALSE, -- thuê trực tiếp tại Hub (không đặt trước)
    close_reason    VARCHAR(100),
    closed_at       TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);
-- Góp ý #3 – chốt chặn cuối: 1 sinh viên / 1 xe chỉ có tối đa 1 đơn đang hiệu lực
CREATE UNIQUE INDEX ux_reservation_active_student ON reservation (student_id) WHERE status IN ('RESERVED', 'PICKUP_PENDING');
CREATE UNIQUE INDEX ux_reservation_active_vehicle ON reservation (vehicle_id) WHERE status IN ('RESERVED', 'PICKUP_PENDING', 'PICKED_UP');
CREATE INDEX ix_reservation_expiry ON reservation (status, expires_at);

-- Góp ý #4: mỗi yêu cầu gia hạn mang request_id; bấm lặp do mạng chậm không cộng giờ 2 lần
CREATE TABLE reservation_extension (
    id             BIGSERIAL PRIMARY KEY,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reservation_id BIGINT      NOT NULL REFERENCES reservation (id),
    request_id     VARCHAR(64) NOT NULL,
    old_expires_at TIMESTAMPTZ NOT NULL,
    new_expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (reservation_id, request_id)
);

CREATE TABLE trip (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code                VARCHAR(30) NOT NULL UNIQUE,
    reservation_id      BIGINT UNIQUE REFERENCES reservation (id),
    student_id          BIGINT      NOT NULL REFERENCES app_user (id),
    vehicle_id          BIGINT      NOT NULL REFERENCES vehicle (id),
    start_hub_id        BIGINT      NOT NULL REFERENCES hub (id),
    end_hub_id          BIGINT REFERENCES hub (id),
    end_slot_id         BIGINT REFERENCES parking_slot (id),
    status              VARCHAR(30) NOT NULL, -- IN_PROGRESS, RETURNING, PENDING_RECONCILIATION, COMPLETED
    return_mode         VARCHAR(20),          -- ONLINE, OFFLINE_OTP
    started_at          TIMESTAMPTZ NOT NULL,
    ended_at            TIMESTAMPTZ,
    client_ended_at     TIMESTAMPTZ,
    start_battery       SMALLINT    NOT NULL,
    end_battery         SMALLINT,
    distance_km         DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost                NUMERIC(12, 2),
    offline_secret      VARCHAR(64) NOT NULL,
    reconciliation_note VARCHAR(255),
    rated               BOOLEAN     NOT NULL DEFAULT FALSE,
    version             BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_trip_active_student ON trip (student_id) WHERE status IN ('IN_PROGRESS', 'RETURNING');
CREATE UNIQUE INDEX ux_trip_active_vehicle ON trip (vehicle_id) WHERE status IN ('IN_PROGRESS', 'RETURNING', 'PENDING_RECONCILIATION');

CREATE TABLE rating (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trip_id       BIGINT   NOT NULL UNIQUE REFERENCES trip (id),
    vehicle_stars SMALLINT NOT NULL CHECK (vehicle_stars BETWEEN 1 AND 5),
    hub_stars     SMALLINT NOT NULL CHECK (hub_stars BETWEEN 1 AND 5),
    comment       VARCHAR(500),
    issue_type    VARCHAR(50),
    photo_urls    JSONB
);

-- ------------------------------------------------------------- PV: xe cá nhân
CREATE TABLE personal_vehicle (
    id             BIGSERIAL PRIMARY KEY,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    owner_id       BIGINT      NOT NULL REFERENCES app_user (id),
    plate_number   VARCHAR(20) NOT NULL,
    type           VARCHAR(20) NOT NULL, -- E_BIKE, E_SCOOTER, E_MOTORBIKE
    model          VARCHAR(50),
    battery_kwh    DOUBLE PRECISION NOT NULL CHECK (battery_kwh > 0),
    connector_type VARCHAR(20) NOT NULL,
    active         BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX ux_personal_vehicle_plate ON personal_vehicle (plate_number) WHERE active;

CREATE TABLE slot_booking (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code                VARCHAR(30) NOT NULL UNIQUE,
    owner_id            BIGINT      NOT NULL REFERENCES app_user (id),
    personal_vehicle_id BIGINT      NOT NULL REFERENCES personal_vehicle (id),
    hub_id              BIGINT      NOT NULL REFERENCES hub (id),
    slot_id             BIGINT REFERENCES parking_slot (id),
    port_id             BIGINT REFERENCES charging_port (id),
    service_type        VARCHAR(20) NOT NULL, -- PARK, CHARGE, BOTH
    start_at            TIMESTAMPTZ NOT NULL,
    end_at              TIMESTAMPTZ NOT NULL,
    -- BOOKED, IN_USE, CHECKOUT_REQUESTED, AWAITING_EXIT, COMPLETED, CANCELLED, EXPIRED
    status              VARCHAR(30) NOT NULL,
    qr_token            VARCHAR(100) NOT NULL UNIQUE,
    checked_in_at       TIMESTAMPTZ,
    charging_stopped_at TIMESTAMPTZ,
    vehicle_left_at     TIMESTAMPTZ,
    energy_kwh          DOUBLE PRECISION,
    cost                NUMERIC(12, 2),
    note                VARCHAR(255),
    version             BIGINT NOT NULL DEFAULT 0,
    CHECK (end_at > start_at),
    CHECK (service_type = 'CHARGE' OR slot_id IS NOT NULL),
    CHECK (service_type = 'PARK' OR port_id IS NOT NULL OR status IN ('CANCELLED', 'EXPIRED', 'COMPLETED'))
);
ALTER TABLE slot_booking ADD CONSTRAINT ex_slot_no_overlap
    EXCLUDE USING gist (slot_id WITH =, tstzrange(start_at, end_at) WITH &&)
    WHERE (slot_id IS NOT NULL AND status IN ('BOOKED', 'IN_USE', 'CHECKOUT_REQUESTED', 'AWAITING_EXIT'));

CREATE TABLE booking_extension (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    booking_id  BIGINT      NOT NULL REFERENCES slot_booking (id),
    request_id  VARCHAR(64) NOT NULL,
    old_end_at  TIMESTAMPTZ NOT NULL,
    new_end_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (booking_id, request_id)
);

-- Mọi cam kết sử dụng cổng sạc theo khung giờ (đặt của sinh viên + lịch sạc đã xác nhận)
-- nằm chung 1 bảng để DB chặn chồng lấn (góp ý #7, #12)
CREATE TABLE port_reservation (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    port_id     BIGINT      NOT NULL REFERENCES charging_port (id),
    start_at    TIMESTAMPTZ NOT NULL,
    end_at      TIMESTAMPTZ NOT NULL,
    source_type VARCHAR(20) NOT NULL, -- BOOKING (cam kết với sinh viên), SCHEDULE_ITEM (lịch sạc đội xe)
    source_id   BIGINT      NOT NULL,
    status      VARCHAR(20) NOT NULL, -- ACTIVE, RELEASED, CANCELLED
    version     BIGINT NOT NULL DEFAULT 0,
    CHECK (end_at > start_at)
);
ALTER TABLE port_reservation ADD CONSTRAINT ex_port_no_overlap
    EXCLUDE USING gist (port_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (status = 'ACTIVE');
CREATE UNIQUE INDEX ux_port_reservation_source ON port_reservation (source_type, source_id) WHERE status = 'ACTIVE';

-- ------------------------------------------------------------- RB: điều chuyển
CREATE TABLE driver (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id    BIGINT      NOT NULL UNIQUE REFERENCES app_user (id),
    status     VARCHAR(20) NOT NULL, -- FREE, BUSY
    truck_plate VARCHAR(20),
    capacity   INTEGER NOT NULL DEFAULT 15
);

CREATE TABLE transfer_order (
    id                BIGSERIAL PRIMARY KEY,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code              VARCHAR(30) NOT NULL UNIQUE,
    source_hub_id     BIGINT      NOT NULL REFERENCES hub (id),
    target_hub_id     BIGINT      NOT NULL REFERENCES hub (id),
    driver_id         BIGINT REFERENCES driver (id),
    -- QUEUED, ASSIGNED, LOADING, IN_TRANSIT, PARTIALLY_DELIVERED, COMPLETED, COMPLETED_WITH_ISSUES, CANCELLED
    status            VARCHAR(30) NOT NULL,
    alert_id          BIGINT REFERENCES alert (id),
    recommendation_id BIGINT,
    created_by        BIGINT REFERENCES app_user (id),
    note              VARCHAR(255),
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    version           BIGINT NOT NULL DEFAULT 0,
    CHECK (source_hub_id <> target_hub_id)
);

-- Góp ý #9: trạng thái quản lý theo TỪNG xe trong lệnh
CREATE TABLE transfer_item (
    id               BIGSERIAL PRIMARY KEY,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_id         BIGINT      NOT NULL REFERENCES transfer_order (id),
    vehicle_id       BIGINT      NOT NULL REFERENCES vehicle (id),
    status           VARCHAR(20) NOT NULL, -- LOCKED, LOADED, IN_TRANSIT, DELIVERED, FAILED, REMOVED
    held_slot_id     BIGINT REFERENCES parking_slot (id), -- góp ý #10: ô giữ sẵn tại Hub đích
    delivered_hub_id BIGINT REFERENCES hub (id),
    loaded_at        TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    note             VARCHAR(255),
    version          BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_transfer_item_active_vehicle ON transfer_item (vehicle_id) WHERE status IN ('LOCKED', 'LOADED', 'IN_TRANSIT');
ALTER TABLE parking_slot ADD CONSTRAINT fk_slot_held_item FOREIGN KEY (held_for_item_id) REFERENCES transfer_item (id);

-- ------------------------------------------------------------- MT: sự cố & bảo trì
CREATE TABLE incident (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code        VARCHAR(30) NOT NULL UNIQUE,
    reporter_id BIGINT REFERENCES app_user (id),
    hub_id      BIGINT      NOT NULL REFERENCES hub (id),
    target_type VARCHAR(30) NOT NULL, -- VEHICLE, CHARGING_PORT, PARKING_SLOT, HUB
    target_id   BIGINT      NOT NULL,
    category    VARCHAR(50) NOT NULL,
    severity    VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    source      VARCHAR(20) NOT NULL, -- USER, RATING, SYSTEM, DRIVER
    description VARCHAR(1000) NOT NULL,
    photo_urls  JSONB,
    status      VARCHAR(20) NOT NULL, -- OPEN, ASSIGNED, RESOLVED, CLOSED
    trip_id     BIGINT REFERENCES trip (id),
    follow_ups  INTEGER NOT NULL DEFAULT 0,
    closed_at   TIMESTAMPTZ,
    version     BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_incident_open_target ON incident (target_type, target_id) WHERE status IN ('OPEN', 'ASSIGNED');

CREATE TABLE incident_follow_up (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    incident_id BIGINT NOT NULL REFERENCES incident (id),
    user_id     BIGINT REFERENCES app_user (id),
    note        VARCHAR(1000)
);

CREATE TABLE maintenance_order (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code          VARCHAR(30) NOT NULL UNIQUE,
    technician_id BIGINT REFERENCES app_user (id),
    status        VARCHAR(20) NOT NULL, -- PENDING, IN_PROGRESS, DONE, CANCELLED
    priority      VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    due_at        TIMESTAMPTZ,
    incident_id   BIGINT REFERENCES incident (id),
    alert_id      BIGINT REFERENCES alert (id),
    note          VARCHAR(500),
    created_by    BIGINT NOT NULL REFERENCES app_user (id),
    version       BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE maintenance_ticket (
    id                BIGSERIAL PRIMARY KEY,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_id          BIGINT      NOT NULL REFERENCES maintenance_order (id),
    target_type       VARCHAR(30) NOT NULL, -- VEHICLE, CHARGING_PORT
    target_id         BIGINT      NOT NULL,
    progress          VARCHAR(30) NOT NULL, -- PENDING, REPAIRING, WAITING_PARTS, DONE, UNREPAIRABLE
    diagnosis         VARCHAR(1000),
    repair_items      VARCHAR(1000),
    replaced_parts    VARCHAR(1000),
    verification_note VARCHAR(500),
    version           BIGINT NOT NULL DEFAULT 0,
    UNIQUE (order_id, target_type, target_id)
);

-- ------------------------------------------------------------- SC: lịch sạc vs phiên sạc
CREATE TABLE charging_schedule (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code          VARCHAR(30) NOT NULL UNIQUE,
    hub_id        BIGINT      NOT NULL REFERENCES hub (id),
    status        VARCHAR(20) NOT NULL, -- DRAFT, CONFIRMED, SUPERSEDED, DISCARDED
    horizon_start TIMESTAMPTZ NOT NULL,
    horizon_end   TIMESTAMPTZ NOT NULL,
    unmet         JSONB,
    created_by    BIGINT REFERENCES app_user (id),
    confirmed_by  BIGINT REFERENCES app_user (id),
    confirmed_at  TIMESTAMPTZ,
    version       BIGINT NOT NULL DEFAULT 0
);

-- Góp ý #11: item = "lịch" (kế hoạch). Xe CHỈ Charging khi có charging_session ACTIVE.
CREATE TABLE charging_schedule_item (
    id             BIGSERIAL PRIMARY KEY,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    schedule_id    BIGINT NOT NULL REFERENCES charging_schedule (id),
    vehicle_id     BIGINT NOT NULL REFERENCES vehicle (id),
    port_id        BIGINT NOT NULL REFERENCES charging_port (id),
    start_at       TIMESTAMPTZ NOT NULL,
    end_at         TIMESTAMPTZ NOT NULL,
    priority       DOUBLE PRECISION NOT NULL,
    target_battery SMALLINT NOT NULL DEFAULT 90,
    status         VARCHAR(20) NOT NULL, -- SCHEDULED, ACTIVE, COMPLETED, CANCELLED, MISSED, NEEDS_RESCHEDULE
    session_id     BIGINT,
    version        BIGINT NOT NULL DEFAULT 0,
    CHECK (end_at > start_at)
);

CREATE TABLE charging_session (
    id               BIGSERIAL PRIMARY KEY,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    port_id          BIGINT      NOT NULL REFERENCES charging_port (id),
    vehicle_id       BIGINT REFERENCES vehicle (id),
    slot_booking_id  BIGINT REFERENCES slot_booking (id),
    schedule_item_id BIGINT REFERENCES charging_schedule_item (id),
    status           VARCHAR(20) NOT NULL, -- STARTING, ACTIVE, STOPPING, COMPLETED, FAILED
    requested_at     TIMESTAMPTZ NOT NULL,
    started_at       TIMESTAMPTZ, -- thời điểm thiết bị XÁC NHẬN cấp điện
    ended_at         TIMESTAMPTZ,
    energy_kwh       DOUBLE PRECISION NOT NULL DEFAULT 0,
    start_battery    SMALLINT,
    end_battery      SMALLINT,
    version          BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_session_active_port ON charging_session (port_id) WHERE status IN ('STARTING', 'ACTIVE', 'STOPPING');
ALTER TABLE charging_schedule_item ADD CONSTRAINT fk_item_session FOREIGN KEY (session_id) REFERENCES charging_session (id);

-- ------------------------------------------------------------- SI: mô phỏng What-if
CREATE TABLE scenario (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(500),
    type            VARCHAR(30)  NOT NULL, -- DEMAND_SURGE, INFRA_FAILURE, REBALANCE, CHARGING_CAPACITY
    params          JSONB        NOT NULL,
    horizon_minutes INTEGER      NOT NULL CHECK (horizon_minutes BETWEEN 15 AND 1440),
    created_by      BIGINT REFERENCES app_user (id)
);

CREATE TABLE simulation_run (
    id                BIGSERIAL PRIMARY KEY,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    code              VARCHAR(30) NOT NULL UNIQUE,
    scenario_id       BIGINT      NOT NULL REFERENCES scenario (id),
    snapshot_taken_at TIMESTAMPTZ NOT NULL,
    snapshot          JSONB       NOT NULL, -- bản sao trạng thái, tách biệt dữ liệu vận hành
    status            VARCHAR(20) NOT NULL, -- RUNNING, COMPLETED, FAILED
    metrics           JSONB,
    error             VARCHAR(500),
    created_by        BIGINT REFERENCES app_user (id),
    finished_at       TIMESTAMPTZ
);

CREATE TABLE recommendation (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_id       BIGINT      NOT NULL REFERENCES simulation_run (id),
    type         VARCHAR(30) NOT NULL, -- TRANSFER, ADJUST_CHARGING
    payload      JSONB       NOT NULL,
    rationale    VARCHAR(500),
    status       VARCHAR(20) NOT NULL, -- PROPOSED, APPLIED, FAILED, REJECTED
    applied_ref  VARCHAR(50),
    apply_result VARCHAR(500),
    applied_by   BIGINT REFERENCES app_user (id),
    applied_at   TIMESTAMPTZ,
    version      BIGINT NOT NULL DEFAULT 0
);
ALTER TABLE transfer_order ADD CONSTRAINT fk_transfer_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendation (id);

-- ------------------------------------------------------------- Dùng chung
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id    BIGINT REFERENCES app_user (id),
    action      VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30),
    entity_id   BIGINT,
    details     JSONB
);
CREATE INDEX ix_audit_entity ON audit_log (entity_type, entity_id);

CREATE TABLE notification (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id    BIGINT       NOT NULL REFERENCES app_user (id),
    type       VARCHAR(40)  NOT NULL,
    title      VARCHAR(150) NOT NULL,
    body       VARCHAR(500) NOT NULL,
    read_at    TIMESTAMPTZ
);
CREATE INDEX ix_notification_user ON notification (user_id, created_at DESC);
