#!/bin/sh
# Seed the disposable AFFiNE test stack: admin, server workspace, RW MCP key.
# Outputs (0600): .cookies, .wsid, .token. Never prints secrets.
set -eu
cd /opt/affine-mcptest
B=http://127.0.0.1:3020
EMAIL=mcptest@example.com
PW=$(cat .testpw)
umask 077
curl -fsS -o /dev/null -X POST -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" $B/api/setup/create-admin-user || echo "admin exists"
curl -fsS -o /dev/null -c .cookies -X POST -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" $B/api/auth/sign-in
# Root doc with empty page list, built with the image's own yjs.
[ -s .wsid ] || {
docker run --rm --entrypoint node "$(grep TEST_IMAGE .env | cut -d= -f2)" -e '
const Y=require("/app/node_modules/yjs");const d=new Y.Doc();const m=d.getMap("meta");
m.set("pages",new Y.Array());m.set("properties",new Y.Map());
process.stdout.write(Buffer.from(Y.encodeStateAsUpdate(d)));' > root.bin
curl -fsS -b .cookies -H 'x-operation-name: createWorkspace' \
  -F 'operations={"query":"mutation($init: Upload){createWorkspace(init:$init){id}}","variables":{"init":null}}' \
  -F 'map={"0":["variables.init"]}' -F '0=@root.bin;type=application/octet-stream' \
  $B/graphql > ws.json
python3 -c 'import json;print(json.load(open("ws.json"))["data"]["createWorkspace"]["id"])' > .wsid
}
curl -fsS -b .cookies -H 'content-type: application/json' \
  -d "{\"query\":\"mutation(\$i: CreateMcpCredentialInput!){createMcpCredential(input:\$i){token}}\",\"variables\":{\"i\":{\"workspaceId\":\"$(cat .wsid)\",\"name\":\"bridge-test\",\"accessMode\":\"READ_WRITE\"}}}" \
  $B/graphql > cred.json
python3 - <<'EOF'
import json
r = json.load(open('cred.json'))
if r.get('errors'):
    raise SystemExit('credential errors: %s' % [e.get('message') for e in r['errors']])
open('.token', 'w').write(r['data']['createMcpCredential']['token'])
print('token saved to .token (%d chars)' % len(open('.token').read()))
EOF
echo "workspace: $(cat .wsid)"
rm -f cred.json
