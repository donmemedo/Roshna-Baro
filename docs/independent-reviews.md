# Independent reviews and what was done about each

Three reviewers read the hardened code read-only (red/blue backend review, tech lead + QA + product owner, container and DevSecOps). Their findings are listed with the outcome. "Open" items are real and not yet done.

## Red / blue team (backend)

| ID | Sev | Finding | Outcome |
|---|---|---|---|
| R-1 | High | SQLite reuses the highest user id after a delete; a deleted account's token could unlock the next person to register | **Fixed.** `AUTOINCREMENT` plus rejecting tokens issued before the account existed. Test `test_r1_*` |
| R-2 | High (IPv6) | Rate limits keyed on the full address; an IPv6 /64 gives an attacker unlimited buckets; no per-account limit | **Fixed.** Grouped by /64, 30 failures per hour per account from any address, cap on simultaneous hashes. Tests `test_r2_*` |
| R-3 | Medium | Behind a proxy every user shares one address, so limits become global | **Fixed in compose** (`FORWARDED_ALLOW_IPS`). Operators must set it to the proxy address |
| R-4 | Medium | No request-size limit | **Fixed.** 64 KiB, enforced on `Content-Length` and while streaming |
| R-5 | Medium | No logout, revocation, password change; delete and export needed only the token | **Partly fixed.** Delete now needs the password. Revocation and password change are **open** (needs a token version) |
| R-6 | Medium | SQL error text carried bound values into logs | **Fixed.** `hide_parameters=True`. Test `test_r6_*` |
| R-7 | Low-Med | A pooled DB connection was held during the slow hash | **Fixed.** Connection released before hashing |
| R-12 | Medium | Commit security review: the per-account failure cap could be used to lock the owner out | **Fixed.** Addresses that already signed in to the account are exempt from the account cap. Test `test_r2b_*`. Residual: an owner on a new address can be delayed up to an hour |
| R-13 | High | Second commit review: the per-account cap was checked before the password and recorded only after it, so a burst of concurrent guesses all passed the check; the known-address list was one global list an attacker could flood to push owners out | **Fixed.** The slot is reserved atomically before any await and refunded on success; known addresses are kept per account (10 each). Tests `test_r2c_*`, `test_r2d_*`, `test_r2e_*` (the first proved the bypass: 12 of 12 guesses got through a cap of 3) |
| R-8 | Low-Med | Sign-up reveals that an e-mail exists | **Accepted**, throttled per /64. Needs e-mail verification |
| R-9 | Low | Duplicate cycles possible under concurrency | **Fixed.** Unique index, 409 on conflict |
| R-10 | Low | `birth_year` could not be cleared; pregnancy date in the URL | **Fixed.** Partial update with explicit nulls; timeline is now POST |
| R-11 | Low | No hashed lockfile, no digest pin, no concurrency limit | **Partly fixed.** `--limit-concurrency`, keep-alive timeout, multi-worker warning. Hashed lockfile and digest pins **open** |

Blue-team detection recommendations (**open**, roadmap): emit authentication events (success, failure, 409, 429) keyed by an HMAC of the e-mail and the /64 bucket; alert on failures spread over many buckets for one account; alert on CPU, memory, login p95 latency, `internal_error` rate and "database is locked"; log export followed by delete from a new address.

## Tech lead

| Suggestion | Outcome |
|---|---|
| Adopt a migration tool (Alembic) | **Open.** The startup DDL is a stop-gap |
| Backups and log rotation | **Done.** `python -m app.backup`, log rotation in compose. Scheduling the backup is **open** |
| Proxy-aware client address | **Done** |
| Check-then-insert races (cycles, fund) | **Done.** Unique indexes and conflict handling |
| One clock module so tests can freeze time | **Done** (`app/clock.py`) |
| Request id in every log line | **Done** |
| Frontend signs the user out when offline | **Fixed.** Only a rejected token ends a session |
| Frontend overwrote saved language/theme on first render | **Fixed** |
| `/api/v1` prefix, move to Postgres, background jobs | **Documented triggers**, none needed yet (see `architecture.md`) |
| No frontend tests | **Open.** `frontend/scripts/visual-check.mjs` is the only automated UI check |

Ponytail (over-engineering) review, net about 105 lines possible. Applied: removed the baseline-only branch in the test fixture and the unused spinner. Open, deliberately not applied without your say-so because they change the API or schema: unused `is_premium`, `User.fund_member` duplicating `FundMembership.active`, always-true `Clinic.verified`, gzip (kept, no proxy is guaranteed), hand-rolled digit conversion, and the offline shell in the service worker (kept for the planned PWA).

## QA lead

Bugs found by reading the code, all **fixed**: logging a period on the dashboard never changed the prediction (it set a flag the engine ignores, so it now starts a cycle); a mistyped temperature erased the saved value; double-tapping Save showed a false error; the calendar showed Gregorian day numbers next to Jalali dates; the ring ignored the user's period length; the pregnancy page pre-filled a date so everyone saw a due date; trimester 3 started at week 27 in the UI and 28 in the API.

Still **open**: a period that is more than a week late is shown as "next period tomorrow" with no lateness message; users whose goal is not to conceive still see a conception percentage; pages left open past midnight keep yesterday's date; the calendar has no month navigation; dialogs have no full focus trap; no automated browser tests (Playwright) or frontend unit tests.

## Product owner

Done: removed claims the product cannot back up (specialist review, "thousands of members", premium features that do not exist, "93 percent accuracy", "complete privacy"); added a medical disclaimer under every prediction; disclosed that partner clinics have a discount agreement.

Decisions that only the owner can make: whether the seeded clinic names, ratings and discounts are real; legal review of the support fund (it resembles insurance); whether conception odds should be hidden when the goal is "track" or "pregnancy"; minimum age and consent text; which clinician owns the "see a specialist" rules (currently 24-day and 33-day cycles trigger a warning); account recovery method (e-mail or SMS code); Jalali as the primary date input.

## Containers and CI

| Item | Outcome |
|---|---|
| Log rotation, tmpfs size limits, proxy address and CSP settings in compose | **Done** |
| npm and yarn removed from the frontend runtime image, pip removed from the backend image | **Done** |
| `.dockerignore` patterns for nested caches | **Done** |
| CI: gitleaks as CLI (action needs a licence for organisations), Semgrep with metrics off, Trivy DB mirror, cache key, `--omit=dev`, timeouts, no persisted credentials, weekly schedule, boot smoke test | **Done** |
| Pin images by digest and actions by commit SHA, hashed lockfile, SBOM and signing, hadolint, CodeQL, nightly DAST | **Open** (Dependabot keeps pins current once set) |
| Existing named volume from the old project name | Copy the old `glow.db` (and `-wal`) into the new volume or remove the stale volume, otherwise the database opens read-only |
