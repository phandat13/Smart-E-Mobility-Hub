INSERT INTO app_user (id, username, password_hash, role, full_name, status) VALUES
                                                                                (1, 'student', '$2a$12$N9.m1uC1mGj41fP.v0oE.O0Z.8i.2r29j38y6f5xH.9O/z/G.x2.O', 'STUDENT', 'Sinh Vien Test', 'ACTIVE'),
                                                                                (2, 'operator', '$2a$12$N9.m1uC1mGj41fP.v0oE.O0Z.8i.2r29j38y6f5xH.9O/z/G.x2.O', 'OPERATOR', 'Dieu Hanh Test', 'ACTIVE'),
                                                                                (3, 'driver', '$2a$12$N9.m1uC1mGj41fP.v0oE.O0Z.8i.2r29j38y6f5xH.9O/z/G.x2.O', 'DRIVER', 'Tai Xe Test', 'ACTIVE'),
                                                                                (4, 'tech', '$2a$12$N9.m1uC1mGj41fP.v0oE.O0Z.8i.2r29j38y6f5xH.9O/z/G.x2.O', 'TECHNICIAN', 'Ky Thuat Test', 'ACTIVE');

ALTER SEQUENCE app_user_id_seq RESTART WITH 5;

INSERT INTO student_profile (user_id, student_code, phone, email, citizen_id_encrypted, verified) VALUES
    (1, '2410000', '0901234567', 'student@hcmut.edu.vn', 'ENCRYPTED_CCCD_1', TRUE);

INSERT INTO driver (user_id, status) VALUES
    (3, 'FREE');

INSERT INTO hub (id, code, name, latitude, longitude, type, parking_capacity, status) VALUES
                                                                                          (1, 'HUB_METRO', 'Ga Metro ĐHQG', 10.8752, 106.8005, 'METRO', 20, 'ACTIVE'),
                                                                                          (2, 'HUB_KTXA', 'KTX khu A', 10.8785, 106.8062, 'DORM', 20, 'ACTIVE'),
                                                                                          (3, 'HUB_KTXB', 'KTX khu B', 10.8821, 106.7824, 'DORM', 20, 'ACTIVE'),
                                                                                          (4, 'HUB_HCMUT', 'ĐH Bách khoa', 10.8801, 106.8054, 'CAMPUS', 20, 'ACTIVE'),
                                                                                          (5, 'HUB_NVHSV', 'Nhà Văn hóa Sinh viên', 10.8763, 106.8021, 'SERVICE', 20, 'ACTIVE');

ALTER SEQUENCE hub_id_seq RESTART WITH 6;

DO $$
DECLARE
h_id INT;
    i INT;
    v_type VARCHAR(20);
BEGIN
FOR h_id IN 1..5 LOOP

        FOR i IN 1..20 LOOP
            INSERT INTO parking_slot (hub_id, code, kind, status)
            VALUES (h_id, 'SLOT_' || h_id || '_' || LPAD(i::text, 2, '0'), 'SHARED', 'AVAILABLE');
END LOOP;

FOR i IN 1..4 LOOP
            INSERT INTO charging_port (hub_id, code, power_kw, connector_type, status)
            VALUES (h_id, 'PORT_' || h_id || '_' || LPAD(i::text, 2, '0'), 7.4, 'TYPE_2', 'AVAILABLE');
END LOOP;

FOR i IN 1..10 LOOP
            IF i % 2 = 0 THEN
                v_type := 'E_SCOOTER';
ELSE
                v_type := 'E_BIKE';
END IF;

INSERT INTO vehicle (hub_id, code, type, status, battery_percent, range_km)
VALUES (h_id, 'VEH_' || h_id || '_' || LPAD(i::text, 2, '0'), v_type, 'AVAILABLE', 100, 40.0);
END LOOP;

END LOOP;
END $$;