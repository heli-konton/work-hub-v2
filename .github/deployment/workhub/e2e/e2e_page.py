"""Stage 2: page (doc) mode — drop, render, interact, sandbox, resize + persist."""
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
    page.wait_for_timeout(1500)
    doc_url = page.url
    print('doc', doc_url)

    para = page.locator('affine-paragraph').nth(1)
    box = para.bounding_box()
    where = drop_html(page, box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    print('dropped on', where)

    embed = page.locator('affine-attachment affine-attachment-html-embed')
    embed.first.wait_for(timeout=20000)
    page.wait_for_timeout(1500)
    check('page: html file renders as embed (not a card)', embed.count() == 1)
    card = page.locator('affine-attachment .affine-attachment-card')
    check('page: no download card for the html file', card.count() == 0, f'cards={card.count()}')
    embed.first.scroll_into_view_if_needed()
    page.wait_for_timeout(500)
    page.screenshot(path=f'{OUT}/02-page-embed.png')

    frame = page.frame_locator('affine-attachment-html-embed iframe').first
    js = frame.locator('#js').inner_text()
    check('page: scripts run inside the embed', js == 'JS OK', js)
    sandbox = frame.locator('#sandbox').inner_text()
    check('page: embed cannot read the AFFiNE page or its storage',
          'parent blocked' in sandbox and 'storage blocked' in sandbox, sandbox)
    frame.locator('#btn').click()
    frame.locator('#btn').click()
    count = frame.locator('#count').inner_text()
    check('page: embed is interactive without extra clicks', count == '2', count)

    wrap = page.locator('.affine-attachment-html-embed').first
    h0 = wrap.bounding_box()['height']
    handle = page.locator('.affine-attachment-html-resize-handle').first
    hb = handle.bounding_box()
    page.mouse.move(hb['x'] + hb['width'] / 2, hb['y'] + hb['height'] / 2)
    page.mouse.down()
    for i in range(1, 11):
        page.mouse.move(hb['x'] + hb['width'] / 2, hb['y'] + hb['height'] / 2 + 20 * i)
    page.mouse.up()
    page.wait_for_timeout(800)
    h1 = wrap.bounding_box()['height']
    check('page: drag bottom edge resizes height', abs((h1 - h0) - 200) <= 4, f'{h0} -> {h1}')
    page.screenshot(path=f'{OUT}/03-page-resized.png')

    page.wait_for_timeout(1500)  # let the doc persist
    page.reload(wait_until='load')
    page.locator('.affine-attachment-html-embed').first.wait_for(timeout=30000)
    page.wait_for_timeout(1500)
    h2 = page.locator('.affine-attachment-html-embed').first.bounding_box()['height']
    check('page: resized height survives reload', abs(h2 - h1) <= 2, f'{h1} -> {h2}')

    # Header controls: reload restarts the embedded page.
    frame = page.frame_locator('affine-attachment-html-embed iframe').first
    frame.locator('#btn').click()
    page.locator('.affine-attachment-html-header-button[aria-label="Reload"]').first.click()
    page.wait_for_timeout(1000)
    frame = page.frame_locator('affine-attachment-html-embed iframe').first
    c = frame.locator('#count').inner_text()
    check('page: reload button restarts the html page', c == '0', c)

    # A file whose MIME type is missing (common for Finder drops) still embeds.
    para = page.locator('affine-paragraph').nth(3)
    box = para.bounding_box()
    drop_html(page, box['x'] + box['width'] / 2, box['y'] + box['height'] / 2,
              name='no-mime.htm', mime='')
    page.wait_for_timeout(3000)
    n = page.locator('affine-attachment affine-attachment-html-embed').count()
    check('page: .htm with empty MIME also embeds', n == 2, f'embeds={n}')

    open(f'{OUT}/doc_url.txt', 'w').write(doc_url)
    browser.close()
