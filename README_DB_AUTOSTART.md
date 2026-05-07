DB auto-start helper

What this provides
- scripts/setup-db-autostart.sh : installer script to add a docker-compose.override.yml (restart + healthcheck) and install a systemd unit that runs `docker compose up -d` on boot.
- systemd/pids-db.service.template : editable template for systems where you want a custom unit.

Quick usage (on the VM):
1) Copy repo files to the VM (or git pull).
2) Run on the VM (requires sudo):
   sudo bash scripts/setup-db-autostart.sh --compose-dir /path/to/compose
3) Confirm:
   sudo systemctl status pids-db.service
   docker ps -a
   sudo journalctl -u pids-db.service -b --no-pager

Troubleshooting tips
- If container exits immediately: check `docker logs <container>` and host volume permissions (owner/UID expected by DB image).
- Ensure the DB volume path is owned by the DB UID (e.g., chown -R 999:999 /host/pgdata for postgres).
- For non-compose deployments use `docker run --restart unless-stopped ...`.

If you want, provide the docker-compose.yml or the container name and logs; the script can be adjusted to match your exact setup.