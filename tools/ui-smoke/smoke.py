"""Chụp màn hình toàn bộ giao diện với API giả lập (fixture) – cần: npm run build, pip install playwright."""
import re, json, sys, subprocess, time, pathlib, urllib.parse
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import mock_api

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'screenshots'; OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:4173'
PAGES = [
    ('STUDENT', '/login', 'login', None), ('STUDENT', '/', 'home', None), ('STUDENT', '/reservations/11', 'reservation', None),
    ('STUDENT', '/trips/7/live', 'live', 'live'), ('STUDENT', '/trips', 'trips', None), ('STUDENT', '/trips/5/rate', 'rate', None),
    ('STUDENT', '/bookings', 'bookings', None), ('STUDENT', '/bookings/new', 'booking_new', None), ('STUDENT', '/bookings/3', 'booking_detail', None),
    ('STUDENT', '/vehicles', 'vehicles', None), ('STUDENT', '/account', 'account', None), ('STUDENT', '/report?vehicle=UG-018&hub=1', 'report', None),
    ('OPERATOR', '/internal/login', 'internal_login', None), ('OPERATOR', '/ops', 'ops_dashboard', None), ('OPERATOR', '/ops/hubs/1', 'ops_hub_detail', None),
    ('OPERATOR', '/ops/hubs', 'ops_hubs', None), ('OPERATOR', '/ops/hubs/1/ports', 'ops_ports', None), ('OPERATOR', '/ops/vehicles', 'ops_vehicles', None),
    ('OPERATOR', '/ops/transfers', 'ops_transfers', None), ('OPERATOR', '/ops/transfers?target=2&alert=2', 'ops_transfer_create', None),
    ('OPERATOR', '/ops/incidents', 'ops_incidents', None), ('OPERATOR', '/ops/charging', 'ops_charging', None), ('OPERATOR', '/ops/simulation', 'ops_simulation', None),
    ('OPERATOR', '/ops/simulation/runs/5', 'ops_sim_result', None), ('OPERATOR', '/ops/reconciliation', 'ops_reconciliation', None),
    ('DRIVER', '/driver', 'driver', None), ('TECHNICIAN', '/tech', 'tech', None),
]
missing, errors = set(), []
srv = subprocess.Popen(['npx', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], cwd=str(ROOT / 'frontend'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3)
try:
    with sync_playwright() as p:
        import os, shutil
        exe = os.environ.get('CHROME') or shutil.which('google-chrome')
        b = p.chromium.launch(executable_path=exe, args=['--no-sandbox']) if exe else p.chromium.launch()
        for role, url, name, page_kind in PAGES:
            ctx = b.new_context(viewport={'width': 1440, 'height': 900} if role != 'DRIVER' else {'width': 430, 'height': 900}, locale='vi-VN', timezone_id='Asia/Ho_Chi_Minh')
            state = {'user': mock_api.USERS[role], 'page': page_kind}
            if 'login' not in name:
                ctx.add_init_script(f"localStorage.setItem('unigo.token','t'); localStorage.setItem('unigo.user', {json.dumps(json.dumps(mock_api.USERS[role]))});")
            def make(state):
                def route(r):
                    handle_route(r, state)
                return route
            def handle_route(r, state):
                u = urllib.parse.urlparse(r.request.url)
                st, body = mock_api.handle(r.request.method, u.path, state)
                if st == 404: missing.add(f'{r.request.method} {u.path}')
                r.fulfill(status=st, content_type='application/json', body=json.dumps(body))
            ctx.route('**/api/**', make(state))
            ctx.route(re.compile(r'.*tile\.openstreetmap\.org.*'), lambda r: r.fulfill(status=200, content_type='image/png', body=b''))
            pg = ctx.new_page()
            pg.on('pageerror', lambda e, n=name: errors.append(f'{n}: PAGEERROR {e}'))
            pg.on('console', lambda m, n=name: errors.append(f'{n}: console.{m.type} {m.text}') if m.type == 'error' and 'WebSocket' not in m.text and '/ws' not in m.text else None)
            pg.goto(BASE + url)
            pg.wait_for_timeout(1500)
            if name == 'ops_charging':
                pg.get_by_text('CHG-2611-0008').first.click(); pg.wait_for_timeout(600)
                pg.locator('.gantt-bar').nth(1).click(); pg.wait_for_timeout(300)
                pg.get_by_role('button', name='Kiểm tra').click(); pg.wait_for_timeout(500)
            if name == 'ops_sim_result':
                pg.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
                pg.get_by_role('button', name='Xem trước khi áp dụng (2)').click(); pg.wait_for_timeout(700); name = 'ops_sim_preview'
            if name == 'ops_transfers':
                pg.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
                pg.get_by_text('TRF-2611-0004').first.click(); pg.wait_for_timeout(500); name = 'ops_transfer_detail'
            if name == 'tech':
                pg.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
                pg.get_by_text('Xe UG-022').first.click(); pg.wait_for_timeout(800); name = 'tech_ticket'
            pg.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
            ctx.close()
        b.close()
finally:
    srv.terminate()
print('MISSING FIXTURES:', sorted(missing))
print('ERRORS:', *errors, sep='\n  ')
