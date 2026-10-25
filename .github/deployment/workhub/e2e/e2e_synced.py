"""Stage 4: server-synced workspace — embed survives a fresh browser (blob via server)."""
import sys

sys.path.insert(0, '/work')
from playwright.sync_api import sync_playwright  # noqa: E402

from e2e_common import BASE, OUT, check, drop_html, sign_in  # noqa: E402

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 1400, 'height': 1000})
    page = ctx.new_page()
    page.on('pageerror', lambda e: print('pageerror:', str(e)[:300]))
    sign_in(page)
    page.goto(BASE + '/', wait_until='networkidle')
    page.wait_for_selector('affine-paragraph', timeout=30000)
    page.get_by_role('button', name='Enable AFFiNE Sync').click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{OUT}/08-enable-sync-dialog.png')
    # Confirm button in the dialog (label varies by version).
    for label in ['Enable AFFiNE Cloud', 'Enable', 'Confirm', 'Continue']:
        btn = page.get_by_role('button', name=label, exact=True)
        if btn.count():
            btn.last.click()
            print('clicked', label)
            break
    page.wait_for_timeout(8000)
    page.screenshot(path=f'{OUT}/09-after-sync.png')
    print('url', page.url)
    page.wait_for_selector('affine-paragraph', timeout=30000)
    para = page.locator('affine-paragraph').nth(1)
    box = para.bounding_box()
    drop_html(page, box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.locator('affine-attachment affine-attachment-html-embed').first.wait_for(timeout=20000)
    page.wait_for_timeout(6000)  # let doc + blob upload to the server
    url = page.url

    ctx2 = browser.new_context(viewport={'width': 1400, 'height': 1000})
    page2 = ctx2.new_page()
    sign_in(page2)
    page2.goto(url, wait_until='load')
    try:
        page2.locator('affine-attachment affine-attachment-html-embed iframe').first.wait_for(timeout=40000)
        frame = page2.frame_locator('affine-attachment-html-embed iframe').first
        js = frame.locator('#js').inner_text(timeout=20000)
        check('synced: fresh browser loads the embed from the server', js == 'JS OK', js)
    except Exception as e:  # noqa: BLE001
        check('synced: fresh browser loads the embed from the server', False, str(e)[:200])
    page2.screenshot(path=f'{OUT}/10-fresh-browser.png')
    browser.close()
