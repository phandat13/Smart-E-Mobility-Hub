-- Extension for exclusion constraint (PV01, PV04)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_user (
                          id BIGSERIAL PRIMARY KEY,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          username VARCHAR(50) UNIQUE NOT NULL,
                          password_hash VARCHAR(255) NOT NULL,
                          role VARCHAR(20) NOT NULL, -- STUDENT, OPERATOR, DRIVER, TECHNICIAN
                          full_name VARCHAR(100) NOT NULL,
                          status VARCHAR(20) NOT NULL
);

CREATE TABLE student_profile (
                                 id BIGSERIAL PRIMARY KEY,
                                 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                 user_id BIGINT UNIQUE NOT NULL REFERENCES app_user(id),
                                 student_code VARCHAR(20) UNIQUE NOT NULL,
                                 phone VARCHAR(20) UNIQUE NOT NULL,
                                 email VARCHAR(100) UNIQUE NOT NULL,
                                 citizen_id_encrypted VARCHAR(255) NOT NULL,
                                 verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE hub (
                     id BIGSERIAL PRIMARY KEY,
                     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                     code VARCHAR(20) UNIQUE NOT NULL,
                     name VARCHAR(100) NOT NULL,
                     latitude DOUBLE PRECISION NOT NULL,
                     longitude DOUBLE PRECISION NOT NULL,
                     type VARCHAR(20) NOT NULL, -- METRO, DORM, CAMPUS, SERVICE
                     parking_capacity INTEGER NOT NULL CHECK (parking_capacity > 0),
                     status VARCHAR(20) NOT NULL,
                     last_sync_at TIMESTAMPTZ
);

CREATE TABLE parking_slot (
                              id BIGSERIAL PRIMARY KEY,
                              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              hub_id BIGINT NOT NULL REFERENCES hub(id),
                              code VARCHAR(20) NOT NULL,
                              kind VARCHAR(20) NOT NULL, -- SHARED, PERSONAL
                              status VARCHAR(30) NOT NULL, -- AVAILABLE, HELD, OCCUPIED, PENDING_CHECK, FAULTY, MAINTENANCE, DISABLED
                              version BIGINT NOT NULL DEFAULT 0,
                              UNIQUE (hub_id, code)
);

CREATE TABLE charging_port (
                               id BIGSERIAL PRIMARY KEY,
                               created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                               updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                               hub_id BIGINT NOT NULL REFERENCES hub(id),
                               code VARCHAR(20) NOT NULL,
                               power_kw DOUBLE PRECISION NOT NULL,
                               connector_type VARCHAR(20) NOT NULL,
                               status VARCHAR(30) NOT NULL, -- AVAILABLE, HELD, OCCUPIED, PENDING_CHECK, FAULTY, MAINTENANCE, DISABLED
                               current_session_id BIGINT,
                               version BIGINT NOT NULL DEFAULT 0,
                               UNIQUE (hub_id, code)
);

CREATE TABLE vehicle (
                         id BIGSERIAL PRIMARY KEY,
                         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                         code VARCHAR(20) UNIQUE NOT NULL,
                         type VARCHAR(20) NOT NULL, -- E_BIKE, E_SCOOTER
                         hub_id BIGINT REFERENCES hub(id),
                         status VARCHAR(30) NOT NULL, -- AVAILABLE, RESERVED, PICKUP_PENDING, IN_USE, PENDING_CHECK, NEEDS_CHARGE, CHARGING, TRANSFER_LOCKED, FAULTY, MAINTENANCE_LOCKED, OUT_OF_SERVICE
                         battery_percent SMALLINT NOT NULL CHECK (battery_percent BETWEEN 0 AND 100),
                         range_km DOUBLE PRECISION NOT NULL,
                         last_seen_at TIMESTAMPTZ,
                         version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE alert (
                       id BIGSERIAL PRIMARY KEY,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       type VARCHAR(30) NOT NULL, -- OVERLOAD, IMBALANCE, DEVICE_ERROR, OFFLINE
                       hub_id BIGINT REFERENCES hub(id),
                       resource_type VARCHAR(50),
                       resource_id BIGINT,
                       severity VARCHAR(20) NOT NULL,
                       status VARCHAR(20) NOT NULL
);

CREATE TABLE telemetry_record (
                                  id BIGSERIAL PRIMARY KEY,
                                  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                  device_type VARCHAR(50) NOT NULL,
                                  device_id BIGINT NOT NULL,
                                  payload JSONB NOT NULL,
                                  received_at TIMESTAMPTZ NOT NULL
);

-- 4. Bảng thuê mượn xe dùng chung (RENTAL/RE)
CREATE TABLE reservation (
                             id BIGSERIAL PRIMARY KEY,
                             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                             updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                             code VARCHAR(20) UNIQUE NOT NULL,
                             student_id BIGINT NOT NULL REFERENCES app_user(id),
                             vehicle_id BIGINT NOT NULL REFERENCES vehicle(id),
                             hub_id BIGINT NOT NULL REFERENCES hub(id),
                             status VARCHAR(20) NOT NULL, -- RESERVED, PICKED_UP, COMPLETED, CANCELLED, EXPIRED
                             reserved_at TIMESTAMPTZ NOT NULL,
                             expires_at TIMESTAMPTZ NOT NULL,
                             extension_count SMALLINT NOT NULL DEFAULT 0 CHECK (extension_count <= 2)
);

CREATE UNIQUE INDEX ux_reservation_one_active_per_student ON reservation(student_id) WHERE status = 'RESERVED';
CREATE UNIQUE INDEX ux_reservation_one_active_per_vehicle ON reservation(vehicle_id) WHERE status IN ('RESERVED', 'PICKED_UP');

CREATE TABLE trip (
                      id BIGSERIAL PRIMARY KEY,
                      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                      reservation_id BIGINT UNIQUE REFERENCES reservation(id),
                      student_id BIGINT NOT NULL REFERENCES app_user(id),
                      vehicle_id BIGINT NOT NULL REFERENCES vehicle(id),
                      start_hub_id BIGINT NOT NULL REFERENCES hub(id),
                      end_hub_id BIGINT REFERENCES hub(id),
                      started_at TIMESTAMPTZ NOT NULL,
                      ended_at TIMESTAMPTZ,
                      start_battery SMALLINT NOT NULL,
                      end_battery SMALLINT,
                      distance_km DOUBLE PRECISION,
                      cost NUMERIC(10, 2),
                      rated BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE rating (
                        id BIGSERIAL PRIMARY KEY,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        trip_id BIGINT UNIQUE NOT NULL REFERENCES trip(id),
                        vehicle_stars SMALLINT NOT NULL CHECK (vehicle_stars BETWEEN 1 AND 5),
                        hub_stars SMALLINT NOT NULL CHECK (hub_stars BETWEEN 1 AND 5),
                        comment TEXT,
                        photo_urls JSONB
);

CREATE TABLE personal_vehicle (
                                  id BIGSERIAL PRIMARY KEY,
                                  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                  owner_id BIGINT NOT NULL REFERENCES app_user(id),
                                  plate_number VARCHAR(20) UNIQUE NOT NULL,
                                  type VARCHAR(20) NOT NULL,
                                  battery_kwh DOUBLE PRECISION NOT NULL,
                                  connector_type VARCHAR(20) NOT NULL
);

CREATE TABLE slot_booking (
                              id BIGSERIAL PRIMARY KEY,
                              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              owner_id BIGINT NOT NULL REFERENCES app_user(id),
                              personal_vehicle_id BIGINT NOT NULL REFERENCES personal_vehicle(id),
                              hub_id BIGINT NOT NULL REFERENCES hub(id),
                              slot_id BIGINT NOT NULL REFERENCES parking_slot(id),
                              port_id BIGINT REFERENCES charging_port(id),
                              service_type VARCHAR(20) NOT NULL, -- PARK, CHARGE, BOTH
                              start_at TIMESTAMPTZ NOT NULL,
                              end_at TIMESTAMPTZ NOT NULL,
                              status VARCHAR(20) NOT NULL, -- BOOKED, IN_USE, COMPLETED, CANCELLED, EXPIRED
                              qr_token VARCHAR(100) UNIQUE NOT NULL,
                              energy_kwh DOUBLE PRECISION,
                              cost NUMERIC(10, 2)
);

ALTER TABLE slot_booking ADD CONSTRAINT ex_slot_no_overlap
    EXCLUDE USING gist (slot_id WITH =, tstzrange(start_at, end_at) WITH &&)
WHERE (status IN ('BOOKED', 'IN_USE'));

ALTER TABLE slot_booking ADD CONSTRAINT ex_port_no_overlap
    EXCLUDE USING gist (port_id WITH =, tstzrange(start_at, end_at) WITH &&)
WHERE (status IN ('BOOKED', 'IN_USE') AND port_id IS NOT NULL);

CREATE TABLE driver (
                        id BIGSERIAL PRIMARY KEY,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        user_id BIGINT UNIQUE NOT NULL REFERENCES app_user(id),
                        status VARCHAR(20) NOT NULL -- FREE, BUSY
);

CREATE TABLE transfer_order (
                                id BIGSERIAL PRIMARY KEY,
                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                code VARCHAR(20) UNIQUE NOT NULL,
                                source_hub_id BIGINT NOT NULL REFERENCES hub(id),
                                target_hub_id BIGINT NOT NULL REFERENCES hub(id),
                                driver_id BIGINT REFERENCES driver(id),
                                status VARCHAR(20) NOT NULL,
                                alert_id BIGINT REFERENCES alert(id),
                                recommendation_id BIGINT
);

CREATE TABLE transfer_item (
                               id BIGSERIAL PRIMARY KEY,
                               created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                               updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                               order_id BIGINT NOT NULL REFERENCES transfer_order(id),
                               vehicle_id BIGINT NOT NULL REFERENCES vehicle(id),
                               status VARCHAR(20) NOT NULL -- LOCKED, LOADED, DELIVERED, REMOVED
);

CREATE TABLE incident (
                          id BIGSERIAL PRIMARY KEY,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          code VARCHAR(20) UNIQUE NOT NULL,
                          reporter_id BIGINT REFERENCES app_user(id),
                          hub_id BIGINT NOT NULL REFERENCES hub(id),
                          target_type VARCHAR(50) NOT NULL,
                          target_id BIGINT NOT NULL,
                          category VARCHAR(50) NOT NULL,
                          severity VARCHAR(20) NOT NULL,
                          description TEXT NOT NULL,
                          photo_urls JSONB,
                          status VARCHAR(20) NOT NULL
);

CREATE TABLE maintenance_order (
                                   id BIGSERIAL PRIMARY KEY,
                                   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                   code VARCHAR(20) UNIQUE NOT NULL,
                                   technician_id BIGINT REFERENCES app_user(id),
                                   status VARCHAR(20) NOT NULL,
                                   created_by BIGINT NOT NULL REFERENCES app_user(id)
);

CREATE TABLE maintenance_ticket (
                                    id BIGSERIAL PRIMARY KEY,
                                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                    order_id BIGINT NOT NULL REFERENCES maintenance_order(id),
                                    vehicle_id BIGINT NOT NULL REFERENCES vehicle(id),
                                    diagnosis TEXT,
                                    repair_items TEXT,
                                    replaced_parts TEXT,
                                    progress VARCHAR(30) NOT NULL -- REPAIRING, WAITING_PARTS, DONE, UNREPAIRABLE
);

CREATE TABLE charging_schedule (
                                   id BIGSERIAL PRIMARY KEY,
                                   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                   hub_id BIGINT NOT NULL REFERENCES hub(id),
                                   status VARCHAR(20) NOT NULL, -- DRAFT, CONFIRMED, SUPERSEDED
                                   confirmed_by BIGINT REFERENCES app_user(id),
                                   confirmed_at TIMESTAMPTZ
);

CREATE TABLE charging_schedule_item (
                                        id BIGSERIAL PRIMARY KEY,
                                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                        schedule_id BIGINT NOT NULL REFERENCES charging_schedule(id),
                                        vehicle_id BIGINT NOT NULL REFERENCES vehicle(id),
                                        port_id BIGINT NOT NULL REFERENCES charging_port(id),
                                        start_at TIMESTAMPTZ NOT NULL,
                                        end_at TIMESTAMPTZ NOT NULL,
                                        priority DOUBLE PRECISION NOT NULL
);


CREATE TABLE scenario (
                          id BIGSERIAL PRIMARY KEY,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          name VARCHAR(100) UNIQUE NOT NULL,
                          type VARCHAR(30) NOT NULL, -- DEMAND_SURGE, INFRA_FAILURE, REBALANCE, CHARGING_CAPACITY
                          params JSONB NOT NULL,
                          horizon_minutes INTEGER NOT NULL
);

CREATE TABLE simulation_run (
                                id BIGSERIAL PRIMARY KEY,
                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                scenario_id BIGINT NOT NULL REFERENCES scenario(id),
                                snapshot_taken_at TIMESTAMPTZ NOT NULL,
                                snapshot JSONB NOT NULL,
                                status VARCHAR(20) NOT NULL,
                                metrics JSONB NOT NULL
);

CREATE TABLE recommendation (
                                id BIGSERIAL PRIMARY KEY,
                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                run_id BIGINT NOT NULL REFERENCES simulation_run(id),
                                type VARCHAR(30) NOT NULL, -- TRANSFER, ADJUST_CHARGING, REDIRECT_USERS
                                payload JSONB NOT NULL,
                                applied BOOLEAN NOT NULL DEFAULT FALSE,
                                apply_result TEXT
);