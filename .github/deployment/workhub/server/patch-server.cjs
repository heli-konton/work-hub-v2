'use strict';
// Patch the upstream AFFiNE 0.27.4 server bundle at image build time:
//  1. allow READ_WRITE MCP credentials + write tools when AFFINE_MCP_WRITE=1
//     (upstream only enables them in dev/canary namespaces);
//  2. register the Work Hub extension tools from ./workhub-mcp.cjs.
// Every anchor must match exactly once, so an upstream bump fails the build
// loudly instead of silently shipping an unpatched server.
const fs = require('fs');

const FLAG = 'process.env.AFFINE_MCP_WRITE==="1"';
const PATCHES = [
  ['if(r===D.McpAccessMode.READ_WRITE&&(env.dev||env.namespaces.canary)){',
    `if(r===D.McpAccessMode.READ_WRITE&&(env.dev||env.namespaces.canary||${FLAG})){`],
  ['mcpCredentialReadWriteAvailable(){return env.dev||env.namespaces.canary}',
    `mcpCredentialReadWriteAvailable(){return env.dev||env.namespaces.canary||${FLAG}}`],
  ['if(t.accessMode===D.McpAccessMode.READ_WRITE&&!env.dev&&!env.namespaces.canary)',
    `if(t.accessMode===D.McpAccessMode.READ_WRITE&&!env.dev&&!env.namespaces.canary&&!(${FLAG}))`],
  // MCP lives in the Copilot module; with the flag on it must work without
  // enabling AI features (copilot.enabled stays false on the lab instance).
  ['a7([rD(),(0,N.Controller)("/api/workspaces/:workspaceId/mcp")',
    `a7([...(${FLAG}?[]:[rD()]),(0,N.Controller)("/api/workspaces/:workspaceId/mcp")`],
  ['McpCredentialResolver=ot([rD(),(0,em.Resolver)()',
    `McpCredentialResolver=ot([...(${FLAG}?[]:[rD()]),(0,em.Resolver)()`],
  ['i.push(r,a,o)}return{name:`AFFiNE MCP Server',
    'i.push(r,a,o),i.push(...(await import("./workhub-mcp.cjs")).default.tools({writer:this.writer,ac:this.ac,' +
    'user:e,workspace:t,tool:a6,ok:a3,err:a2,z:eT.default}))}return{name:`AFFiNE MCP Server'],
];

function patch(source) {
  let out = source;
  for (const [from, to] of PATCHES) {
    const count = out.split(from).length - 1;
    if (count !== 1) throw new Error(`anchor matched ${count} times: ${from.slice(0, 70)}`);
    out = out.replace(from, () => to);
  }
  return out;
}

if (require.main === module) {
  const file = process.argv[2];
  fs.writeFileSync(file, patch(fs.readFileSync(file, 'utf8')));
  console.log(`patched ${PATCHES.length} anchors in ${file}`);
}

module.exports = { patch, PATCHES };
