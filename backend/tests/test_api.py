"""Functional behaviour of the public API."""
from datetime import timedelta

from app import ratelimit
from app.config import settings
from app.main import app, seed
from app.schemas import utc_today
from tests.conftest import PASSWORD, register


def ago(n: int) -> str:
    return (utc_today() - timedelta(days=n)).isoformat()


async def test_register_login_me_roundtrip(client):
    headers, _ = await register(client, "Mixed.Case@Example.com", display_name="  Maryam  ")
    me = (await client.get("/api/auth/me", headers=headers)).json()
    assert me["email"] == "mixed.case@example.com" and me["display_name"] == "Maryam"
    login = await client.post("/api/auth/login", data={"username": "MIXED.case@example.com", "password": PASSWORD})
    assert login.status_code == 200 and login.json()["token_type"] == "bearer"


async def test_duplicate_email_is_409_with_code(client):
    await register(client)
    again = await client.post("/api/auth/register", json={"email": "A@example.com", "password": PASSWORD})
    assert again.status_code == 409 and again.json()["code"] == "email_taken"


async def test_wrong_password_uses_generic_error(client):
    await register(client)
    bad = await client.post("/api/auth/login", data={"username": "a@example.com", "password": "nope-nope-nope"})
    ghost = await client.post("/api/auth/login", data={"username": "ghost@example.com", "password": "nope-nope-nope"})
    assert bad.status_code == ghost.status_code == 401
    assert bad.json() == ghost.json() and bad.json()["code"] == "invalid_credentials"


async def test_validation_errors_never_echo_submitted_values(client):
    body = await client.post("/api/auth/register", json={"email": "not-an-email", "password": "SuperSecret-Value-1"})
    assert body.status_code == 422 and "SuperSecret-Value-1" not in body.text and "not-an-email" not in body.text
    assert body.json()["code"] == "validation_error" and body.json()["errors"]


async def test_cycles_crud_and_duplicate_guard(client):
    h, _ = await register(client)
    made = await client.post("/api/cycles", json={"period_start": ago(40), "period_end": ago(36)}, headers=h)
    assert made.status_code == 200
    dup = await client.post("/api/cycles", json={"period_start": ago(40)}, headers=h)
    assert dup.status_code == 409 and dup.json()["code"] == "duplicate"
    assert (await client.delete(f"/api/cycles/{made.json()['id']}", headers=h)).status_code == 200
    assert (await client.get("/api/cycles", headers=h)).json() == []


async def test_per_user_caps_are_enforced(client, monkeypatch):
    monkeypatch.setattr(settings, "max_cycles_per_user", 2)
    monkeypatch.setattr(settings, "max_logs_per_user", 2)
    h, _ = await register(client)
    codes = [(await client.post("/api/cycles", json={"period_start": ago(30 * (i + 1))}, headers=h)).status_code for i in range(3)]
    assert codes == [200, 200, 409]
    logs = [(await client.put("/api/logs", json={"log_date": ago(i)}, headers=h)).status_code for i in range(3)]
    assert logs == [200, 200, 409]
    # updating an existing day is still allowed at the cap
    assert (await client.put("/api/logs", json={"log_date": ago(0), "note": "ok"}, headers=h)).status_code == 200


async def test_logs_window_and_limit(client):
    h, _ = await register(client)
    for n in (1, 2, 400):
        await client.put("/api/logs", json={"log_date": ago(n)}, headers=h)
    default = (await client.get("/api/logs", headers=h)).json()
    assert [r["log_date"] for r in default] == [ago(2), ago(1)]          # oldest first, 400-day-old row excluded
    everything = (await client.get("/api/logs", params={"since": ago(500)}, headers=h)).json()
    assert len(everything) == 3
    assert len((await client.get("/api/logs", params={"since": ago(500), "limit": 1}, headers=h)).json()) == 1


async def test_insights_uses_client_local_today_within_one_day(client):
    h, _ = await register(client)
    await client.post("/api/cycles", json={"period_start": ago(10)}, headers=h)
    tomorrow = (utc_today() + timedelta(days=1)).isoformat()
    ok = await client.get("/api/insights", params={"today": tomorrow}, headers=h)
    assert ok.status_code == 200 and ok.json()["today"] == tomorrow and len(ok.json()["calendar"]) == 60
    far = await client.get("/api/insights", params={"today": ago(5)}, headers=h)
    assert far.status_code == 422


async def test_insights_for_a_new_user_asks_for_data(client):
    h, _ = await register(client)
    body = (await client.get("/api/insights", headers=h)).json()
    assert body["next_period"] is None and body["insights"][0]["key"] == "onboarding"


async def test_clinic_filters_use_whole_service_tokens(client):
    all_rows = (await client.get("/api/clinics")).json()
    assert all_rows and all_rows == sorted(all_rows, key=lambda c: -c["rating"])
    city = all_rows[0]["city_en"]
    only_city = (await client.get("/api/clinics", params={"city": city})).json()
    assert only_city and all(c["city_en"] == city for c in only_city)
    ivf = (await client.get("/api/clinics", params={"service": "ivf"})).json()
    assert all("ivf" in c["services"].split(",") for c in ivf)


async def test_articles_list_is_light_and_detail_has_the_body(client):
    rows = (await client.get("/api/articles")).json()
    assert rows and "body_fa" not in rows[0] and "body_en" not in rows[0]
    one = await client.get(f"/api/articles/{rows[0]['slug']}")
    assert one.status_code == 200 and one.json()["body_en"]
    assert (await client.get("/api/articles/does-not-exist")).status_code == 404
    assert (await client.get("/api/articles/Bad_Slug!")).status_code == 422
    assert "max-age" in one.headers["cache-control"]


async def test_pregnancy_endpoints(client):
    assert (await client.get("/api/pregnancy/week/12")).json()["week"] == 12
    assert (await client.get("/api/pregnancy/week/0")).status_code == 422
    ok = await client.post("/api/pregnancy/timeline", json={"last_period": ago(84)})
    assert ok.status_code == 200 and ok.json()["week"] == 13 and ok.json()["trimester"] == 1


async def test_fund_join_leave_reports_real_numbers(client):
    h, _ = await register(client)
    before = (await client.get("/api/fund", headers=h)).json()
    assert before["members"] == 0 and before["monthly_pledges_toman"] == 0 and not before["is_member"]
    joined = (await client.post("/api/fund/join?monthly_amount=500000", headers=h)).json()
    assert joined["members"] == 1 and joined["monthly_pledges_toman"] == 500000 and joined["is_member"]
    left = (await client.post("/api/fund/leave", headers=h)).json()
    assert left["members"] == 0 and not left["is_member"]


async def test_health_ready_and_request_ids(client):
    assert (await client.get("/api/health")).json()["status"] == "ok"
    assert (await client.get("/api/ready")).json() == {"status": "ready"}
    good = await client.get("/api/health", headers={"X-Request-ID": "abc12345-req"})
    assert good.headers["x-request-id"] == "abc12345-req"
    evil = await client.get("/api/health", headers={"X-Request-ID": "x y\r\nSet-Cookie: a=b"})
    assert evil.headers["x-request-id"] != "x y" and "set-cookie" not in evil.headers


async def test_unhandled_error_becomes_a_clean_500_with_headers(client):
    async def boom():
        raise RuntimeError("secret internals")

    app.add_api_route("/api/_boom", boom)
    res = await client.get("/api/_boom")
    assert res.status_code == 500 and res.json()["code"] == "internal_error"
    assert "secret internals" not in res.text and res.headers["x-content-type-options"] == "nosniff"


async def test_demo_account_only_exists_when_demo_mode_is_on(client, monkeypatch):
    monkeypatch.setattr(settings, "demo_mode", True)
    await seed()
    ok = await client.post("/api/auth/login", data={"username": "demo@glow.ir", "password": "glow1234"})
    assert ok.status_code == 200
    h = {"Authorization": f"Bearer {ok.json()['access_token']}"}
    assert (await client.get("/api/insights", headers=h)).json()["cycle_day"] is not None


async def test_cors_allows_the_configured_origin_only(client):
    origin = settings.cors_origin_list[0]
    res = await client.options("/api/auth/me", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
    assert res.headers["access-control-allow-origin"] == origin
    assert "access-control-allow-credentials" not in res.headers


def test_rate_limiter_window_and_forget():
    ratelimit.reset_all()
    assert [ratelimit.hit("k", 2, 60) for _ in range(3)][:2] == [0, 0]
    assert ratelimit.hit("k", 2, 60) > 0
    ratelimit.forget("k")
    assert ratelimit.hit("k", 2, 60) == 0
    ratelimit.reset_all()
