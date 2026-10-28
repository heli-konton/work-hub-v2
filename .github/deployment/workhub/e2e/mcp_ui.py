"""Visual check: the bridge-built folder tree renders in the AFFiNE sidebar."""
import os

from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:3020'
WS = open('/work/.wsid').read().strip()
PW = os.environ['TEST_PASSWORD']

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': 1400, 'height': 900})
    r = page.request.post(f'{BASE}/api/auth/sign-in', data={'email': 'mcptest@example.com', 'password': PW})
    assert r.ok, r.status
    page.goto(f'{BASE}/workspace/{WS}/all', wait_until='load')
    page.wait_for_timeout(8000)
    nav = page.locator('nav, [data-testid="app-sidebar"]').first
    text = nav.inner_text() if nav.count() else page.inner_text('body')
    for name in ('Personal', 'Work'):
        print(('PASS ' if name in text else 'FAIL ') + f'sidebar shows folder {name}')
    page.screenshot(path='/work/out/sidebar.png')
    # expand Work to show subfolders
    try:
        page.get_by_text('Work', exact=True).first.click()
        page.wait_for_timeout(2000)
        sub = page.inner_text('body')
        print(('PASS ' if '05_prism' in sub or '02_aperture' in sub else 'FAIL ') + 'Work expands to its subfolders')
        page.screenshot(path='/work/out/sidebar-work.png')
    except Exception as exc:  # noqa: BLE001
        print('FAIL expand Work:', type(exc).__name__)
    b.close()
