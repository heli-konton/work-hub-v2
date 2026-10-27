# HTML-embed e2e (Playwright, disposable AFFiNE stack)

Runs against a throwaway AFFiNE stack on 127.0.0.1:3020 built from the CI `web`
artifact (see `../Dockerfile`). Nothing touches a real instance.

```sh
# on the docker host, with this folder copied to /opt/affine-htmltest
printf 'DB_PASSWORD=%s\nTEST_IMAGE=workhub/affine:0.27.4-htmlembed-<sha>\n' "$(openssl rand -hex 16)" > .env
docker compose up -d
# first run only: create the test admin (stage scripts sign in with it)
sh run.sh e2e_page.py      # page mode: render, JS, sandbox, interact, resize+persist, empty MIME
sh run.sh e2e_edgeless.py  # canvas: 800x600 default, select-to-interact shield, free resize
sh run.sh e2e_synced.py    # server-synced workspace: fresh browser loads the embed via the server
docker compose down -v
```

Create the admin once before the stages:
`curl -X POST -H 'content-type: application/json' -d "{\"email\":\"htmltest@example.com\",\"password\":\"$(cat .testpw)\"}" http://127.0.0.1:3020/api/setup/create-admin-user`
(`run.sh` writes `.testpw` on first use.)

## MCP extension (Obsidian bridge)

Same disposable stack, with `AFFINE_MCP_WRITE: "1"` added to `x-affine-env`
and the project renamed (`/opt/affine-mcptest`):

```sh
sh mcp-seed.sh        # admin + server workspace + READ_WRITE MCP key (.wsid/.token, 0600)
python3 mcp_probe.py  # markdown round-trip shape, trash/restore, folder ops, retitle
```

The image build itself runs `server/workhub-test.cjs` (real yjs) and refuses to
build if any `server/patch-server.cjs` anchor drifts. With the flag unset the
server behaves exactly like upstream (write tools hidden, copilot guard kept).
