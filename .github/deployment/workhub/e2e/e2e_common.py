"""Shared helpers for the html-embed e2e stages."""
import os

BASE = 'http://127.0.0.1:3020'
OUT = '/work/out'
EMAIL = 'htmltest@example.com'
PASSWORD = os.environ['TEST_PASSWORD']
HTML = open('/work/embed-test.html', encoding='utf-8').read()

DROP_JS = """
([selector, x, y, html, name, type]) => {
  const target = document.elementFromPoint(x, y) || document.querySelector(selector);
  const dt = new DataTransfer();
  dt.items.add(new File([html], name, { type }));
  const opts = { dataTransfer: dt, bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y };
  target.dispatchEvent(new DragEvent('dragenter', opts));
  target.dispatchEvent(new DragEvent('dragover', opts));
  target.dispatchEvent(new DragEvent('drop', opts));
  return target.tagName + '.' + target.className;
}
"""


def sign_in(page):
    r = page.request.post(f'{BASE}/api/auth/sign-in',
                          data={'email': EMAIL, 'password': PASSWORD})
    assert r.ok, r.text()


def drop_html(page, x, y, name='embed-test.html', mime='text/html'):
    return page.evaluate(DROP_JS, ['affine-page-root', x, y, HTML, name, mime])


def check(label, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + label + (f'  [{detail}]' if detail else ''))
    return ok
