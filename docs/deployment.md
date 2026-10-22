# Deployment

## Docker Compose (hardened)

```bash
cp .env.example .env
# edit .env: SECRET_KEY=$(openssl rand -base64 48)
docker compose up --build -d
```

Web on `http://localhost:3036`, API on `http://localhost:8036`. Ports bind to `127.0.0.1` by default (`BIND_ADDRESS` changes that). Both containers run as a non-root user with a read-only root filesystem, all capabilities dropped, no privilege escalation, memory/CPU/PID limits and rotated logs. Compose refuses to start without `SECRET_KEY`.

Note: the images were not built on the author's machine (the Docker daemon was not running). `docker compose config` validates, and the CI smoke job builds and boots the stack.

## Behind a reverse proxy (public use)

1. Terminate TLS at the proxy and forward to the two local ports.
2. Set `FORWARDED_ALLOW_IPS` to the proxy's address so per-client rate limits see real client addresses. Never set it to `*` while the port is reachable directly.
3. Set `CORS_ORIGINS` to the exact web origin and `NEXT_PUBLIC_API_URL` to the public API URL (it is baked into the frontend at build time).
4. Set `CSP_UPGRADE_INSECURE=1` once everything is served over HTTPS.
5. Keep `DEMO_MODE=false` and `ENABLE_DOCS=false`.

## Data

The database is `/data/glow.db` in the `backend-data` volume (SQLite, WAL mode). Back it up with the built-in tool; copying the file alone can lose committed data still in the `-wal` file:

```bash
docker compose exec backend python -m app.backup /data/backups/glow-$(date +%F).db
```

Encrypt the volume and the backups (disk encryption); the file holds health data in plain form. If you used the earlier compose file, its volume has a different name: copy the old `glow.db` into the new volume or remove the stale one.

## Scaling and limits

Run **one** API process: the rate limiter lives in memory. Before adding replicas, move the limiter to Redis and the database to Postgres.

## Next: PWA, Android (APK), iOS (IPA)

The PWA pieces already exist: manifest, icons, versioned service worker, install prompt in Settings. For stores, wrap the web app with Capacitor or a Trusted Web Activity (Android) and Capacitor (iOS), after: a privacy policy and consent text, account deletion (already implemented, which stores require), and a medical-disclaimer review.
