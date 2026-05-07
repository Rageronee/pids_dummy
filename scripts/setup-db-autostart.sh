#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [--compose-dir DIR] [--service-name NAME]
Install helper to auto-start DB containers on Linux server (systemd + docker compose).
Defaults:
  --compose-dir /opt/pids
  --service-name db
EOF
}

COMPOSE_DIR="/opt/pids"
SERVICE_NAME="db"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-dir) COMPOSE_DIR="$2"; shift 2;;
    --service-name) SERVICE_NAME="$2"; shift 2;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install docker first."
  exit 1
fi

if command -v systemctl >/dev/null 2>&1; then
  echo "Enabling docker service..."
  sudo systemctl enable --now docker || true
fi

if [ -f "$COMPOSE_DIR/docker-compose.yml" ] || [ -f "$COMPOSE_DIR/docker-compose.yaml" ]; then
  echo "Creating docker-compose.override.yml in $COMPOSE_DIR to add restart policy and healthcheck."
  OVERRIDE_FILE="$COMPOSE_DIR/docker-compose.override.yml"
  cat > "$OVERRIDE_FILE" <<'EOF'
version: "3.8"
services:
  db:
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
  postgres:
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
EOF
  echo "Override created: $OVERRIDE_FILE"
else
  echo "No docker-compose.yml found in $COMPOSE_DIR. Skipping override creation."
fi

DOCKER_BIN="$(command -v docker || command -v docker-compose || true)"
if [ -z "$DOCKER_BIN" ]; then
  echo "Could not find docker or docker-compose binary. Aborting unit creation."
  exit 1
fi

UNIT_NAME="pids-db.service"
UNIT_PATH="/etc/systemd/system/$UNIT_NAME"

echo "Installing systemd unit $UNIT_PATH (requires sudo)."
sudo bash -c "cat > '$UNIT_PATH' <<UNIT_EOF
[Unit]
Description=PIDS DB service (docker compose)
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$COMPOSE_DIR
ExecStart=$DOCKER_BIN compose up -d
ExecStop=$DOCKER_BIN compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT_EOF"

echo "Reloading systemd and enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable --now "$UNIT_NAME"

echo "Done. If the service fails, inspect: sudo journalctl -u $UNIT_NAME -b --no-pager"
echo "Check docker containers: docker ps -a"
echo "To adjust DB healthchecks or restart policy edit $COMPOSE_DIR/docker-compose.override.yml"
