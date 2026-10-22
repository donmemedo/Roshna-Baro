"""Shared fixtures: isolated SQLite file per session, fresh schema per test."""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="roshana-test-")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP}/test.db"
os.environ["SECRET_KEY"] = "test-secret-key-" + "x" * 40
os.environ["APP_ENV"] = "test"
os.environ["BCRYPT_ROUNDS"] = "4"  # fast hashing for tests; production default is 12

import httpx  # noqa: E402
import pytest_asyncio  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

from app.db import engine, init_db  # noqa: E402
from app.main import app, seed  # noqa: E402
from app.ratelimit import reset_all  # noqa: E402

PASSWORD = "correct-horse-battery"


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await init_db()
    await seed()
    reset_all()
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def register(client: httpx.AsyncClient, email: str = "a@example.com", password: str = PASSWORD, **extra):
    res = await client.post("/api/auth/register", json={"email": email, "password": password, **extra})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, token


def client_from(ip: str):
    """A client whose requests appear to come from `ip` (to test per-address rate limiting)."""
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False, client=(ip, 5000))
    return httpx.AsyncClient(transport=transport, base_url="http://test")
