"""Black-box checks against a RUNNING instance (your own, local). Prints PASS/FAIL per control.

    python scripts/live_probe.py http://127.0.0.1:8036 http://localhost:3036

Needs: httpx. Uses a spoofed X-Forwarded-For so the rate-limit probes do not lock your own address
(uvicorn only honours that header from FORWARDED_ALLOW_IPS, which defaults to 127.0.0.1).
"""
import json
import sys
import uuid

import httpx

API = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8036"
WEB = sys.argv[2].rstrip("/") if len(sys.argv) > 2 else None
EVIL = "https://evil.example"
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))


def xff() -> dict:
    return {"X-Forwarded-For": f"203.0.113.{uuid.uuid4().int % 250 + 1}"}


with httpx.Client(base_url=API, timeout=30) as c:
    r = c.get("/api/health", headers=xff())
    h = {k.lower(): v for k, v in r.headers.items()}
    check("health responds", r.status_code == 200)
    check("nosniff", h.get("x-content-type-options") == "nosniff")
    check("CSP frame-ancestors none", "frame-ancestors 'none'" in h.get("content-security-policy", ""))
    check("Referrer-Policy no-referrer", h.get("referrer-policy") == "no-referrer")
    check("API responses not cacheable", h.get("cache-control") == "no-store")
    check("no server banner", "uvicorn" not in h.get("server", "").lower(), h.get("server", "none"))
    check("request id issued", bool(h.get("x-request-id")))

    pre = c.options("/api/auth/me", headers={"Origin": EVIL, "Access-Control-Request-Method": "GET", **xff()})
    check("CORS: hostile origin refused", pre.headers.get("access-control-allow-origin") not in ("*", EVIL))
    for path in ("/docs", "/redoc", "/openapi.json"):
        check(f"{path} hidden", c.get(path, headers=xff()).status_code == 404)

    demo = c.post("/api/auth/login", data={"username": "demo@glow.ir", "password": "glow1234"}, headers=xff())
    check("demo account absent", demo.status_code == 401 and not c.get("/api/health").json().get("demo"))

    for path in ("/api/auth/me", "/api/cycles", "/api/logs", "/api/insights", "/api/fund"):
        check(f"{path} needs auth", c.get(path, headers=xff()).status_code == 401)
    forged = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIn0."
    check("alg=none token refused", c.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}", **xff()}).status_code == 401)

    weak = c.post("/api/auth/register", json={"email": "w@example.com", "password": "123"}, headers=xff())
    check("weak password refused", weak.status_code == 422)
    big = c.post("/api/auth/register", content="x" * 70_000, headers={"content-type": "application/json", **xff()})
    check("oversized body -> 413", big.status_code == 413)
    echo = c.post("/api/auth/register", json={"email": "bad", "password": "Sup3r-Secret-Value"}, headers=xff())
    check("validation error does not echo input", "Sup3r-Secret-Value" not in echo.text)

    ip = xff()
    email = f"probe-{uuid.uuid4().hex[:8]}@example.com"
    reg = c.post("/api/auth/register", json={"email": email, "password": "correct-horse-battery"}, headers=ip)
    check("register works", reg.status_code == 200)
    token = reg.json().get("access_token", "")
    auth = {"Authorization": f"Bearer {token}", **ip}
    me = c.get("/api/auth/me", headers=auth)
    check("own profile readable", me.status_code == 200 and me.json()["email"] == email)

    mass = c.patch("/api/auth/me", json={"is_premium": True}, headers=auth)
    check("mass assignment refused", mass.status_code == 422)
    cyc = c.post("/api/cycles", json={"period_start": "2999-01-01"}, headers=auth)
    check("future/out-of-range date refused", cyc.status_code == 422)
    tier = c.post("/api/fund/join?monthly_amount=-5", headers=auth)
    check("invalid fund amount refused", tier.status_code == 422)
    inj = c.get("/api/clinics", params={"service": "x'; DROP TABLE user;--"}, headers=xff())
    check("SQL metacharacters rejected by enum", inj.status_code == 422)
    check("pregnancy date not accepted via GET", c.get("/api/pregnancy/timeline", params={"last_period": "2026-01-01"}, headers=xff()).status_code == 405)
    delete_no_pw = c.request("DELETE", "/api/auth/me", json={"password": "wrong-password-xx"}, headers=auth)
    check("account deletion needs the right password", delete_no_pw.status_code == 403)

    spread = [c.post("/api/auth/login", data={"username": email, "password": "wrong-password-1"}, headers=xff()).status_code for _ in range(34)]
    check("guessing one account from many IPs is capped", 429 in spread, f"first 429 at attempt {spread.index(429) + 1}" if 429 in spread else "never")

    one_ip = xff()
    # default ceiling is 40 attempts per 5 minutes per address (LOGIN_IP_MAX_ATTEMPTS), each with a different e-mail
    codes = [c.post("/api/auth/login", data={"username": f"x{i}@example.com", "password": "wrong-password-1"}, headers=one_ip).status_code for i in range(45)]
    check("per-IP login throttle", 429 in codes, f"first 429 at attempt {codes.index(429) + 1}" if 429 in codes else "never")
    ra = c.post("/api/auth/login", data={"username": "z@example.com", "password": "wrong-password-1"}, headers=one_ip)
    check("429 carries Retry-After", ra.status_code == 429 and ra.headers.get("retry-after", "").isdigit())

if WEB:
    with httpx.Client(base_url=WEB, timeout=60, follow_redirects=False) as w:
        r = w.get("/login")
        h = {k.lower(): v for k, v in r.headers.items()}
        csp = h.get("content-security-policy", "")
        check("web: login page served", r.status_code == 200)
        check("web: CSP uses a nonce + strict-dynamic", "'nonce-" in csp and "'strict-dynamic'" in csp)
        check("web: no unsafe-inline/eval for scripts", "script-src" in csp and "'unsafe-eval'" not in csp.split("script-src")[1].split(";")[0] and "'unsafe-inline'" not in csp.split("script-src")[1].split(";")[0])
        check("web: frame-ancestors none + X-Frame-Options", "frame-ancestors 'none'" in csp and h.get("x-frame-options") == "DENY")
        check("web: no X-Powered-By", "x-powered-by" not in h)
        check("web: no third-party hosts in page", "fonts.googleapis.com" not in r.text and "fonts.gstatic.com" not in r.text)
        nonces = {part.split("nonce-")[1].split("'")[0] for part in csp.split() if part.startswith("'nonce-")}
        check("web: scripts carry the response nonce", any(f'nonce="{n}"' in r.text for n in nonces) or "nonce=" in r.text)
        r2 = w.get("/login")
        check("web: nonce differs per request", r2.headers.get("content-security-policy") != r.headers.get("content-security-policy"))
        sw = w.get("/sw.js")
        check("web: service worker not cached by the browser", "no-cache" in sw.headers.get("cache-control", ""))

failed = [n for n, ok, _ in results if not ok]
print(json.dumps({"passed": len(results) - len(failed), "failed": failed}))
sys.exit(1 if failed else 0)
