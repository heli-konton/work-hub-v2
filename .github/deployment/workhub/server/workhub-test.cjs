'use strict';
// Unit tests for the Work Hub MCP extension. Run inside the built image (real yjs):
//   docker run --rm --entrypoint node <image> --test /app/dist/workhub-test.cjs
const test = require('node:test');
const assert = require('node:assert');
const Y = require('yjs');
const ext = require('./workhub-mcp.cjs');
const { patch, PATCHES } = require('./patch-server.cjs');

function rootWith(pages) {
  const doc = new Y.Doc();
  const arr = new Y.Array();
  doc.getMap('meta').set('pages', arr);
  arr.push(pages.map(p => {
    const m = new Y.Map();
    for (const [k, v] of Object.entries(p)) m.set(k, v);
    return m;
  }));
  return doc;
}

const roundtrip = doc => ext.loadDoc({ bin: Buffer.from(Y.encodeStateAsUpdate(doc)) });

test('lists pages with trash state from a stored root doc', () => {
  const doc = roundtrip(rootWith([{ id: 'a', title: 'A', createDate: 1 }, { id: 'b', title: 'B', trash: true }]));
  assert.deepStrictEqual(ext.listPages(doc).map(p => [p.id, p.title, p.trash]), [['a', 'A', false], ['b', 'B', true]]);
});

test('trash and restore toggle the same fields the AFFiNE client uses', () => {
  const doc = roundtrip(rootWith([{ id: 'a', title: 'A' }]));
  assert.strictEqual(ext.setTrash(doc, 'a', true, 42), true);
  const page = doc.getMap('meta').get('pages').get(0);
  assert.strictEqual(page.get('trash'), true);
  assert.strictEqual(page.get('trashDate'), 42);
  assert.strictEqual(ext.setTrash(doc, 'a', true), false);
  ext.setTrash(doc, 'a', false);
  assert.strictEqual(page.get('trash'), false);
  assert.strictEqual(page.has('trashDate'), false);
  assert.throws(() => ext.setTrash(doc, 'missing', true));
});

test('folder ops build a tree in the YjsTableAdapter row format', () => {
  const doc = new Y.Doc();
  ext.applyFolderOps(doc, [
    { op: 'put', id: 'f1', parentId: null, type: 'folder', data: 'Work', index: 'a0' },
    { op: 'put', id: 'f2', parentId: 'f1', type: 'folder', data: '05_prism', index: 'a0' },
    { op: 'put', id: 'l1', parentId: 'f2', type: 'doc', data: 'doc123', index: 'a0' },
  ]);
  const stored = roundtrip(doc);
  const nodes = Object.fromEntries(ext.listFolders(stored).map(n => [n.id, n]));
  assert.deepStrictEqual(nodes.l1, { id: 'l1', parentId: 'f2', type: 'doc', data: 'doc123', index: 'a0' });
  assert.strictEqual(nodes.f1.parentId, null);
  assert.strictEqual(stored.getMap('f1').get('id'), 'f1');
});

test('folder ops are all-or-nothing', () => {
  const doc = new Y.Doc();
  ext.applyFolderOps(doc, [{ op: 'put', id: 'f1', parentId: null, type: 'folder', data: 'W', index: 'a0' }]);
  const before = Buffer.from(Y.encodeStateAsUpdate(doc));
  assert.throws(() => ext.applyFolderOps(doc, [
    { op: 'put', id: 'x', parentId: 'f1', type: 'folder', data: 'ok', index: 'a0' },
    { op: 'put', id: 'y', parentId: 'nope', type: 'doc', data: 'd', index: 'a0' },
  ]), /Parent folder nope/);
  assert.deepStrictEqual(Buffer.from(Y.encodeStateAsUpdate(doc)), before);
});

test('rejects root-level doc links, non-empty folder deletes and type changes', () => {
  const doc = new Y.Doc();
  assert.throws(() => ext.applyFolderOps(doc, [{ op: 'put', id: 'l', parentId: null, type: 'doc', data: 'd', index: 'a0' }]));
  ext.applyFolderOps(doc, [
    { op: 'put', id: 'f', parentId: null, type: 'folder', data: 'W', index: 'a0' },
    { op: 'put', id: 'l', parentId: 'f', type: 'doc', data: 'd', index: 'a0' },
  ]);
  assert.throws(() => ext.applyFolderOps(doc, [{ op: 'delete', id: 'f' }]), /not empty/);
  assert.throws(() => ext.applyFolderOps(doc, [{ op: 'put', id: 'l', parentId: 'f', type: 'folder', data: 'x', index: 'a0' }]));
  ext.applyFolderOps(doc, [{ op: 'delete', id: 'l' }, { op: 'delete', id: 'f' }]);
  assert.deepStrictEqual(ext.listFolders(roundtrip(doc)), []);
  assert.strictEqual(doc.getMap('f').get('$$DELETED'), true);
});

test('mutate pushes only the delta and emits the live-update event', async () => {
  const stored = rootWith([{ id: 'a', title: 'A' }]);
  const pushed = [];
  const emitted = [];
  const writer = {
    storage: {
      getDoc: async () => ({ bin: Buffer.from(Y.encodeStateAsUpdate(stored)) }),
      pushDocUpdates: async (ws, guid, updates) => { pushed.push([ws, guid, updates]); return 7; },
      isEmptyBin: b => b.byteLength === 0,
    },
    emitDocUpdatesPushed: e => emitted.push(e),
  };
  await ext.mutate(writer, 'ws', 'ws', 'u1', d => ext.setTrash(d, 'a', true));
  assert.strictEqual(pushed.length, 1);
  Y.applyUpdate(stored, pushed[0][2][0]);
  assert.strictEqual(ext.listPages(stored)[0].trash, true);
  assert.deepStrictEqual([emitted[0].docId, emitted[0].timestamp, emitted[0].editor], ['ws', 7, 'u1']);
  await ext.mutate(writer, 'ws', 'ws', 'u1', d => ext.setTrash(d, 'a', true));
  assert.strictEqual(pushed.length, 1, 'no-op must not push');
});

test('server patch rewrites each anchor exactly once and refuses drift', () => {
  const source = PATCHES.map(([from]) => from).join('\n');
  const out = patch(source);
  assert.strictEqual((out.match(/AFFINE_MCP_WRITE/g) || []).length, 5);
  assert.doesNotMatch(out, /a7\(\[rD\(\),/);
  assert.match(out, /import\("\.\/workhub-mcp\.cjs"\)/);
  assert.throws(() => patch(source.replace(PATCHES[0][0], '')), /matched 0 times/);
  assert.throws(() => patch(source + '\n' + PATCHES[1][0]), /matched 2 times/);
});

test('list_documents tool adds per-doc storage timestamps', async () => {
  const stored = rootWith([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
  const writer = { storage: {
    getDoc: async () => ({ bin: Buffer.from(Y.encodeStateAsUpdate(stored)) }),
    getSpaceDocTimestamps: async () => ({ a: 111 }),
  } };
  const z = require('zod');
  const [list] = ext.tools({ writer, ac: {}, user: 'u', workspace: 'w', tool: t => t, ok: x => x, err: x => x, z });
  const out = JSON.parse(await list.execute({}, {}));
  assert.deepStrictEqual(out.map(d => [d.id, d.updatedAt]), [['a', 111], ['b', null]]);
});

test('tools() registers four tools through the provided factory', () => {
  const names = ext.tools({ writer: {}, ac: {}, user: 'u', workspace: 'w', tool: t => t, ok: x => x, err: x => x,
    z: { object: () => ({ strict: () => ({}) }), string: () => ({ min: () => ({}), nullable: () => ({}) }),
      boolean: () => ({}), array: () => ({ min: () => ({ max: () => ({}) }) }), union: () => ({}),
      literal: () => ({}), enum: () => ({}) } }).map(t => t.name);
  assert.deepStrictEqual(names, ['workhub_list_documents', 'workhub_set_trash', 'workhub_list_folders', 'workhub_apply_folder_ops']);
});
