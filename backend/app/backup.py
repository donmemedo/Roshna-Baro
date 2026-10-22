"""Consistent online backup of the SQLite database (safe while the API is running and in WAL mode).

    docker compose exec backend python -m app.backup /data/backups/glow-$(date +%F).db

Copying glow.db with `cp` alone is not safe: committed data may still sit in the -wal file.
"""
import sqlite3
import sys
from pathlib import Path

from .config import settings


def backup(dest: str) -> Path:
    source = settings.database_url.split("///", 1)[-1]
    out = Path(dest)
    out.parent.mkdir(parents=True, exist_ok=True)
    src, dst = sqlite3.connect(f"file:{source}?mode=ro", uri=True), sqlite3.connect(out)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    out.chmod(0o600)
    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -m app.backup DEST_FILE")
    print(backup(sys.argv[1]))
