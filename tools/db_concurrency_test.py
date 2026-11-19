"""Kiểm thử ràng buộc nhất quán đồng thời ở tầng DB (đúng các câu lệnh mà service phát ra).
CẢNH BÁO: script XÓA và tạo lại schema public của CSDL trong EMOBILITY_DSN – mặc định dùng CSDL riêng emobility_test.
"""
import threading, uuid, psycopg, datetime as dt
import os
M = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend', 'src', 'main', 'resources', 'db', 'migration') + os.sep
DSN = os.environ.get('EMOBILITY_DSN', "host=127.0.0.1 port=5433 dbname=emobility_test user=emobility password=emobility")

def reset():
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
        c.execute(open(M + 'V1__init.sql').read())
        c.execute(open(M + 'V2__seed.sql').read())
        c.execute("INSERT INTO app_user (id, username, password_hash, full_name, status) SELECT 1000+g, 'sv'||g, 'x', 'SV '||g, 'ACTIVE' FROM generate_series(1,100) g")

def run_parallel(n, fn):
    results, barrier = [None]*n, threading.Barrier(n)
    def worker(i):
        with psycopg.connect(DSN) as c:
            barrier.wait()
            try:
                results[i] = fn(c, i)
                c.commit()
            except Exception as e:
                c.rollback(); results[i] = 'ERR:' + type(e).__name__
    ts = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    [t.start() for t in ts]; [t.join() for t in ts]
    return results

reset()
ok_all = True
def check(name, cond, detail):
    global ok_all
    ok_all &= cond
    print(('PASS ' if cond else 'FAIL ') + name + ' – ' + detail)

# 1) RE01: 100 sinh viên đặt cùng một xe đồng thời → đúng 1 thành công
def reserve(c, i):
    n = c.execute("UPDATE vehicle SET status='RESERVED', version=version+1, updated_at=now() WHERE id=1 AND hub_id IS NOT NULL "
                  "AND status='AVAILABLE' AND battery_percent>=20 AND error_code IS NULL").rowcount
    if n == 0: return 'VEHICLE_UNAVAILABLE'
    c.execute("INSERT INTO reservation (code, student_id, vehicle_id, hub_id, status, reserved_at, expires_at) "
              "VALUES (%s, %s, 1, 1, 'RESERVED', now(), now() + interval '15 minutes')", (f'DX-{i}', 1001 + i))
    return 'OK'
r = run_parallel(100, reserve)
with psycopg.connect(DSN) as c:
    rows = c.execute("SELECT count(*) FROM reservation WHERE vehicle_id=1").fetchone()[0]
    st = c.execute("SELECT status FROM vehicle WHERE id=1").fetchone()[0]
check("RE01 100 yêu cầu đồng thời cùng một xe", r.count('OK') == 1 and r.count('VEHICLE_UNAVAILABLE') == 99 and rows == 1 and st == 'RESERVED',
      f"OK={r.count('OK')}, từ chối={r.count('VEHICLE_UNAVAILABLE')}, đơn={rows}, xe={st}")

# 2) PV01: 100 người đặt cùng một ô cá nhân, khung giờ chồng lấn → đúng 1 thành công (khóa ô + kiểm tra + exclusion)
with psycopg.connect(DSN) as c:
    slot = c.execute("SELECT id FROM parking_slot WHERE hub_id=1 AND kind='PERSONAL' ORDER BY code LIMIT 1").fetchone()[0]
    c.execute("INSERT INTO personal_vehicle (owner_id, plate_number, type, battery_kwh, connector_type) SELECT 1000+g, 'PL-'||g, 'E_SCOOTER', 3, 'TYPE_2' FROM generate_series(1,100) g")
    c.commit()
def book(c, i):
    c.execute("SELECT id FROM parking_slot WHERE id=%s FOR UPDATE", (slot,))
    busy = c.execute("SELECT count(*) FROM slot_booking WHERE slot_id=%s AND status IN ('BOOKED','IN_USE','CHECKOUT_REQUESTED','AWAITING_EXIT') "
                     "AND start_at < now() + interval '3 hours' AND end_at > now() + interval '1 hour'", (slot,)).fetchone()[0]
    if busy: return 'SLOT_UNAVAILABLE'
    pv = c.execute("SELECT id FROM personal_vehicle WHERE owner_id=%s", (1001 + i,)).fetchone()[0]
    c.execute("INSERT INTO slot_booking (code, owner_id, personal_vehicle_id, hub_id, slot_id, service_type, start_at, end_at, status, qr_token) "
              "VALUES (%s,%s,%s,1,%s,'PARK', now() + interval '1 hour' + (%s||' minutes')::interval, now() + interval '3 hours', 'BOOKED', %s)",
              (f'BK-{i}', 1001 + i, pv, slot, i % 30, str(uuid.uuid4())))
    return 'OK'
r = run_parallel(100, book)
check("PV01 100 yêu cầu đồng thời cùng ô đỗ", r.count('OK') == 1, f"OK={r.count('OK')}, từ chối={r.count('SLOT_UNAVAILABLE')}, lỗi={len([x for x in r if str(x).startswith('ERR')])}")

# 3) Exclusion constraint là chốt chặn cuối kể cả khi bỏ qua bước khóa (cổng sạc)
with psycopg.connect(DSN) as c:
    port = c.execute("SELECT id FROM charging_port WHERE hub_id=1 ORDER BY code LIMIT 1").fetchone()[0]
def port_raw(c, i):
    c.execute("INSERT INTO port_reservation (port_id, start_at, end_at, source_type, source_id, status) "
              "VALUES (%s, now() + interval '5 hours', now() + interval '6 hours', 'BOOKING', %s, 'ACTIVE')", (port, 90000 + i))
    return 'OK'
r = run_parallel(50, port_raw)
check("Exclusion constraint cổng sạc (không khóa ứng dụng)", r.count('OK') == 1, f"OK={r.count('OK')}, bị DB chặn={len([x for x in r if 'IntegrityError' in str(x) or 'ExclusionViolation' in str(x)])}")

# 4) Góp ý #7 – PV01 'Cả hai': giữ được ô nhưng cổng đã bị giữ → rollback cả hai
with psycopg.connect(DSN) as c:
    slot2 = c.execute("SELECT id FROM parking_slot WHERE hub_id=1 AND kind='PERSONAL' ORDER BY code OFFSET 1 LIMIT 1").fetchone()[0]
    pv = c.execute("SELECT id FROM personal_vehicle WHERE owner_id=1050").fetchone()[0]
    try:
        with c.transaction():
            b = c.execute("INSERT INTO slot_booking (code, owner_id, personal_vehicle_id, hub_id, slot_id, port_id, service_type, start_at, end_at, status, qr_token) "
                          "VALUES ('BK-BOTH', 1050, %s, 1, %s, %s, 'BOTH', now() + interval '5 hours 15 minutes', now() + interval '5 hours 45 minutes', 'BOOKED', 'qr-both') RETURNING id",
                          (pv, slot2, port)).fetchone()[0]
            c.execute("INSERT INTO port_reservation (port_id, start_at, end_at, source_type, source_id, status) "
                      "VALUES (%s, now() + interval '5 hours 15 minutes', now() + interval '5 hours 45 minutes', 'BOOKING', %s, 'ACTIVE')", (port, b))
        outcome = 'committed'
    except psycopg.errors.ExclusionViolation:
        outcome = 'rolled back'
    left = c.execute("SELECT count(*) FROM slot_booking WHERE code='BK-BOTH'").fetchone()[0]
check("PV01 'Cả hai' nguyên tử (cổng bận → không giữ dở dang chỗ đỗ)", outcome == 'rolled back' and left == 0, f"{outcome}, đơn còn lại={left}")

# 5) Góp ý #4 – RE04: gửi lặp cùng Idempotency-Key đồng thời → chỉ cộng 10 phút một lần
with psycopg.connect(DSN) as c:
    rid, exp0 = c.execute("SELECT id, expires_at FROM reservation WHERE vehicle_id=1").fetchone()
def extend(c, i):
    c.execute("SELECT id FROM reservation WHERE id=%s FOR UPDATE", (rid,))
    if c.execute("SELECT 1 FROM reservation_extension WHERE reservation_id=%s AND request_id='req-A'", (rid,)).fetchone(): return 'REPLAY'
    st, cnt = c.execute("SELECT status, extension_count FROM reservation WHERE id=%s", (rid,)).fetchone()
    if st != 'RESERVED' or cnt >= 2: return 'REJECT'
    old = c.execute("SELECT expires_at FROM reservation WHERE id=%s", (rid,)).fetchone()[0]
    c.execute("UPDATE reservation SET expires_at = expires_at + interval '10 minutes', extension_count = extension_count + 1, version=version+1 WHERE id=%s", (rid,))
    c.execute("INSERT INTO reservation_extension (reservation_id, request_id, old_expires_at, new_expires_at) VALUES (%s,'req-A',%s,%s)", (rid, old, old + dt.timedelta(minutes=10)))
    return 'OK'
r = run_parallel(20, extend)
with psycopg.connect(DSN) as c:
    exp1, cnt = c.execute("SELECT expires_at, extension_count FROM reservation WHERE id=%s", (rid,)).fetchone()
check("RE04 20 lần bấm lặp cùng request_id", r.count('OK') == 1 and r.count('REPLAY') == 19 and (exp1 - exp0) == dt.timedelta(minutes=10) and cnt == 1,
      f"OK={r.count('OK')}, replay={r.count('REPLAY')}, +{(exp1 - exp0)}, count={cnt}")

# 6) Góp ý #4 – gia hạn và hủy đồng thời: không có trạng thái mâu thuẫn
def ext_or_cancel(c, i):
    c.execute("SELECT id FROM reservation WHERE id=%s FOR UPDATE", (rid,))
    st = c.execute("SELECT status FROM reservation WHERE id=%s", (rid,)).fetchone()[0]
    if st != 'RESERVED': return 'REJECT_' + st
    if i % 2 == 0:
        c.execute("UPDATE reservation SET status='CANCELLED' WHERE id=%s", (rid,))
        c.execute("UPDATE vehicle SET status='PENDING_CHECK' WHERE id=1 AND status='RESERVED'")
        return 'CANCELLED'
    c.execute("UPDATE reservation SET extension_count = extension_count + 1, expires_at = expires_at + interval '10 minutes' WHERE id=%s AND extension_count < 2", (rid,))
    return 'EXTENDED'
r = run_parallel(10, ext_or_cancel)
with psycopg.connect(DSN) as c:
    st, cnt = c.execute("SELECT status, extension_count FROM reservation WHERE id=%s", (rid,)).fetchone()
    vst = c.execute("SELECT status FROM vehicle WHERE id=1").fetchone()[0]
check("RE03/RE04 hủy và gia hạn tranh chấp", st == 'CANCELLED' and r.count('CANCELLED') == 1 and vst == 'PENDING_CHECK' and cnt <= 2,
      f"kết quả={sorted(set(r))}, đơn={st}, xe={vst}, gia hạn={cnt}")

# 7) NFR – ngắt kết nối giữa chừng: không có xe 'Đã đặt' mà không có đơn
with psycopg.connect(DSN) as c:
    c.execute("UPDATE vehicle SET status='AVAILABLE' WHERE id=2"); c.commit()
c = psycopg.connect(DSN)
c.execute("UPDATE vehicle SET status='RESERVED' WHERE id=2 AND status='AVAILABLE'")
c.close()   # mất kết nối trước khi tạo đơn
with psycopg.connect(DSN) as c:
    st = c.execute("SELECT status FROM vehicle WHERE id=2").fetchone()[0]
    orphan = c.execute("SELECT count(*) FROM vehicle v WHERE status IN ('RESERVED','PICKUP_PENDING') AND NOT EXISTS "
                       "(SELECT 1 FROM reservation r WHERE r.vehicle_id=v.id AND r.status IN ('RESERVED','PICKUP_PENDING','PICKED_UP'))").fetchone()[0]
check("Mất kết nối giữa giao dịch", st == 'AVAILABLE' and orphan == 0, f"xe={st}, xe đặt mà không có đơn={orphan}")

# 8) Góp ý #10 – hai lệnh điều chuyển cùng tới một Hub: giữ capacity không trùng (FOR UPDATE SKIP LOCKED)
with psycopg.connect(DSN) as c:
    free = c.execute("SELECT count(*) FROM parking_slot WHERE hub_id=2 AND kind='SHARED' AND status='AVAILABLE'").fetchone()[0]
    c.execute("INSERT INTO transfer_order (code, source_hub_id, target_hub_id, status) VALUES ('DC-A',5,2,'QUEUED'),('DC-B',6,2,'QUEUED')")
    c.commit()
need = free // 2 + 2
def hold(c, i):
    oid = c.execute("SELECT id FROM transfer_order WHERE code=%s", ('DC-A' if i == 0 else 'DC-B',)).fetchone()[0]
    rows = c.execute("SELECT id FROM parking_slot WHERE hub_id=2 AND kind='SHARED' AND status='AVAILABLE' ORDER BY code LIMIT %s FOR UPDATE SKIP LOCKED", (need,)).fetchall()
    if len(rows) < need: raise RuntimeError('HUB_FULL')
    for (sid,) in rows:
        vid = c.execute("SELECT id FROM vehicle WHERE hub_id=5 AND status='AVAILABLE' LIMIT 1 FOR UPDATE SKIP LOCKED").fetchone()[0]
        c.execute("UPDATE vehicle SET status='TRANSFER_LOCKED' WHERE id=%s", (vid,))
        it = c.execute("INSERT INTO transfer_item (order_id, vehicle_id, status) VALUES (%s,%s,'LOCKED') RETURNING id", (oid, vid)).fetchone()[0]
        c.execute("UPDATE parking_slot SET status='HELD', held_for_item_id=%s WHERE id=%s", (it, sid))
    return 'OK'
r = run_parallel(2, hold)
with psycopg.connect(DSN) as c:
    held = c.execute("SELECT count(*) FROM parking_slot WHERE hub_id=2 AND status='HELD'").fetchone()[0]
check("RB01 giữ capacity Hub đích khi 2 lệnh tranh chấp", r.count('OK') == 1 and held == need,
      f"chỗ trống={free}, mỗi lệnh cần={need}, thành công={r.count('OK')}, ô HELD={held}")

# 9) Cảnh báo không trùng lặp
with psycopg.connect(DSN) as c:
    for _ in range(3):
        c.execute("INSERT INTO alert (type, hub_id, severity, status, message) VALUES ('OVERLOAD', 3, 'WARNING', 'OPEN', 'x') "
                  "ON CONFLICT (type, coalesce(hub_id,0), coalesce(resource_type,''), coalesce(resource_id,0)) WHERE status <> 'RESOLVED' DO NOTHING")
    n = c.execute("SELECT count(*) FROM alert WHERE type='OVERLOAD' AND hub_id=3").fetchone()[0]
check("Cảnh báo mở không trùng lặp", n == 1, f"số cảnh báo={n}")
print("\nTẤT CẢ ĐẠT" if ok_all else "\nCÓ KIỂM THỬ KHÔNG ĐẠT")
