"""Stage 3: edgeless (canvas) — drop, size, select-to-interact, free resize."""
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
    page.locator('[data-testid="switch-edgeless-mode-button"]').click()
    page.wait_for_selector('affine-edgeless-root', timeout=30000)
    page.wait_for_timeout(2500)
    # zoom to 100% so model px == screen px
    page.keyboard.press('Escape')
    page.screenshot(path=f'{OUT}/04-edgeless-before.png')

    # Drop near the bottom-right, an empty area of the canvas.
    where = drop_html(page, 1000, 800)
    print('dropped on', where)
    emb = page.locator('affine-edgeless-attachment affine-attachment-html-embed')
    emb.first.wait_for(timeout=20000)
    page.wait_for_timeout(1500)
    check('canvas: html file renders as embed', emb.count() == 1)

    block = page.locator('affine-edgeless-attachment').first
    xywh = block.evaluate('el => el.model.xywh')
    print('xywh', xywh)
    w, h = [float(v) for v in xywh.strip('[]').split(',')][2:]
    check('canvas: default frame is 800x600', (w, h) == (800, 600), f'{w}x{h}')

    # Freshly dropped blocks are selected. Deselect, then confirm the overlay
    # shields the iframe so the canvas still gets clicks.
    page.keyboard.press('Escape')
    page.mouse.click(200, 950)
    page.wait_for_timeout(500)
    mask = page.locator('affine-edgeless-attachment .affine-attachment-embed-event-mask')
    check('canvas: unselected embed is shielded (click selects, not types)', mask.count() == 1)
    page.screenshot(path=f'{OUT}/05-edgeless-embed.png')

    # Click to select -> overlay removed -> iframe interactive.
    fb = page.locator('affine-edgeless-attachment .affine-attachment-html-frame').first.bounding_box()
    page.mouse.click(fb['x'] + fb['width'] / 2, fb['y'] + 60)
    page.wait_for_timeout(600)
    check('canvas: selecting the embed removes the shield', mask.count() == 0, f'masks={mask.count()}')
    frame = page.frame_locator('affine-edgeless-attachment affine-attachment-html-embed iframe').first
    check('canvas: scripts run', frame.locator('#js').inner_text() == 'JS OK')
    frame.locator('#btn').click()
    c = frame.locator('#count').inner_text()
    check('canvas: embed is interactive once selected', c == '1', c)
    page.screenshot(path=f'{OUT}/06-edgeless-selected.png')

    # Resize from the right-edge handle only: width should change, height not.
    handles = page.evaluate("""() => [...document.querySelectorAll('[class*="handle"]')]
        .filter(e => e.getBoundingClientRect().width > 0)
        .map(e => ({cls: e.className.toString().slice(0,80), aria: e.getAttribute('aria-label'),
                    r: e.getBoundingClientRect().toJSON()}))
        .slice(0, 30)""")
    for hnd in handles:
        print('handle', hnd['cls'], hnd['aria'], [round(v) for v in (hnd['r']['x'], hnd['r']['y'], hnd['r']['width'], hnd['r']['height'])])
    right = page.locator('.handle[aria-label="right"]').first
    if right.count():
        rb = right.bounding_box()
        zoom = block.evaluate('el => el.gfx.viewport.zoom')
        print('zoom', zoom)
        page.mouse.move(rb['x'] + rb['width'] / 2, rb['y'] + rb['height'] / 2)
        page.mouse.down()
        for i in range(1, 11):
            page.mouse.move(rb['x'] + rb['width'] / 2 + 15 * i, rb['y'] + rb['height'] / 2)
        page.mouse.up()
        page.wait_for_timeout(800)
        xywh2 = block.evaluate('el => el.model.xywh')
        w2, h2 = [float(v) for v in xywh2.strip('[]').split(',')][2:]
        check('canvas: right-edge drag widens the frame', w2 > w + 50, f'{w}->{w2}')
        check('canvas: aspect ratio is free (height unchanged)', abs(h2 - h) < 1, f'{h}->{h2}')
        inner = page.locator('affine-edgeless-attachment .affine-attachment-container').first
        iw = inner.evaluate('el => el.style.width')
        tf = inner.evaluate('el => el.style.transform')
        check('canvas: content re-lays out at new width (no scaling)', abs(float(iw[:-2]) - w2) < 1 and tf in ('', 'none'), f'{iw} transform={tf!r}')
        page.screenshot(path=f'{OUT}/07-edgeless-resized.png')
    else:
        check('canvas: found right resize handle', False)
    browser.close()
