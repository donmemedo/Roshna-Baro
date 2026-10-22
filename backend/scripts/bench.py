"""Latency benchmark for the security/performance trade-offs (runs in-process, no network).

Usage: python scripts/bench.py [label]
Measures real bcrypt cost (default rounds), middleware overhead and history-size scaling.
"""
import asyncio
import json
import os
import statistics
import sys
import tempfile
import time
from datetime import date, timedelta

_tmp = tempfile.mkdtemp(prefix="roshana-bench-")
os.environ.update(DATABASE_URL=f"sqlite+aiosqlite:///{_tmp}/bench.db", SECRET_KEY="bench-" + "k" * 40, APP_ENV="test")

import httpx  # noqa: E402

from app.db import SessionLocal, init_db  # noqa: E402
from app.main import app, seed  # noqa: E402
from app.models import Cycle, DailyLog  # noqa: E402

PW = "correct-horse-battery"


async def timed(fn, n):
    """CPU time is the primary metric: it stays stable when the host is busy, wall time does not."""
    wall, cpu = [], []
    for _ in range(n):
        w, c = time.perf_counter(), time.process_time()
        await fn()
        cpu.append((time.process_time() - c) * 1000)
        wall.append((time.perf_counter() - w) * 1000)
    return {"cpu_p50_ms": round(statistics.median(cpu), 2), "wall_p50_ms": round(statistics.median(wall), 2)}


async def fill(user_id, cycles, logs):
    today = date.today()
    async with SessionLocal() as s:
        s.add_all([Cycle(user_id=user_id, period_start=today - timedelta(days=28 * (i + 1)), period_end=today - timedelta(days=28 * (i + 1) - 4)) for i in range(cycles)])
        s.add_all([DailyLog(user_id=user_id, log_date=today - timedelta(days=i), temperature=36.4 + (i % 7) * 0.03, mood="calm") for i in range(logs)])
        await s.commit()


async def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "run"
    await init_db()
    await seed()
    out = {"label": label}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://b") as c:
        out["health"] = await timed(lambda: c.get("/api/health"), 100)
        reg = await c.post("/api/auth/register", json={"email": "bench@example.com", "password": PW})
        h = {"Authorization": f"Bearer {reg.json()['access_token']}"}
        uid = (await c.get("/api/auth/me", headers=h)).json()["id"]
        out["login_ok"] = await timed(lambda: c.post("/api/auth/login", data={"username": "bench@example.com", "password": PW}), 3)
        out["me"] = await timed(lambda: c.get("/api/auth/me", headers=h), 50)
        out["clinics"] = await timed(lambda: c.get("/api/clinics", params={"city": "تهران"}), 50)
        out["articles"] = await timed(lambda: c.get("/api/articles"), 50)
        await fill(uid, 6, 30)
        out["insights_small"] = await timed(lambda: c.get("/api/insights", headers=h), 15)
        # heavy: three years of daily logs and ~40 cycles (rows appended; PK ids auto)
        async with SessionLocal() as s:
            from sqlmodel import delete
            await s.exec(delete(DailyLog))
            await s.exec(delete(Cycle))
            await s.commit()
        await fill(uid, 40, 1100)
        out["insights_3y"] = await timed(lambda: c.get("/api/insights", headers=h), 8)
        async with SessionLocal() as s:
            await s.exec(delete(DailyLog))
            await s.exec(delete(Cycle))
            await s.commit()
        await fill(uid, 400, 20000)
        out["insights_20k_logs"] = await timed(lambda: c.get("/api/insights", headers=h), 3)
        out["logs_list_20k"] = await timed(lambda: c.get("/api/logs", headers=h), 2)
    print(json.dumps(out, indent=2))


asyncio.run(main())
