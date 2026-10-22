"""Red-team findings expressed as regression tests.

Each test asserts the *secure* behaviour. On the pre-hardening code these fail,
which is the proof of the vulnerability; after the fix they pass.
IDs map to docs/red-team-report.md.
"""
import asyncio
import base64
import json
from datetime import timedelta

import jwt
import pytest
from sqlalchemy.exc import IntegrityError

from app.config import Settings
from app.db import SessionLocal
from app.models import DailyLog
from app.schemas import utc_today
from tests.conftest import PASSWORD, register


def ago(n: int) -> str:
    return (utc_today() - timedelta(days=n)).isoformat()


# ---------- S1 CORS ----------
async def test_s1_cors_does_not_allow_arbitrary_origin(client):
    res = await client.options(
        "/api/auth/me",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET",
                 "Access-Control-Request-Headers": "authorization"},
    )
    allowed = res.headers.get("access-control-allow-origin")
    assert allowed not in ("*", "https://evil.example")


# ---------- S2 default secret ----------
def test_s2_refuses_default_or_short_secret_outside_dev(monkeypatch):
    for bad in ("change-me-in-production-please-really", "short"):
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.setenv("SECRET_KEY", bad)
        with pytest.raises(ValueError):
            Settings(_env_file=None)


# ---------- S3 / S4 login abuse ----------
async def test_s3_login_is_rate_limited(client):
    await register(client)
    codes, retry = [], None
    for _ in range(14):
        r = await client.post("/api/auth/login", data={"username": "a@example.com", "password": "wrong-password"})
        codes.append(r.status_code)
        retry = r.headers.get("retry-after") or retry
    assert 429 in codes
    assert retry is not None


async def test_s3_register_is_rate_limited(client):
    codes = []
    for i in range(14):
        r = await client.post("/api/auth/register", json={"email": f"u{i}@example.com", "password": PASSWORD})
        codes.append(r.status_code)
    assert 429 in codes


async def test_s4_unknown_user_still_runs_a_password_hash(client, monkeypatch):
    import app.routers.auth as auth_router
    calls = []
    real = auth_router.verify_password
    monkeypatch.setattr(auth_router, "verify_password", lambda raw, h: calls.append(1) or real(raw, h))
    await client.post("/api/auth/login", data={"username": "ghost@example.com", "password": "whatever-123"})
    assert calls, "unknown-user login skipped the hash check, creating a timing oracle"


# ---------- S5 password policy ----------
@pytest.mark.parametrize("pw", ["123", "short", "x" * 73, "é" * 40])
async def test_s5_weak_or_oversized_passwords_rejected(client, pw):
    r = await client.post("/api/auth/register", json={"email": "p@example.com", "password": pw})
    assert r.status_code == 422


# ---------- S6 / S7 token hygiene ----------
async def test_s7_token_has_iat_and_numeric_subject_and_short_life(client):
    _, token = await register(client)
    claims = jwt.decode(token, options={"verify_signature": False})
    assert claims["sub"].isdigit()
    assert "iat" in claims and "exp" in claims
    assert claims["exp"] - claims["iat"] <= 60 * 60 * 24 * 8


async def test_s7_alg_none_and_tampered_tokens_rejected(client):
    headers, token = await register(client)
    head, body, sig = token.split(".")
    none_head = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    for forged in (f"{none_head}.{body}.", f"{head}.{body}.{sig[:-2]}AA", "garbage"):
        r = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
        assert r.status_code == 401


async def test_deleted_user_token_stops_working(client):
    headers, _ = await register(client)
    assert (await client.request("DELETE", "/api/auth/me", json={"password": PASSWORD}, headers=headers)).status_code == 200
    assert (await client.get("/api/auth/me", headers=headers)).status_code == 401


# ---------- S8 demo account ----------
async def test_s8_demo_account_not_seeded_by_default(client):
    r = await client.post("/api/auth/login", data={"username": "demo@glow.ir", "password": "glow1234"})
    assert r.status_code == 401


# ---------- S9 input bounds ----------
async def test_s9_cycle_and_log_inputs_are_bounded(client):
    h, _ = await register(client)
    bad_cycles = [
        {"period_start": ago(20), "note": "x" * 5000},
        {"period_start": ago(20), "period_end": ago(30)},
        {"period_start": "1800-01-01"},
        {"period_start": "2999-01-01"},
    ]
    for body in bad_cycles:
        assert (await client.post("/api/cycles", json=body, headers=h)).status_code == 422, body
    bad_logs = [
        {"log_date": ago(5), "temperature": 99},
        {"log_date": ago(5), "mood": "<script>"},
        {"log_date": ago(5), "flow": "torrential"},
        {"log_date": ago(5), "symptoms": "a," * 3000},
        {"log_date": ago(5), "note": "n" * 5000},
    ]
    for body in bad_logs:
        assert (await client.put("/api/logs", json=body, headers=h)).status_code == 422, body


async def test_s9_profile_inputs_are_bounded(client):
    h, _ = await register(client)
    for body in ({"avg_cycle_length": 99999}, {"avg_period_length": 0}, {"birth_year": 3000},
                 {"display_name": "d" * 500}, {"goal": "hack"}, {"locale": "xx"}):
        assert (await client.patch("/api/auth/me", json=body, headers=h)).status_code == 422, body
    bad = await client.post("/api/auth/register", json={"email": "z@example.com", "password": PASSWORD, "display_name": "d" * 500})
    assert bad.status_code == 422


async def test_s9_cycle_rows_per_user_are_capped(client):
    h, _ = await register(client)
    from app.config import settings
    cap = getattr(settings, "max_cycles_per_user", None)
    assert cap is not None, "no per-user cap configured"


# ---------- S10 / S11 numeric edges ----------
@pytest.mark.parametrize("amount", [-5, 0, 10**30, 123])
async def test_s10_fund_amount_must_be_an_allowed_tier(client, amount):
    h, _ = await register(client)
    r = await client.post(f"/api/fund/join?monthly_amount={amount}", headers=h)
    assert r.status_code == 422


@pytest.mark.parametrize("d", ["9999-12-31", "0001-01-01", "2999-01-01"])
async def test_s11_pregnancy_timeline_rejects_out_of_range_dates(client, d):
    r = await client.post("/api/pregnancy/timeline", json={"last_period": d})
    assert r.status_code == 422


# ---------- S12 honest public numbers ----------
async def test_s12_community_stats_report_real_counts_only(client):
    await register(client, "s1@example.com")
    body = (await client.get("/api/stats/community")).json()
    assert body["users"] == 1
    assert "accuracy" not in body


# ---------- S13 / S14 headers + docs ----------
async def test_s13_docs_and_openapi_hidden_outside_dev(client):
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert (await client.get(path)).status_code == 404


async def test_s14_security_headers_present(client):
    r = await client.get("/api/health")
    h = r.headers
    assert h.get("x-content-type-options") == "nosniff"
    assert h.get("referrer-policy")
    assert "frame-ancestors" in h.get("content-security-policy", "")
    assert h.get("cache-control") == "no-store"
    assert "server" not in h or "uvicorn" not in h["server"].lower()


async def test_error_responses_do_not_leak_internals(client):
    r = await client.get("/api/pregnancy/week/abc")
    assert r.status_code == 422
    assert "Traceback" not in r.text and "sqlalchemy" not in r.text.lower()


# ---------- DoS: request size ----------
async def test_oversized_bodies_are_rejected_with_413(client):
    big = "x" * 70_000
    declared = await client.post("/api/auth/register", content=big, headers={"content-type": "application/json"})
    assert declared.status_code == 413 and declared.json()["code"] == "payload_too_large"

    async def stream():  # no Content-Length: only counting real bytes can catch this
        for _ in range(8):
            yield b"y" * 10_000

    chunked = await client.post("/api/auth/register", content=stream(), headers={"content-type": "application/json"})
    assert chunked.status_code == 413
    small = await client.post("/api/auth/register", json={"email": "ok@example.com", "password": PASSWORD})
    assert small.status_code == 200


# ---------- review findings (R-n): second-round red team ----------
async def test_r1_user_ids_are_never_reused_and_stale_tokens_are_rejected(client):
    import jwt

    from app.config import settings

    await register(client, "keep@example.com")
    hb, tok_b = await register(client, "b@example.com")
    b_id = (await client.get("/api/auth/me", headers=hb)).json()["id"]
    assert (await client.request("DELETE", "/api/auth/me", json={"password": PASSWORD}, headers=hb)).status_code == 200
    hc, _ = await register(client, "c@example.com")
    c_id = (await client.get("/api/auth/me", headers=hc)).json()["id"]
    assert c_id != b_id, "id reused: the deleted user's token would unlock the new account"
    assert (await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok_b}"})).status_code == 401

    # even if an id were reused, a token minted before the account existed must fail
    now = int(__import__("time").time())
    old = jwt.encode({"sub": str(c_id), "iat": now - 3600, "exp": now + 3600}, settings.secret_key, algorithm="HS256")
    assert (await client.get("/api/auth/me", headers={"Authorization": f"Bearer {old}"})).status_code == 401


def test_r2_ipv6_clients_are_bucketed_by_64():
    from types import SimpleNamespace

    from app.ratelimit import client_ip

    def ip(host):
        return client_ip(SimpleNamespace(client=SimpleNamespace(host=host)))

    assert ip("2001:db8:1:2::1") == ip("2001:db8:1:2:ffff:ffff:ffff:ffff")
    assert ip("2001:db8:1:2::1") != ip("2001:db8:1:3::1")
    assert ip("::ffff:203.0.113.9") == ip("203.0.113.9") == "203.0.113.9"


async def test_r2_guessing_one_account_from_many_addresses_hits_the_account_limit(client, monkeypatch):
    from app.config import settings
    from tests.conftest import client_from

    monkeypatch.setattr(settings, "login_account_max_failures", 3)
    await register(client)
    codes = []
    for i in range(5):
        async with client_from(f"198.51.100.{i + 10}") as other:
            r = await other.post("/api/auth/login", data={"username": "a@example.com", "password": "wrong-password"})
            codes.append(r.status_code)
    assert codes[:3] == [401, 401, 401] and codes[3:] == [429, 429]


async def test_r2b_strangers_cannot_lock_the_owner_out_from_a_known_address(client, monkeypatch):
    from app.config import settings
    from tests.conftest import client_from

    monkeypatch.setattr(settings, "login_account_max_failures", 3)
    await register(client)
    async with client_from("192.0.2.50") as home:   # the owner signs in once from their usual address
        assert (await home.post("/api/auth/login", data={"username": "a@example.com", "password": PASSWORD})).status_code == 200
    for i in range(4):                               # a stranger fails from other addresses until the cap trips
        async with client_from(f"198.51.100.{i + 20}") as other:
            await other.post("/api/auth/login", data={"username": "a@example.com", "password": "wrong-password"})
    async with client_from("198.51.100.99") as new_address:
        blocked = await new_address.post("/api/auth/login", data={"username": "a@example.com", "password": PASSWORD})
    assert blocked.status_code == 429                # unknown addresses are held back
    async with client_from("192.0.2.50") as home:
        again = await home.post("/api/auth/login", data={"username": "a@example.com", "password": PASSWORD})
    assert again.status_code == 200                  # the owner's known address is not


async def test_r5_deleting_the_account_needs_the_password(client):
    h, _ = await register(client)
    no_body = await client.delete("/api/auth/me", headers=h)
    assert no_body.status_code == 422
    wrong = await client.request("DELETE", "/api/auth/me", json={"password": "not-the-password"}, headers=h)
    assert wrong.status_code == 403
    assert (await client.get("/api/auth/me", headers=h)).status_code == 200      # still there


def test_r6_sql_errors_do_not_leak_bound_values():
    import asyncio

    from sqlalchemy.exc import IntegrityError

    from app.models import User

    async def go():
        async with SessionLocal() as s:
            s.add(User(email="dup@example.com", hashed_password="h", display_name="SENTINEL-NOTE-9f3"))
            await s.commit()
        try:
            async with SessionLocal() as s:
                s.add(User(email="dup@example.com", hashed_password="h", display_name="SENTINEL-NOTE-9f3"))
                await s.commit()
        except IntegrityError as exc:
            return str(exc)

    from sqlmodel import SQLModel

    from app.db import engine, init_db

    async def fresh():
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.drop_all)
        await init_db()

    asyncio.run(fresh())
    text = asyncio.run(go())
    assert text and "SENTINEL-NOTE-9f3" not in text


async def test_r9_concurrent_duplicate_cycles_store_one_row(client):
    h, _ = await register(client)
    results = await asyncio.gather(*[client.post("/api/cycles", json={"period_start": ago(30)}, headers=h) for _ in range(8)])
    assert sorted(r.status_code for r in results).count(200) == 1
    assert len((await client.get("/api/cycles", headers=h)).json()) == 1


async def test_r10_birth_year_can_be_cleared_but_other_fields_cannot_be_nulled(client):
    h, _ = await register(client, birth_year=1990)
    assert (await client.patch("/api/auth/me", json={"birth_year": None}, headers=h)).json()["birth_year"] is None
    for field in ("display_name", "goal", "locale", "avg_cycle_length"):
        assert (await client.patch("/api/auth/me", json={field: None}, headers=h)).status_code == 422, field
    kept = await client.patch("/api/auth/me", json={"display_name": "Sara"}, headers=h)
    assert kept.json()["display_name"] == "Sara"


async def test_r10_pregnancy_date_is_not_accepted_in_the_url(client):
    assert (await client.get("/api/pregnancy/timeline", params={"last_period": ago(40)})).status_code == 405


async def test_fund_membership_is_unique_per_user(client):
    h, _ = await register(client)
    await asyncio.gather(*[client.post("/api/fund/join?monthly_amount=300000", headers=h) for _ in range(5)])
    assert (await client.get("/api/fund", headers=h)).json()["members"] == 1


async def test_backup_produces_a_consistent_copy(client, tmp_path):
    import sqlite3

    from app.backup import backup

    await register(client, "backup@example.com")
    out = backup(str(tmp_path / "copy" / "glow.db"))
    rows = sqlite3.connect(out).execute("select email from user").fetchall()
    assert ("backup@example.com",) in rows
    assert oct(out.stat().st_mode & 0o777) == "0o600"


# ---------- controls: these must keep passing ----------
async def test_control_idor_cycle_delete_is_owner_only(client):
    ha, _ = await register(client, "a@example.com")
    hb, _ = await register(client, "b@example.com")
    created = (await client.post("/api/cycles", json={"period_start": ago(20)}, headers=ha)).json()
    r = await client.delete(f"/api/cycles/{created['id']}", headers=hb)
    assert r.status_code == 404
    assert len((await client.get("/api/cycles", headers=ha)).json()) == 1


async def test_control_logs_are_scoped_to_owner(client):
    ha, _ = await register(client, "a@example.com")
    hb, _ = await register(client, "b@example.com")
    await client.put("/api/logs", json={"log_date": ago(5), "note": "private"}, headers=ha)
    assert (await client.get("/api/logs", headers=hb)).json() == []


async def test_control_mass_assignment_blocked(client):
    h, _ = await register(client)
    await client.patch("/api/auth/me", json={"is_premium": True, "fund_member": True, "id": 99}, headers=h)
    me = (await client.get("/api/auth/me", headers=h)).json()
    assert me["is_premium"] is False and me["fund_member"] is False and me["id"] != 99


async def test_control_protected_routes_require_auth(client):
    for method, path in (("GET", "/api/auth/me"), ("GET", "/api/cycles"), ("GET", "/api/logs"),
                         ("GET", "/api/insights"), ("GET", "/api/fund"), ("PUT", "/api/logs"),
                         ("POST", "/api/cycles"), ("POST", "/api/fund/join")):
        r = await client.request(method, path)
        assert r.status_code == 401, (method, path)


async def test_control_sql_metacharacters_are_inert(client):
    r = await client.get("/api/clinics", params={"city": "' OR 1=1 --"})
    assert r.status_code == 200 and r.json() == []          # bound parameter: matched literally
    for path, params in (("/api/clinics", {"service": "x'; DROP TABLE user;--"}),
                         ("/api/articles", {"category": "' OR '1'='1"})):
        assert (await client.get(path, params=params)).status_code == 422   # enum rejects it outright
    assert (await client.get("/api/clinics")).status_code == 200            # table still there


# ---------- data-integrity bugs found during the audit ----------
async def test_b1_quick_log_does_not_erase_existing_fields(client):
    h, _ = await register(client)
    await client.put("/api/logs", json={"log_date": ago(3), "temperature": 36.6, "mood": "calm",
                                        "symptoms": "energy", "note": "keep"}, headers=h)
    await client.put("/api/logs", json={"log_date": ago(3), "intercourse": True}, headers=h)
    row = (await client.get("/api/logs", headers=h)).json()[0]
    assert row["temperature"] == 36.6 and row["mood"] == "calm" and row["note"] == "keep"
    assert row["intercourse"] is True


async def test_b3_one_log_row_per_user_and_day(client):
    h, _ = await register(client)
    me = (await client.get("/api/auth/me", headers=h)).json()
    async with SessionLocal() as s:
        s.add(DailyLog(user_id=me["id"], log_date=utc_today() - timedelta(days=3)))
        await s.commit()
    with pytest.raises(IntegrityError):
        async with SessionLocal() as s:
            s.add(DailyLog(user_id=me["id"], log_date=utc_today() - timedelta(days=3)))
            await s.commit()


async def test_b3_concurrent_saves_do_not_duplicate(client):
    h, _ = await register(client)
    await asyncio.gather(*[
        client.put("/api/logs", json={"log_date": ago(2), "note": str(i)}, headers=h) for i in range(6)
    ])
    assert len((await client.get("/api/logs", headers=h)).json()) == 1


# ---------- privacy promises made in the UI copy ----------
async def test_f8_account_export_and_delete_exist(client):
    h, _ = await register(client)
    await client.post("/api/cycles", json={"period_start": ago(20)}, headers=h)
    exp = await client.get("/api/auth/me/export", headers=h)
    assert exp.status_code == 200
    data = exp.json()
    assert data["user"]["email"] == "a@example.com" and len(data["cycles"]) == 1
    assert "hashed_password" not in json.dumps(data)
    assert (await client.request("DELETE", "/api/auth/me", json={"password": PASSWORD}, headers=h)).status_code == 200
    login = await client.post("/api/auth/login", data={"username": "a@example.com", "password": PASSWORD})
    assert login.status_code == 401
