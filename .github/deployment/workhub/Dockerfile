# Work Hub self-host image: upstream AFFiNE 0.27.4 server with the patched
# web UI (live HTML attachment embeds). Build context must contain `web/`
# = the `web` artifact from the "Work Hub HTML embed build" workflow.
#
#   docker build -t workhub/affine:0.27.4-htmlembed-<sha> .
ARG UPSTREAM_IMAGE=ghcr.io/toeverything/affine:0.27.4
FROM ${UPSTREAM_IMAGE}
# Replace the web UI only; keep upstream admin + mobile bundles.
RUN find /app/static -mindepth 1 -maxdepth 1 ! -name admin ! -name mobile -exec rm -rf {} +
COPY web/ /app/static/
LABEL org.opencontainers.image.source=https://github.com/heli-konton/work-hub-v2
LABEL org.opencontainers.image.description="AFFiNE 0.27.4 + Work Hub live HTML embeds"
