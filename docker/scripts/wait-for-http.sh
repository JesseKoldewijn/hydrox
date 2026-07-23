#!/usr/bin/env bash
# Wait until an HTTP endpoint returns 2xx.
set -euo pipefail

URL="${1:?url required}"
RETRIES="${2:-60}"
SLEEP_SECS="${3:-2}"

echo "warmup: waiting for HTTP ${URL} (retries=${RETRIES})"
for i in $(seq 1 "$RETRIES"); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "warmup: ${URL} is ready"
    exit 0
  fi
  sleep "$SLEEP_SECS"
done

echo "warmup: timed out waiting for ${URL}" >&2
exit 1
