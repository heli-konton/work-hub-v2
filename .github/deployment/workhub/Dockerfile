# Work Hub self-host image: upstream AFFiNE 0.27.4 server with the patched
# web UI (live HTML attachment embeds) and the Work Hub MCP server extension
# (write tools behind AFFINE_MCP_WRITE=1, doc listing/trash, organize folders).
# Build context must contain `web/` = the `web` artifact from the
# "Work Hub HTML embed build" workflow, and `server/` from this folder.
#
#   docker build -t workhub/affine:0.27.4-htmlembed-<websha>-mcp-<sha> .
ARG UPSTREAM_IMAGE=ghcr.io/toeverything/affine:0.27.4
FROM ${UPSTREAM_IMAGE}
# Replace the web UI only; keep upstream admin + mobile bundles.
RUN find /app/static -mindepth 1 -maxdepth 1 ! -name admin ! -name mobile -exec rm -rf {} +
COPY web/ /app/static/
# Server extension: patch fails the build if any anchor drifts; tests run on the real yjs.
COPY server/workhub-mcp.cjs server/patch-server.cjs server/workhub-test.cjs /app/dist/
RUN node /app/dist/patch-server.cjs /app/dist/main.js \
 && node --test /app/dist/workhub-test.cjs \
 && rm /app/dist/workhub-test.cjs
LABEL org.opencontainers.image.source=https://github.com/heli-konton/work-hub-v2
LABEL org.opencontainers.image.description="AFFiNE 0.27.4 + Work Hub live HTML embeds + MCP extension"
