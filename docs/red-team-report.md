# Red team report

**Scope:** the user's own project, tested locally only (in-process against the ASGI app and a scratch database, never a network target).
**Method:** manual code review of every backend and frontend file, SAST (Bandit), dependency audits (`pip-audit`, `npm audit`), and every finding turned into an executable test in `backend/tests/test_security.py`. The tests assert the *secure* behaviour, so a failing test on the original code is the proof of the weakness.
**Baseline:** the original commit `ff90c8f` failed **29 of 36** security tests (see `evidence/baseline-pentest-summary.txt`). After hardening, all pass.

Severity is the reviewer's estimate for a health-data product. "Fixed" means a regression test exists unless noted.

## Backend findings

| ID | Sev | Finding | Impact | Status |
|---|---|---|---|---|
| S1 | High | CORS list ended with `"*"` while credentials were allowed | Any website could call the API from a victim's browser | **Fixed.** Explicit origins only, credentials off, a wildcard now stops startup |
| S2 | Critical | The JWT secret had a public default (also baked into `docker-compose.yml`) | Anyone could mint a token for any account if the variable was unset | **Fixed.** Weak or short secrets stop startup outside `APP_ENV=dev` |
| S3 | High | No limit on login or register | Password guessing; each attempt cost ~450 ms CPU, so floods were cheap DoS | **Fixed.** 8 tries/5 min per ip+email, 40/5 min per ip, 10 sign-ups/h per ip; rejected before bcrypt |
| S4 | Medium | Unknown e-mail skipped the password hash | Timing oracle for account enumeration | **Fixed.** A dummy hash is always verified. Sign-up still says "already registered" (409): accepted for usability, rate-limited |
| S5 | Medium | No server-side password policy; bcrypt silently truncates after 72 bytes | Weak passwords; two long passwords could collide | **Fixed.** 8 to 72 bytes, enforced in the schema |
| S6 | Medium | `python-jose`, `passlib`, old Starlette and `python-multipart` | `pip-audit`: **34 known vulnerabilities in 4 packages** | **Fixed.** PyJWT and `bcrypt`, FastAPI 0.143, Starlette 1.8, multipart 0.0.32. Re-audit of the runtime closure: none |
| S7 | Medium | 14-day token with the e-mail as subject, no `iat`, naive UTC | Hard to reason about, no issue time | **Fixed.** 7 days (configurable), numeric `sub`, `iat`, timezone-aware. *Residual:* tokens are not revocable (see below) |
| S8 | High | Public demo credentials seeded in every environment | Anyone could read and write that account | **Fixed.** `DEMO_MODE` is off by default; the UI button needs the server flag |
| S9 | Medium | No bounds on free text, temperature, dates, row counts | Storage abuse, nonsense data, wrong predictions | **Fixed.** Field limits, enums, date range, 600 cycles and 20 000 logs per user |
| S10 | Medium | `monthly_amount` accepted any integer | Negative or huge values, a 500 on overflow | **Fixed.** Only the four published tiers |
| S11 | Low | `last_period` near the maximum date overflowed | 500 error | **Fixed.** Must be within the last 300 days |
| S12 | Low | Public stats added invented offsets to real counts (128 400 users, "93 % accuracy") | Misleading claims; the offset leaked the real user count | **Fixed.** Real counts only; the landing page hides them below 100 users |
| S13 | Low | `/docs` and `/openapi.json` public | Free reconnaissance | **Fixed.** Off unless `APP_ENV=dev` or `ENABLE_DOCS=true` |
| S14 | Medium | No security headers anywhere | Clickjacking, MIME sniffing, no CSP | **Fixed.** API middleware and Next headers; strict nonce CSP on pages |
| S15 | Low | Containers ran as root | Larger blast radius | **Fixed** in the Dockerfiles and compose file (not built on this host, see `pentest-results.md`) |
| N1 | Medium | Found during hardening: no request-size limit | Memory exhaustion by one large body | **Fixed.** 64 KiB, enforced on `Content-Length` and while streaming |
| N2 | Low | Found during hardening: default 422 responses echoed the submitted values | A rejected password would be returned in the response | **Fixed.** Error envelope drops input values |
| N3 | Low | Found during hardening: e-mail was case-sensitive | Duplicate accounts by changing case | **Fixed.** Lower-cased at the schema |
| N4 | Info | bcrypt ran on the event loop | One login stalled every other request for ~450 ms | **Fixed.** Runs in a thread pool |

Checked and **not** vulnerable: ownership check on `DELETE /cycles/{id}` (404, not 403), per-user scoping of logs, `PATCH /me` cannot set `is_premium`, no raw SQL, no raw HTML rendering of user data, algorithm-none and tampered tokens rejected, SQL metacharacters inert.

## Frontend findings

| ID | Sev | Finding | Status |
|---|---|---|---|
| F1 | Critical | Next 15.1.6 / React 19.0.0: `npm audit` reported **1 critical and 3 high** | **Fixed.** Next 15.5.28, React 19.1.10. `npm audit`: **0** after pinning the nested PostCSS |
| F2 | High | `/login?demo=1` signed the visitor into the shared demo account, even if already signed in | **Fixed.** The link only focuses the button; signing in needs a click; an existing session is never replaced |
| F3 | Medium | JWT in `localStorage` | **Not changed; mitigated.** Strict nonce CSP, 7-day expiry. Moving to an `HttpOnly` cookie needs a CSRF design and a same-site deployment: roadmap item |
| F4 | Medium | Google Fonts leaked every user's IP to a third party and may be blocked in Iran | **Fixed.** Vazirmatn and Inter are self-hosted |
| F5 | Low | Service-worker cache never versioned or cleared | **Fixed.** Versioned per build, network-first pages, cleared on sign-out, API never cached |
| F6 | Low | No global 401 handling | **Fixed.** Expired token signs the user out once |
| F7 | Info | Inline scripts would block a CSP | **Fixed.** Nonce on the one inline script; service worker registered from code |
| F8 | Medium | Copy promised end-to-end encryption and one-tap export/delete that did not exist | **Fixed.** Copy now says "encrypted in transit"; export and delete account are implemented in Settings |

## Residual risks (accepted, with owner action)

| Risk | Why accepted | Next step |
|---|---|---|
| Tokens are not revocable before expiry | Stateless design; account deletion does invalidate them | Add a `token_version` claim when a password-change or "sign out all devices" feature is built |
| Distributed credential stuffing and owner lock-out | Per-address, per-account (30 failures per hour) and /64 limits exist. Once a stranger trips the account cap, only addresses that never signed in are held back, so the owner on a known address is not locked out | Add a breached-password check at sign-up. An owner on a brand-new address can still be delayed for up to an hour during an attack |
| No encryption at rest | SQLite file on a volume | Encrypt the volume and backups (LUKS, cloud disk encryption); consider SQLCipher |
| Sign-up reveals that an e-mail exists | Better usability; throttled | Switch to e-mail verification when an e-mail service exists |
| `FORWARDED_ALLOW_IPS=*` while the port is public | Lets a client spoof the address header and defeat every per-address limit and the known-address exemption | Set it only to the proxy's exact address (documented in `deployment.md`) |
| Rate-limit state is per process | Single replica by design | Redis when scaling out |
| Container images not built or scanned on this host | Docker daemon not running here | CI builds, scans (Trivy) and boots them on every PR |

## Independent reviews

See `independent-reviews.md` for findings from the separate red-team, tech-lead, QA, product-owner and DevSecOps reviewers and what was done about each.
