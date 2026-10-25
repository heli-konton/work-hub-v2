#!/bin/sh
# Run a playwright script inside CT190 against the test stack. Usage: run.sh <script.py>
set -eu
cd /opt/affine-htmltest
[ -f .testpw ] || (umask 077; openssl rand -hex 12 > .testpw)
docker run --rm --network host --ipc host \
  -e TEST_PASSWORD="$(cat .testpw)" \
  -v /opt/affine-htmltest:/work -w /work \
  mcr.microsoft.com/playwright/python:v1.55.0-noble \
  sh -c "pip install -q playwright==1.55.0 2>/dev/null; python3 /work/$1"
