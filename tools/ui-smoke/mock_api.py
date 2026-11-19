"""Fixture API giả lập (khớp DTO) để chụp màn hình frontend khi không chạy được Spring Boot trong sandbox."""
import datetime as dt, json, re

NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
def iso(minutes=0): return (NOW + dt.timedelta(minutes=minutes)).isoformat().replace('+00:00', 'Z')

def hub(i, code, name, typ, lat, lng, avail, total, free_s, cap_s, free_p, cap_p, ports, free_ports, faulty=0, stale=False, status='ACTIVE'):
    return dict(id=i, code=code, name=name, address=f'{name}, ĐHQG-HCM', area='Linh Trung' if i < 4 else 'Đông Hòa', type=typ, status=status, latitude=lat, longitude=lng,
                availableVehicles=avail, avgBattery=72, totalVehicles=total, freeSharedSlots=free_s, sharedCapacity=cap_s, freePersonalSlots=free_p, personalCapacity=cap_p,
                freePorts=free_ports, totalPorts=ports, faultyPorts=faulty, dataUpdatedAt=iso(-1 if not stale else -14), stale=stale, servedAt=iso())
HUBS = [hub(1, 'HUB-KTXA', 'KTX Khu A', 'DORM', 10.8789, 106.8060, 9, 14, 4, 20, 3, 6, 6, 2, 1),
        hub(2, 'HUB-TVTT', 'Thư viện Trung tâm', 'CAMPUS', 10.8760, 106.8017, 2, 10, 11, 16, 4, 4, 4, 3),
        hub(3, 'HUB-METRO', 'Ga Metro Suối Tiên', 'METRO', 10.8665, 106.8030, 1, 12, 1, 14, 0, 2, 4, 0, 2),
        hub(4, 'HUB-H6', 'Nhà điều hành H6', 'ADMIN', 10.8805, 106.7990, 6, 8, 8, 12, 2, 2, 2, 2, 0, True)]
USERS = {'STUDENT': dict(id=1, username='anh.nm2410717', fullName='Nguyễn Minh Anh', activeRole='STUDENT', roles=['STUDENT'], studentCode='2410717'),
         'OPERATOR': dict(id=3, username='vanhanh.trangle', fullName='Lê Thu Trang', activeRole='OPERATOR', roles=['OPERATOR'], studentCode=None),
         'DRIVER': dict(id=4, username='taixe.vanbinh', fullName='Trần Văn Bình', activeRole='DRIVER', roles=['DRIVER'], studentCode=None),
         'TECHNICIAN': dict(id=6, username='kythuat.vannam', fullName='Phạm Văn Nam', activeRole='TECHNICIAN', roles=['TECHNICIAN'], studentCode=None)}
VEH = lambda i, b, s='AVAILABLE': dict(id=i, code=f'UG-{i:03d}', type='E_BIKE' if i % 3 else 'E_SCOOTER', model='DatBike Weaver' if i % 3 else 'VinFast Evo', batteryPercent=b, rangeKm=round(b * 0.6, 1), status=s)
RES = dict(id=11, code='RSV-2611-0042', status='ACTIVE', direct=False, vehicleId=18, vehicleCode='UG-018', vehicleType='E_BIKE', batteryPercent=86, rangeKm=51.6, hubId=1, hubName='KTX Khu A',
           hubLat=10.8789, hubLng=106.806, reservedAt=iso(-6), expiresAt=iso(9), secondsLeft=540, extensionCount=1, maxExtensions=2, closeReason=None, closedAt=None,
           extensions=[dict(oldExpiresAt=iso(-1), newExpiresAt=iso(9), at=iso(-2))], tripCode=None, message=None)
TRIP = dict(id=7, code='TRP-2611-0031', status='IN_PROGRESS', returnMode=None, vehicleId=18, vehicleCode='UG-018', vehicleType='E_BIKE', vehicleModel='DatBike Weaver', startHubId=1, startHubName='KTX Khu A',
            endHubId=None, endHubName=None, endSlotCode=None, startedAt=iso(-23), endedAt=None, durationMinutes=23, distanceKm=4.2, startBattery=86, endBattery=None, currentBattery=71, cost=None,
            rated=False, reconciliationNote=None, offlineSecret='9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')
DONE_TRIP = dict(TRIP, id=5, code='TRP-2511-0007', status='COMPLETED', returnMode='ONLINE', endHubId=2, endHubName='Thư viện Trung tâm', endSlotCode='S-04', endedAt=iso(-1440), startedAt=iso(-1475),
                 durationMinutes=35, distanceKm=5.1, endBattery=58, cost=13500, rated=False, offlineSecret=None)
BOOK = dict(id=3, code='BKG-2611-0012', status='IN_USE', serviceType='BOTH', hubId=1, hubName='KTX Khu A', slotId=41, slotCode='P-02', portId=5, portCode='C-03', portPowerKw=3.3, personalVehicleId=1,
            plateNumber='59-X1 123.45', startAt=iso(-50), endAt=iso(70), qrToken='BKG-2611-0012.d2f1c0', checkedInAt=iso(-48), chargingStoppedAt=None, vehicleLeftAt=None, energyKwh=1.42,
            cost=None, estimatedCost=13500, note=None, charging=dict(id=9, status='ACTIVE', startedAt=iso(-47), endedAt=None, energyKwh=1.42), message=None)
ALERTS = [dict(id=1, type='OVERLOAD', hubId=3, hubName='Ga Metro Suối Tiên', resourceType=None, resourceId=None, severity='CRITICAL', status='OPEN', message='Tỉ lệ lấp đầy 93% vượt ngưỡng 90%', createdAt=iso(-8)),
          dict(id=2, type='IMBALANCE', hubId=2, hubName='Thư viện Trung tâm', resourceType=None, resourceId=None, severity='HIGH', status='OPEN', message='Chỉ còn 2 xe sẵn sàng – KTX Khu A dư 7 xe', createdAt=iso(-12)),
          dict(id=3, type='DEVICE_ERROR', hubId=1, hubName='KTX Khu A', resourceType='VEHICLE', resourceId=22, severity='HIGH', status='ACKNOWLEDGED', message='UG-022 báo lỗi E-BRK-02', createdAt=iso(-30)),
          dict(id=4, type='OFFLINE', hubId=4, hubName='Nhà điều hành H6', resourceType=None, resourceId=None, severity='HIGH', status='OPEN', message='Không nhận heartbeat 14 phút', createdAt=iso(-14))]
def row(h, occ, lvl, alerts, disc=False): return dict(hub=h, occupancyPercent=occ, portUsagePercent=50, loadLevel=lvl, openAlerts=alerts, disconnected=disc, vehiclesByStatus={})
OVERVIEW = dict(totals=dict(activeHubs=4, totalHubs=4, disconnectedHubs=1, totalVehicles=44, availableVehicles=18, inUse=9, charging=6, pendingCheck=5, faulty=3, other=3,
                avgOccupancyPercent=68, hubsOverThreshold=1, portsInUse=7, portsTotal=16, portsFaulty=3),
                hubs=[row(HUBS[0], 80, 'MEDIUM', 1), row(HUBS[1], 31, 'LOW', 1), row(HUBS[2], 93, 'HIGH', 1), row(HUBS[3], 33, 'LOW', 1, True)], alerts=ALERTS, servedAt=iso(), refreshSeconds=30)
SLOTS = [dict(id=100 + k, code=f'S-{k:02d}', kind='SHARED', status=['OCCUPIED', 'AVAILABLE', 'HELD', 'OCCUPIED', 'FAULTY', 'PENDING_CHECK'][k % 6], vehicleCode=f'UG-{k:03d}' if k % 6 in (0, 3) else None, bookingCode=None) for k in range(1, 21)] + \
        [dict(id=40 + k, code=f'P-{k:02d}', kind='PERSONAL', status='OCCUPIED' if k == 2 else 'AVAILABLE', vehicleCode=None, bookingCode='BKG-2611-0012' if k == 2 else None) for k in range(1, 7)]
PORTS = [dict(id=k, code=f'C-{k:02d}', powerKw=3.3 if k < 5 else 7.4, connectorType='TYPE_2' if k != 2 else 'STD_220V', status=['AVAILABLE', 'CHARGING', 'CHARGING', 'FAULTY', 'AVAILABLE', 'MAINTENANCE'][k - 1],
              disableAfterSession=k == 3, freeInWindow=k in (1, 5)) for k in range(1, 7)]
HUB_DETAIL = dict(hub=HUBS[0], vehicles=[dict(VEH(i, 30 + i * 4, ['AVAILABLE', 'CHARGING', 'RESERVED', 'FAULTY', 'NEEDS_CHARGE'][i % 5]), slotCode=f'S-{i:02d}', lockState='LOCKED', lastSeenAt=iso(-1), errorCode='E-BRK-02' if i % 5 == 3 else None, rating=4.6) for i in range(1, 15)],
                  slots=SLOTS, ports=[dict({k: v for k, v in p.items() if k != 'freeInWindow'}, chargingWhat='UG-005 (fleet)' if p['status'] == 'CHARGING' else None, errorCode='E-PORT-OVERHEAT' if p['status'] == 'FAULTY' else None) for p in PORTS],
                  alerts=[ALERTS[2]], stale=False, lastSyncAt=iso(-1))
def item(i, code, b, st, slot=None): return dict(id=i, vehicleId=i, vehicleCode=code, batteryPercent=b, status=st, heldSlotCode=slot, deliveredHubName='Thư viện Trung tâm' if st == 'DELIVERED' else None, loadedAt=iso(-20) if st != 'LOCKED' else None, deliveredAt=iso(-3) if st == 'DELIVERED' else None, note='Lốp xẹp' if st == 'FAILED' else None)
TRANSFER = dict(id=21, code='TRF-2611-0004', sourceHubId=1, sourceHubName='KTX Khu A', targetHubId=2, targetHubName='Thư viện Trung tâm', driverId=1, driverName='Trần Văn Bình', status='PARTIALLY_DELIVERED',
                counts=dict(total=6, locked=0, loaded=0, inTransit=3, delivered=2, failed=1, removed=0), createdAt=iso(-40), startedAt=iso(-18), completedAt=None, alertId=2, recommendationId=None, note='Bù xe cho Thư viện giờ cao điểm',
                items=[item(1, 'UG-003', 92, 'DELIVERED', 'S-07'), item(2, 'UG-004', 88, 'DELIVERED', 'S-08'), item(3, 'UG-006', 85, 'IN_TRANSIT', 'S-09'), item(4, 'UG-007', 81, 'IN_TRANSIT', 'S-10'), item(5, 'UG-009', 79, 'IN_TRANSIT', 'S-11'), item(6, 'UG-011', 76, 'FAILED', None)], message=None)
TRANSFER2 = dict(TRANSFER, id=22, code='TRF-2611-0005', status='LOADING', sourceHubName='KTX Khu A', targetHubName='Ga Metro Suối Tiên', counts=dict(total=3, locked=2, loaded=1, inTransit=0, delivered=0, failed=0, removed=0),
                 items=[item(7, 'UG-012', 90, 'LOADED', 'S-02'), item(8, 'UG-013', 74, 'LOCKED', 'S-03'), item(9, 'UG-014', 70, 'LOCKED', 'S-05')], recommendationId=4, alertId=None, note=None)
INCIDENTS = [dict(id=1, code='INC-2611-0009', hubId=1, hubName='KTX Khu A', targetType='VEHICLE', targetId=22, targetLabel='Xe UG-022', category='Hư hỏng phanh / kẹt xích', severity='HIGH', source='STUDENT',
                  description='Phanh trước không ăn khi xuống dốc cổng KTX.', photoUrls=['a.jpg'], status='OPEN', followUps=1, reporterName='Nguyễn Minh Anh', createdAt=iso(-35), followUpNotes=['Trần Quốc Bảo: phanh kêu to'], maintenanceOrders=[]),
             dict(id=2, code='INC-2611-0010', hubId=3, hubName='Ga Metro Suối Tiên', targetType='CHARGING_PORT', targetId=4, targetLabel='Cổng C-04', category='Quá nhiệt', severity='CRITICAL', source='SYSTEM',
                  description='Thiết bị báo E-PORT-OVERHEAT', photoUrls=[], status='ASSIGNED', followUps=0, reporterName='Hệ thống', createdAt=iso(-90), followUpNotes=[], maintenanceOrders=['MNT-2611-0003'])]
TICKETS = [dict(id=31, targetType='VEHICLE', targetId=22, targetLabel='Xe UG-022', progress='REPAIRING', diagnosis='Má phanh mòn', repairItems='Thay má phanh', replacedParts=None, verificationNote=None),
           dict(id=32, targetType='CHARGING_PORT', targetId=4, targetLabel='Cổng C-04 · Ga Metro', progress='PENDING', diagnosis=None, repairItems=None, replacedParts=None, verificationNote=None)]
ORDERS = [dict(id=3, code='MNT-2611-0003', technicianName='Phạm Văn Nam', technicianId=6, status='IN_PROGRESS', priority='HIGH', dueAt=iso(240), incidentCode='INC-2611-0010', note='Ưu tiên trước giờ cao điểm chiều', createdAt=iso(-80), tickets=TICKETS)]
def citem(i, code, b, port, pcode, s, e, st, sess=None): return dict(id=i, vehicleId=i, vehicleCode=code, batteryPercent=b, portId=port, portCode=pcode, powerKw=3.3, startAt=iso(s), endAt=iso(e), priority=round(1.2 - b / 100, 2), targetBattery=90, status=st, sessionStatus=sess, sessionStartedAt=iso(s + 2) if sess else None)
SCHED = dict(id=8, code='CHG-2611-0008', hubId=1, hubName='KTX Khu A', status='DRAFT', horizonStart=iso(0), horizonEnd=iso(240), confirmedAt=None, confirmedBy=None,
             items=[citem(1, 'UG-014', 12, 1, 'C-01', 0, 95, 'ACTIVE', 'ACTIVE'), citem(2, 'UG-009', 18, 2, 'C-02', 10, 110, 'SCHEDULED'), citem(3, 'UG-021', 24, 5, 'C-05', 0, 80, 'SCHEDULED'),
                    citem(4, 'UG-030', 31, 1, 'C-01', 100, 170, 'SCHEDULED'), citem(5, 'UG-025', 35, 5, 'C-05', 90, 150, 'NEEDS_RESCHEDULE')],
             unmet=[dict(vehicleId=40, code='UG-040', battery=38, reason='Không còn khung cổng trống')], vehiclesNeedingCharge=6, portsAvailable=3, message=None)
HMET = lambda i, n, sr, sh, peak, risk: dict(hubId=i, name=n, requested=40, served=40 * sr / 100, unmet=40 * (100 - sr) / 100, serviceRatePct=sr, shortageVehicles=sh, peakOccupancyPct=peak, overloadRisk=risk, redirected=3, minAvailable=0 if sh else 3, endAvailable=4, endLowBattery=3 if i == 2 else 1)
SERIES = [dict(minute=m, occupancyPct={'KTX Khu A': 70 + m // 12, 'Thư viện Trung tâm': 40 + m // 6, 'Ga Metro Suối Tiên': min(100, 80 + m // 9), 'Nhà điều hành H6': 30}) for m in range(0, 181, 15)]
RUN = dict(id=5, code='SIM-2611-0005', scenarioId=2, scenarioName='Sự kiện khai giảng – sáng thứ Hai', scenarioType='DEMAND_SURGE', status='COMPLETED', snapshotTakenAt=iso(-25), finishedAt=iso(-25), error=None,
           result=dict(serviceRatePct=78, requested=212, served=165, unmet=47, hubsAtRisk=1, totalShortage=11, hubs=[HMET(1, 'KTX Khu A', 96, 0, 84, False), HMET(2, 'Thư viện Trung tâm', 61, 8, 72, False), HMET(3, 'Ga Metro Suối Tiên', 70, 3, 101, True), HMET(4, 'Nhà điều hành H6', 100, 0, 35, False)],
                       series=SERIES, summary='Nhu cầu +60% tại Thư viện & Metro: đáp ứng 78%, Metro vượt 100% sức chứa sau ~2 giờ.'),
           recommendations=[dict(id=4, type='TRANSFER', payload=dict(fromHubId=1, toHubId=2, count=6), rationale='Chuyển 6 xe từ KTX Khu A → Thư viện Trung tâm: thiếu ~8 xe (đáp ứng 61%)', status='APPLIED', appliedRef='TRF-2611-0005', applyResult='Đã tạo lệnh', appliedAt=iso(-10)),
                            dict(id=6, type='TRANSFER', payload=dict(fromHubId=4, toHubId=3, count=3), rationale='Chuyển 3 xe từ Nhà điều hành H6 → Ga Metro Suối Tiên', status='PROPOSED', appliedRef=None, applyResult=None, appliedAt=None),
                            dict(id=7, type='ADJUST_CHARGING', payload=dict(hubId=2, horizonHours=3), rationale='Ưu tiên sạc tại Thư viện Trung tâm: 3 xe pin thấp làm giảm khả năng phục vụ', status='PROPOSED', appliedRef=None, applyResult=None, appliedAt=None)])
PREVIEW = dict(runId=5, runCode='SIM-2611-0005', snapshotTakenAt=iso(-25), liveAt=iso(), stale=True, staleWarning='Trạng thái tại 2 Hub đã thay đổi đáng kể so với lúc mô phỏng – khuyến nghị có thể không còn tối ưu.',
               diffs=[dict(hubId=4, hubName='Nhà điều hành H6', snapshotAvailable=6, liveAvailable=2, snapshotFreeSlots=8, liveFreeSlots=9, snapshotWorkingPorts=2, liveWorkingPorts=2, significant=True),
                      dict(hubId=3, hubName='Ga Metro Suối Tiên', snapshotAvailable=1, liveAvailable=1, snapshotFreeSlots=1, liveFreeSlots=3, snapshotWorkingPorts=3, liveWorkingPorts=2, significant=False)],
               items=[dict(recommendationId=6, type='TRANSFER', summary='Chuyển 3 xe H6 → Metro', feasible=False, reason='Hub nguồn hiện chỉ còn 2 xe sẵn sàng (cần 3)'),
                      dict(recommendationId=7, type='ADJUST_CHARGING', summary='Lập lịch sạc ưu tiên tại Thư viện (3 giờ)', feasible=True, reason='3 cổng tương thích khả dụng')],
               previewToken='tok', tokenExpiresAt=iso(3))

ROUTES = [
    ('GET', r'/api/v1/auth/me', lambda ctx: ctx['user']),
    ('GET', r'/api/v1/notifications', lambda c: dict(items=[dict(id=1, type='RESERVATION', title='Giữ xe sắp hết hạn', body='Còn 5 phút để nhận UG-018', createdAt=iso(-2), read=False)], unread=1)),
    ('GET', r'/api/v1/hubs', lambda c: dict(items=HUBS, suggestions=[], servedAt=iso(), refreshSeconds=30)),
    ('GET', r'/api/v1/hubs/(\d+)', lambda c: dict(hub=HUBS[int(c['m'][1]) - 1], vehicles=[VEH(i, 40 + i * 5) for i in (18, 3, 7, 12)])),
    ('GET', r'/api/v1/hubs/\d+/slots', lambda c: [dict(id=40 + k, code=f'P-{k:02d}', kind='PERSONAL', status='AVAILABLE', vehicleCode=None, freeInWindow=k != 2) for k in range(1, 7)]),
    ('GET', r'/api/v1/hubs/\d+/ports', lambda c: PORTS),
    ('GET', r'/api/v1/trips/active', lambda c: dict(reservation=RES, trip=None) if c['page'] != 'live' else dict(reservation=None, trip=TRIP)),
    ('GET', r'/api/v1/trips', lambda c: [TRIP, DONE_TRIP]),
    ('GET', r'/api/v1/trips/7', lambda c: TRIP),
    ('GET', r'/api/v1/trips/5', lambda c: DONE_TRIP),
    ('GET', r'/api/v1/reservations', lambda c: [RES, dict(RES, id=10, code='RSV-2511-0040', status='EXPIRED', closeReason='Hết thời gian giữ xe', closedAt=iso(-2000), extensions=[], extensionCount=0)]),
    ('GET', r'/api/v1/reservations/11', lambda c: RES),
    ('GET', r'/api/v1/bookings', lambda c: [BOOK, dict(BOOK, id=2, code='BKG-2511-0009', status='COMPLETED', serviceType='PARK', portId=None, portCode=None, cost=6000, charging=None, qrToken=None)]),
    ('GET', r'/api/v1/bookings/3', lambda c: BOOK),
    ('GET', r'/api/v1/me/vehicles', lambda c: [dict(id=1, plateNumber='59-X1 123.45', type='E_SCOOTER', model='VinFast Klara S', batteryKwh=3.5, connectorType='TYPE_2', hasActiveBooking=True),
                                               dict(id=2, plateNumber='EB-2410717', type='E_BIKE', model='Yadea i8', batteryKwh=0.6, connectorType='STD_220V', hasActiveBooking=False)]),
    ('GET', r'/api/v1/me/profile', lambda c: dict(userId=1, username='anh.nm2410717', fullName='Nguyễn Minh Anh', studentCode='2410717', email='anh.nm2410717@hcmut.edu.vn', phone='0912345678', school='ĐH Bách khoa', address='KTX Khu A, phòng 512', verified=True)),
    ('GET', r'/api/v1/ops/dashboard', lambda c: OVERVIEW),
    ('GET', r'/api/v1/ops/hubs/\d+/detail', lambda c: HUB_DETAIL),
    ('GET', r'/api/v1/ops/hubs/\d+/ports', lambda c: PORTS),
    ('GET', r'/api/v1/ops/hubs', lambda c: HUBS),
    ('GET', r'/api/v1/ops/vehicles', lambda c: [dict(VEH(i, 20 + i * 6, ['AVAILABLE', 'FAULTY', 'CHARGING', 'PENDING_CHECK'][i % 4]), hubId=1, hubName='KTX Khu A', slotCode=f'S-{i:02d}', batteryCapacityKwh=0.5, errorCode=None, rating=4.5, odometerKm=320) for i in range(1, 12)]),
    ('GET', r'/api/v1/ops/transfers/drivers', lambda c: [dict(id=1, userId=4, fullName='Trần Văn Bình', status='BUSY', truckPlate='51C-123.45', capacity=20), dict(id=2, userId=5, fullName='Lê Minh Tuấn', status='AVAILABLE', truckPlate='51C-678.90', capacity=15)]),
    ('GET', r'/api/v1/ops/transfers/candidates', lambda c: [dict(id=i, code=f'UG-{i:03d}', type='E_BIKE', batteryPercent=95 - i * 4, status='AVAILABLE') for i in range(1, 10)]),
    ('GET', r'/api/v1/ops/transfers', lambda c: [TRANSFER2, TRANSFER]),
    ('GET', r'/api/v1/ops/incidents', lambda c: INCIDENTS),
    ('GET', r'/api/v1/ops/maintenance-orders', lambda c: ORDERS),
    ('GET', r'/api/v1/ops/technicians', lambda c: [dict(id=6, fullName='Phạm Văn Nam', openOrders=1), dict(id=7, fullName='Hoàng Đức Trưởng', openOrders=0)]),
    ('GET', r'/api/v1/ops/charging/schedules/8', lambda c: SCHED),
    ('GET', r'/api/v1/ops/charging/schedules', lambda c: [SCHED, dict(SCHED, id=7, code='CHG-2611-0007', status='CONFIRMED', confirmedBy='Lê Thu Trang', confirmedAt=iso(-120))]),
    ('POST', r'/api/v1/ops/charging/items/\d+/validate', lambda c: dict(ok=False, conflicts=['Cổng C-01 đã có đặt chỗ BKG-2611-0015 của sinh viên trong 10:30–11:30'], warnings=[])),
    ('GET', r'/api/v1/ops/simulation/scenarios', lambda c: [dict(id=2, name='Sự kiện khai giảng – sáng thứ Hai', description=None, type='DEMAND_SURGE', params=dict(hubIds=[2, 3], demandIncreasePct=60, startHour=7), horizonMinutes=180, createdAt=iso(-3000), summary='Đột biến tải +60% tại Thư viện Trung tâm, Ga Metro Suối Tiên')]),
    ('POST', r'/api/v1/ops/simulation/scenarios/validate', lambda c: dict(valid=True, errors=[], summary='Đột biến tải +60% tại KTX Khu A · bắt đầu 7h · 180 phút')),
    ('GET', r'/api/v1/ops/simulation/runs/5', lambda c: RUN),
    ('GET', r'/api/v1/ops/simulation/runs', lambda c: [dict(id=5, code='SIM-2611-0005', scenarioName='Sự kiện khai giảng – sáng thứ Hai', status='COMPLETED', snapshotTakenAt=iso(-25), serviceRatePct=78, shortage=11, recommendations=3, applied=1)]),
    ('POST', r'/api/v1/ops/simulation/runs/5/apply/preview', lambda c: PREVIEW),
    ('GET', r'/api/v1/ops/reconciliation', lambda c: dict(commands=[dict(id=91, deviceType='VEHICLE', deviceId=18, command='UNLOCK', status='UNKNOWN', contextType='PICKUP', contextId=11, requestedAt=iso(-4), attempts=2, detail='Mất phản hồi từ khóa xe')],
                                                       pendingTrips=[dict(DONE_TRIP, id=6, code='TRP-2611-0029', status='PENDING_RECONCILIATION', returnMode='OFFLINE_OTP', endHubName='KTX Khu A', reconciliationNote='Chờ cảm biến ô đỗ xác nhận')])),
    ('GET', r'/api/v1/driver/orders', lambda c: [TRANSFER2, TRANSFER]),
    ('GET', r'/api/v1/tech/orders', lambda c: ORDERS),
    ('GET', r'/api/v1/tech/tickets/\d+/precheck', lambda c: dict(sensorFresh=False, lastSeenAt=iso(-3), errorCode='E-BRK-02', batteryPercent=64, batteryOk=True, atHub=True, otherOpenIncidents=0)),
    ('POST', r'/api/v1/sim/.*', lambda c: dict(ok=True)),
]

def handle(method, path, ctx):
    for m, pat, fn in ROUTES:
        mm = re.fullmatch(pat, path)
        if m == method and mm:
            ctx['m'] = mm
            return 200, fn(ctx)
    return 404, dict(code='NOT_FOUND', message=f'mock: {method} {path}', details={}, path=path, timestamp=iso())
