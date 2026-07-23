#!/usr/bin/env bash
# Wait until a TCP host:port accepts connections.
set -euo pipefail

HOST="${1:?host required}"
PORT="${2:?port required}"
RETRIES="${3:-60}"
SLEEP_SECS="${4:-2}"

echo "warmup: waiting for ${HOST}:${PORT} (retries=${RETRIES})"
for i in $(seq 1 "$RETRIES"); do
  if (echo >/dev/tcp/"$HOST"/"$PORT") >/dev/null 2>&1; then
    echo "warmup: ${HOST}:${PORT} is open"
    exit 0
  fi
  # Fallback when /dev/tcp is unavailable
  if command -v nc >/dev/null 2>&1 && nc -z "$HOST" "$PORT" >/dev/null 2>&1; then
    echo "warmup: ${HOST}:${PORT} is open"
    exit 0
  fi
  sleep "$SLEEP_SECS"
done

echo "warmup: timed out waiting for ${HOST}:${PORT}" >&2
exit 1
