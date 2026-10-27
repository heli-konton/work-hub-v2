'use strict';
// Work Hub MCP extension tools for the self-hosted AFFiNE server.
// Loaded by the patched /app/dist/main.js inside the READ_WRITE MCP branch
// (see patch-server.cjs). Adds what the upstream MCP lacks for the
// Obsidian <-> AFFiNE bridge: doc listing with trash state, trash/restore,
// and the organize-folder tree. Writes go through the server's own
// DocWriter storage + `doc.updates.pushed` event, exactly like upstream
// create/update_document, so connected clients receive them live.
const Y = require('yjs');

const DELETED = '$$DELETED';
const FOLDER_FIELDS = ['parentId', 'type', 'data', 'index'];
const LINK_TYPES = new Set(['folder', 'doc']);

function toBuffer(bin) {
  return Buffer.isBuffer(bin) ? bin : Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength);
}

function loadDoc(snapshot) {
  const doc = new Y.Doc();
  if (snapshot && snapshot.bin && snapshot.bin.byteLength) Y.applyUpdate(doc, toBuffer(snapshot.bin));
  return doc;
}

function listPages(rootDoc) {
  const pages = rootDoc.getMap('meta').get('pages');
  if (!pages) return [];
  return pages.toArray().map(p => ({
    id: p.get('id'),
    title: p.get('title') || '',
    trash: p.get('trash') === true,
    createDate: p.get('createDate') ?? null,
    updatedDate: p.get('updatedDate') ?? null,
  }));
}

function findPage(rootDoc, docId) {
  const pages = rootDoc.getMap('meta').get('pages');
  return pages ? pages.toArray().find(p => p.get('id') === docId) : undefined;
}

/** Mutates; returns true if anything changed. */
function setTrash(rootDoc, docId, trash, now = Date.now()) {
  const page = findPage(rootDoc, docId);
  if (!page) throw new Error(`Doc ${docId} not found in workspace meta`);
  if ((page.get('trash') === true) === trash) return false;
  rootDoc.transact(() => {
    if (trash) {
      page.set('trash', true);
      page.set('trashDate', now);
    } else {
      page.set('trash', false);
      page.delete('trashDate');
    }
  });
  return true;
}

function listFolders(foldersDoc) {
  const out = [];
  for (const key of foldersDoc.share.keys()) {
    const row = foldersDoc.getMap(key);
    if (row.get(DELETED)) continue;
    out.push({
      id: key,
      parentId: row.get('parentId') ?? null,
      type: row.get('type'),
      data: row.get('data'),
      index: row.get('index'),
    });
  }
  return out;
}

/** ops: [{op:'put', id, parentId, type, data, index} | {op:'delete', id}] */
function applyFolderOps(foldersDoc, ops) {
  const live = new Map(listFolders(foldersDoc).map(n => [n.id, n]));
  for (const op of ops) {
    if (op.op === 'put') {
      if (!LINK_TYPES.has(op.type)) throw new Error(`Unsupported node type ${op.type}`);
      if (typeof op.id !== 'string' || !op.id || typeof op.data !== 'string' || typeof op.index !== 'string') {
        throw new Error('put needs string id, data and index');
      }
      if (op.parentId != null) {
        const parent = live.get(op.parentId);
        if (!parent || parent.type !== 'folder') throw new Error(`Parent folder ${op.parentId} not found`);
      } else if (op.type !== 'folder') {
        throw new Error('Only folders can live at the root');
      }
      const existing = live.get(op.id);
      if (existing && existing.type !== op.type) throw new Error(`Node ${op.id} type mismatch`);
      live.set(op.id, { id: op.id, parentId: op.parentId ?? null, type: op.type, data: op.data, index: op.index });
    } else if (op.op === 'delete') {
      if (!live.has(op.id)) throw new Error(`Node ${op.id} not found`);
      for (const n of live.values()) {
        if (n.parentId === op.id) throw new Error(`Folder ${op.id} is not empty`);
      }
      live.delete(op.id);
    } else {
      throw new Error(`Unknown op ${op.op}`);
    }
  }
  // all checks passed: apply as one transaction (one update)
  foldersDoc.transact(() => {
    for (const op of ops) {
      const row = foldersDoc.getMap(op.id);
      if (op.op === 'put') {
        row.set('id', op.id);
        for (const f of FOLDER_FIELDS) {
          const v = f === 'parentId' ? (op.parentId ?? null) : op[f];
          if (row.get(f) !== v) row.set(f, v);
        }
        if (row.has(DELETED)) row.delete(DELETED);
      } else {
        for (const f of FOLDER_FIELDS) row.delete(f);
        row.set(DELETED, true);
      }
    }
  });
}

/** Run fn(doc) against the stored doc and push the resulting delta, if any. */
async function mutate(writer, workspaceId, guid, user, fn) {
  const doc = loadDoc(await writer.storage.getDoc(workspaceId, guid));
  const before = Y.encodeStateVector(doc);
  const result = fn(doc);
  const update = Buffer.from(Y.encodeStateAsUpdate(doc, before));
  if (!writer.storage.isEmptyBin(update) && update.byteLength > 2) {
    const timestamp = await writer.storage.pushDocUpdates(workspaceId, guid, [update], user);
    writer.emitDocUpdatesPushed({ spaceId: workspaceId, docId: guid, updates: [update], timestamp, editor: user });
  }
  return result;
}

function tools({ writer, ac, user, workspace, tool, ok, err, z }) {
  const foldersGuid = `db$${workspace}$folders`;
  const json = v => ok(JSON.stringify(v));
  const guard = fn => async (args, ctx) => {
    try {
      return await fn(args, ctx);
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Unknown error');
    }
  };
  return [
    tool({
      name: 'workhub_list_documents',
      title: 'List Documents',
      description: 'List every doc in the workspace meta with id, title and trash state.',
      parser: z.object({}).strict(),
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: guard(async () => json(listPages(loadDoc(await writer.storage.getDoc(workspace, workspace))))),
    }),
    tool({
      name: 'workhub_set_trash',
      title: 'Trash or Restore Document',
      description: 'Move a doc to the trash (trash=true) or restore it (trash=false). Never deletes permanently.',
      parser: z.object({ docId: z.string().min(1), trash: z.boolean() }).strict(),
      inputSchema: {
        type: 'object',
        properties: { docId: { type: 'string' }, trash: { type: 'boolean' } },
        required: ['docId', 'trash'],
        additionalProperties: false,
      },
      execute: guard(async ({ docId, trash }) => {
        const permission = trash ? 'Doc.Trash' : 'Doc.Restore';
        if (!(await ac.user(user).workspace(workspace).doc(docId).can(permission))) {
          return err(`Doc with id ${docId} not found.`);
        }
        const changed = await mutate(writer, workspace, workspace, user, d => setTrash(d, docId, trash));
        return json({ success: true, docId, trash, changed });
      }),
    }),
    tool({
      name: 'workhub_list_folders',
      title: 'List Folders',
      description: 'List organize-sidebar nodes: folders and doc links.',
      parser: z.object({}).strict(),
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: guard(async () => json(listFolders(loadDoc(await writer.storage.getDoc(workspace, foldersGuid))))),
    }),
    tool({
      name: 'workhub_apply_folder_ops',
      title: 'Apply Folder Operations',
      description: 'Atomically create/update/move folders and doc links, or delete empty nodes, in the organize sidebar.',
      parser: z.object({
        ops: z.array(z.union([
          z.object({
            op: z.literal('put'), id: z.string().min(1), parentId: z.string().nullable(),
            type: z.enum(['folder', 'doc']), data: z.string(), index: z.string().min(1),
          }).strict(),
          z.object({ op: z.literal('delete'), id: z.string().min(1) }).strict(),
        ])).min(1).max(500),
      }).strict(),
      inputSchema: {
        type: 'object',
        properties: { ops: { type: 'array', items: { type: 'object' } } },
        required: ['ops'],
        additionalProperties: false,
      },
      execute: guard(async ({ ops }) => {
        await ac.user(user).workspace(workspace).assert('Workspace.CreateDoc');
        await mutate(writer, workspace, foldersGuid, user, d => applyFolderOps(d, ops));
        return json({ success: true, applied: ops.length });
      }),
    }),
  ];
}

module.exports = { tools, listPages, setTrash, listFolders, applyFolderOps, mutate, loadDoc };
