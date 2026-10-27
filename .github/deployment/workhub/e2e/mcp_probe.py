"""Probe the patched AFFiNE MCP on the disposable stack: markdown round-trip shape."""
import json
import urllib.request

B = 'http://127.0.0.1:3020'
TOKEN = open('/opt/affine-mcptest/.token').read().strip()
WS = open('/opt/affine-mcptest/.wsid').read().strip()
n = 0


def call(name, **args):
    global n
    n += 1
    req = urllib.request.Request(
        f'{B}/api/workspaces/{WS}/mcp',
        data=json.dumps({'jsonrpc': '2.0', 'id': n, 'method': 'tools/call',
                         'params': {'name': name, 'arguments': args}}).encode(),
        headers={'authorization': f'Bearer {TOKEN}', 'content-type': 'application/json',
                 'accept': 'application/json, text/event-stream'})
    r = json.load(urllib.request.urlopen(req))
    if 'error' in r:
        raise RuntimeError(r['error'])
    res = r['result']
    text = res['content'][0]['text']
    if res.get('isError'):
        raise RuntimeError(text)
    return text


BODY = """Intro paragraph with **bold**, _italic_, `code` and a [link](https://example.com).

## Section

* star bullet
- dash bullet
  - nested

1. one
2. two

- [ ] open task
- [x] done task

> quote

| a | b |
|---|---|
| 1 | 2 |

```python
print("hi")
```

[[Some Wikilink]] and #tag
"""

doc = json.loads(call('create_document', title='Probe', content=BODY))['docId']
print('created', doc)
md1 = call('read_document', docId=doc)
print('---- read 1 ----')
print(md1)
print('---- end ----')
call('update_document', docId=doc, content=md1)
md2 = call('read_document', docId=doc)
print('stable after re-push of own render:', md1 == md2)
call('update_document', docId=doc, content=md1.replace('open task', 'open task edited'))
md3 = call('read_document', docId=doc)
print('edit applied:', 'open task edited' in md3, '| only that line changed:',
      sum(a != b for a, b in zip(md1.splitlines(), md3.splitlines())))
print('list:', call('workhub_list_documents'))
print('trash:', call('workhub_set_trash', docId=doc, trash=True))
print('listed trash:', [d['trash'] for d in json.loads(call('workhub_list_documents')) if d['id'] == doc])
print('read trashed doc ok:', len(call('read_document', docId=doc)) > 0)
print('restore:', call('workhub_set_trash', docId=doc, trash=False))
print('folders:', call('workhub_apply_folder_ops', ops=[
    {'op': 'put', 'id': 'probe-f1', 'parentId': None, 'type': 'folder', 'data': 'Work', 'index': 'a0'},
    {'op': 'put', 'id': 'probe-f2', 'parentId': 'probe-f1', 'type': 'folder', 'data': '05_prism', 'index': 'a0'},
    {'op': 'put', 'id': 'probe-l1', 'parentId': 'probe-f2', 'type': 'doc', 'data': doc, 'index': 'a0'},
]))
print('folder list:', call('workhub_list_folders'))
call('update_document_meta', docId=doc, title='Probe renamed')
print('renamed:', [d['title'] for d in json.loads(call('workhub_list_documents')) if d['id'] == doc])
try:
    call('workhub_apply_folder_ops', ops=[{'op': 'put', 'id': 'x', 'parentId': 'nope', 'type': 'doc', 'data': doc, 'index': 'a0'}])
    print('BAD: invalid op accepted')
except RuntimeError as e:
    print('invalid op rejected:', e)
