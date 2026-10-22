# Session handoff: Roshana security, pen-test, performance and UI/UX pass

Written 2026-10-02 so another model or session can continue the work. Read it top to bottom before you start.

## 1. What the user asked for

The user's request, verbatim:

> use red team agents and blue team agents and security skills to audit and solve all problems and of course do pen test for this project, also add performance to all security things. and for ui/ux use /apple-design you can use how much tokens you want just try to finish all works under 5 hours

What that means in practice:

1. **Red team.** Find and prove vulnerabilities, including a live pen test against the running API and web app.
2. **Blue team.** Fix every confirmed issue, with a regression test for each.
3. **Performance.** Every security fix must also be checked for cost. Examples are bcrypt cost, rate-limiter overhead, query count, and bundle size. Fix performance problems found along the way.
4. **UI/UX.** Apply the `apple-design` skill to the frontend. It covers springs, interruptibility, press feedback, materials, reduced motion and typography.
5. **Budget.** Token cost is not a constraint. The target is to finish within about 5 hours of wall-clock time.

## 2. Status

**Nothing has been changed in the codebase yet.** No fixes were written, no agents or workflows were launched, and no live exploit was run.

Done so far:

- Read almost all of the backend and the core frontend files. Section 7 lists what is still unread.
- Started the backend locally for pen testing. It is still running.
- Backed up the SQLite database before any testing.
- Installed bandit, pytest, pytest-asyncio and httpx into the backend venv.
- Ran bandit on the backend. It reported zero issues.
- Loaded the `apple-design` skill and noted its rules. Section 6 applies them.
- Built a preliminary findings list from code reading. Section 5 has it.

Not done:

- `pip-audit` could not be installed. The background job was killed because the machine ran low on memory.
- `npm audit` ran but wrote empty output, so there is no result.
- No red-team verification of the findings.
- No blue-team fixes or tests.
- No UI/UX changes.
- No frontend dev server has been started.

## 3. Environment state

| Item | Value |
|---|---|
| Repo | `/home/makhataei/Projects/Mine/Roshna-Baro` |
| Branch | `main`, one commit `ff90c8f MVP` |
| Git status | `AD main.py` (a root `main.py` was staged then deleted on disk), `?? skills-lock.json` |
| Backend | Running on `127.0.0.1:8036` |
| Backend DB | `backend/data/glow.db`, gitignored and not tracked |
| DB backup | `/tmp/claude-1000/-home-makhataei-Projects-Mine-Roshna-Baro/67f950de-6e8a-4ac8-be73-4fb99301766f/scratchpad/glow.db.bak` |
| Backend venv tools | bandit 1.9.4, pytest 9.1.1, pytest-asyncio 1.4.0, httpx 0.28.1 |
| Frontend | `node_modules` present, Next 15.1.6, React 19.0.0, an old `.next` build exists |
| Node / Python | Node 24.21.0, Python 3.12.3, uv 0.12.17 |
| Demo login | `demo@glow.ir` / `glow1234` |
| graphify | No `graphify-out/` exists, so the graphify rules in CLAUDE.md do not apply yet |

**Machine constraints that will bite you:**

- The host is shared with many other Claude sessions. Free memory is around 1 GB, and background jobs get killed under memory pressure. Keep the number of parallel agents small and avoid heavy builds running at the same time.
- Direct PyPI downloads time out. Use the Tsinghua mirror.
- The `.venv/bin/uvicorn` shim fails with "No such file or directory". Use `python -m uvicorn` instead.

Useful commands:

```bash
# start / stop the backend
cd backend && setsid nohup .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8036 > /tmp/roshana-api.log 2>&1 &
pkill -f "uvicorn app.main:app --host 127.0.0.1 --port 8036"

# install Python packages (direct PyPI times out)
uv pip install --python backend/.venv/bin/python --index-url https://pypi.tuna.tsinghua.edu.cn/simple pip-audit

# restore the DB after destructive pen-test steps
cp /tmp/claude-1000/-home-makhataei-Projects-Mine-Roshna-Baro/67f950de-6e8a-4ac8-be73-4fb99301766f/scratchpad/glow.db.bak backend/data/glow.db

# frontend dev server
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8036 npm run dev   # port 3036
```

The CORS setting in `docker-compose.yml` only allows ports 3036, but `config.py` defaults to port 3000. The wildcard bug in finding S1 currently hides this mismatch.

## 4. Project map

**Stack.** A Persian-first fertility tracking app, a clone of Glow localised for Iran. Backend is FastAPI with SQLModel, async SQLite and JWT. Frontend is Next.js 15 App Router with React 19, Tailwind v4, Framer Motion and a PWA service worker. It supports Persian RTL and English LTR, and light and dark themes.

**Backend files** under `backend/app/`: `main.py` (app, CORS, seed), `config.py`, `security.py` (bcrypt, JWT), `db.py`, `models.py`, `schemas.py`, `prediction.py` (fertility engine), `seed_data.py`, and routers `auth.py`, `tracking.py`, `care.py`.

**API endpoints:**

```
POST /api/auth/register      POST /api/auth/login (form)     GET|PATCH /api/auth/me
GET|POST /api/cycles         DELETE /api/cycles/{id}
GET /api/logs                PUT /api/logs (upsert by date)
GET /api/insights            (prediction + 60-day calendar + insights)
GET /api/clinics?city=&service=      GET /api/articles?category=
GET /api/pregnancy/week/{week}       GET /api/pregnancy/timeline?last_period=YYYY-MM-DD
GET /api/fund   POST /api/fund/join?monthly_amount=   POST /api/fund/leave
GET /api/stats/community     GET /api/health     GET /docs (OpenAPI, public)
```

**Frontend files:** `app/layout.tsx`, `app/page.tsx` (landing), `app/login/page.tsx`, `app/(app)/{dashboard,cycle,insights,pregnancy,clinics,fund,learn,settings}/page.tsx`, `components/{ui,shell,providers,aurora,cycle-ring,icons}.tsx`, `lib/{api,i18n}.ts`, `public/sw.js`, `public/manifest.webmanifest`.

## 5. Preliminary findings

**Every item here comes from reading the code. None has been proven with a live exploit, and none has been fixed.** The next session should verify each one before fixing it. Severities are estimates.

### 5.1 Security: backend

| ID | Sev | Where | Issue | Proposed fix | Performance note |
|---|---|---|---|---|---|
| S1 | High | `backend/app/main.py:64` | CORS appends `"*"` to the allowed origins while `allow_credentials=True`. Any website can call the API from a browser, which defeats the configured allow-list. | Remove `+ ["*"]`. Read the origins from env only. | None |
| S2 | Critical | `backend/app/config.py:7`, `docker-compose.yml:7` | The JWT secret has a public default value. If the env var is not set, anyone can forge a token for any email. | Refuse to start when the key is the default or shorter than 32 bytes, unless an explicit dev flag is set. | None |
| S3 | High | `backend/app/routers/auth.py:32-37` | No rate limiting on login or register. Brute force is possible, and each bcrypt check costs about 250 ms of CPU, so floods are a cheap DoS. | Add an in-memory per-IP and per-email limiter, with no new dependency if possible. Return 429 with `Retry-After`. | Reject before bcrypt runs. Measure the added latency. |
| S4 | Medium | `backend/app/routers/auth.py:16-18`, `:34-35` | User enumeration. Register says "Email already registered". Login skips bcrypt when the user does not exist, which creates a timing difference. | Verify against a dummy hash when the user is missing. Consider a generic register response. | One extra bcrypt per failed login, already bounded by S3. |
| S5 | Medium | `backend/app/schemas.py:7-13` | No password policy on the server. Only the frontend checks `minLength=6`. bcrypt silently truncates passwords past 72 bytes. | Enforce a length range of 8 to 72 bytes in the Pydantic schema. | None |
| S6 | Medium | `backend/requirements.txt` | `python-jose` 3.3.0 has known CVEs, CVE-2024-33663 and CVE-2024-33664. HS256 is pinned at decode, which limits the first one. `passlib` 1.7.4 is unmaintained. | Move to PyJWT. Optionally use `bcrypt` directly instead of passlib. Run pip-audit. | None |
| S7 | Medium | `backend/app/config.py:8`, `backend/app/security.py:27-29` | Tokens live 14 days with no revocation, no `iat`, and the email is the subject. `datetime.utcnow` is deprecated. | Shorter expiry, add `iat`, use the user id as subject, and use timezone-aware datetimes. | None |
| S8 | High | `backend/app/main.py:28-45`, `frontend/app/login/page.tsx:57` | The demo account with public credentials is seeded in every environment, including production. Anyone can read and write its health data. | Gate seeding and the demo button behind a `DEMO_MODE` env flag that defaults to off. | None |
| S9 | Medium | `backend/app/schemas.py:34-61`, `backend/app/routers/tracking.py:29-35` | No input bounds. Free-text fields like note, mood, symptoms and display name have no length limit. Temperature, cycle lengths and birth year are unbounded. A period end before its start is accepted. Users can create unlimited cycles and logs. | Add `Field` constraints and `Literal` enums for goal, locale, flow and mood. Cap cycles and logs per user. | Unbounded rows also slow down S/P1. |
| S10 | Medium | `backend/app/routers/care.py:73` | `monthly_amount` on fund join is an unvalidated query integer. It can be negative or huge, and a huge value raises a 500. | Bound it to the allowed tiers. | None |
| S11 | Low | `backend/app/routers/care.py:43-46` | A `last_period` near the maximum date makes `+ timedelta(280)` overflow, which raises a 500. Future dates are also accepted. | Restrict `last_period` to the past 300 days. | None |
| S12 | Low | `backend/app/routers/care.py:99-109` | The public community stats endpoint adds a fixed offset to real counts. Anyone can subtract it to learn the real number of users. The figures are also invented, including "accuracy 93". | Remove the endpoint or return honest figures only. This is a product decision. | None |
| S13 | Low | `backend/app/main.py:56-61` | `/docs` and `/openapi.json` are public in production. | Disable them unless in dev. | None |
| S14 | Medium | backend and `frontend/next.config.mjs` | No security headers anywhere: no CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` or frame-ancestors. Next also sends `X-Powered-By`. | Add a small headers middleware to FastAPI and `headers()` plus `poweredByHeader: false` in Next. | Negligible |
| S15 | Low | `backend/Dockerfile`, `frontend/Dockerfile` | Both containers run as root. | Add a non-root `USER`. | None |

### 5.2 Security: frontend

| ID | Sev | Where | Issue | Proposed fix |
|---|---|---|---|---|
| F1 | Critical, verify first | `frontend/package.json` | Next 15.1.6 with React 19.0.0 on the App Router falls in the range affected by CVE-2025-55182, the React Server Components remote-code-execution bug. It also predates the CVE-2025-29927 middleware bypass fix, though this app has no middleware. | Run `npm audit` and upgrade to the latest patched 15.x release of Next and the matching React 19 patch. Rebuild and smoke-test every page. |
| F2 | High | `frontend/app/login/page.tsx:59-62` | Opening `/login?demo=1` logs the visitor into the shared demo account, even if they are already signed in. An attacker can send that link to a victim. The victim then logs intimate health data into an account the attacker can read. | Remove the auto-login on query parameter, or at least require a click and never replace an existing session. |
| F3 | Medium | `frontend/lib/api.ts:4-15` | The JWT is stored in localStorage for 14 days, so any XSS can steal it. | Ideally move to an httpOnly cookie with CSRF protection. At minimum shorten the expiry and ship a strict CSP. |
| F4 | Medium | `frontend/app/layout.tsx:28-33` | Fonts load from Google Fonts. That leaks the IP of every user of a health app to a third party. It may also be slow or blocked in Iran. | Self-host Vazirmatn and Inter with `next/font/local`. This also improves performance. |
| F5 | Low | `frontend/public/sw.js:2`, `:20-32` | The cache name never changes, so users keep a stale app after a deploy. Caches are not cleared on logout. API calls are excluded from the cache, which is correct. | Version the cache name from the build ID and clear it on sign-out. |
| F6 | Low | `frontend/lib/api.ts:17-32` | No global 401 handling. An expired token leaves pages spinning or broken. | On 401, clear the token and route to `/login`. |
| F7 | Info | `frontend/app/layout.tsx:34`, `:41-45` | Inline scripts use `dangerouslySetInnerHTML`, but only with static strings. That is safe today, but a CSP will need hashes or nonces for them. | Hash them in the CSP. |
| F8 | Medium, honesty | `frontend/lib/i18n.ts:40-41`, `:214-215` | The privacy copy promises end-to-end encryption of health data and one-tap export and account deletion. Neither exists: the database is plain SQLite and there is no delete or export endpoint. | Either build delete and export endpoints, which also helps GDPR-style rights, or change the copy. Ask the user. |

### 5.3 Correctness bugs found along the way

| ID | Where | Bug |
|---|---|---|
| B1 | `frontend/app/(app)/dashboard/page.tsx:22-31` together with `backend/app/routers/tracking.py:61-62` | **Data loss.** A quick-log button sends a full log with empty defaults, and the upsert overwrites every field. Tapping "intercourse" erases the temperature, mood and symptoms already logged that day. Fix with a partial update on the backend that uses `exclude_unset`. |
| B2 | `frontend/app/(app)/cycle/page.tsx:27`, `:105`, `frontend/app/(app)/dashboard/page.tsx:23` | "Today" is computed with `toISOString()`, which is UTC. In Iran, at UTC+3:30, entries made between midnight and 03:30 land on the previous day. Use the local date. |
| B3 | `backend/app/models.py:32-42` | There is no unique constraint on user and log date. Two concurrent saves can create duplicate rows for one day. |
| B4 | `backend/app/prediction.py:137` | The referral rule uses `date.today()` instead of the `today` argument, so tests cannot pin the date. |
| B5 | `frontend/app/(app)/dashboard/page.tsx:19`, `:33-39`, and cycle and settings saves | Errors are swallowed with an empty catch. A failed load shows an endless spinner, and a failed save shows nothing. |
| B6 | `frontend/app/(app)/cycle/page.tsx:231` | Deleting a period entry happens instantly with no confirmation and no undo. |

### 5.4 Performance

| ID | Where | Issue | Fix |
|---|---|---|---|
| P1 | `backend/app/prediction.py:102`, `backend/app/routers/tracking.py:16-21` | Each `/api/insights` call loads all of the user's cycles and logs. The calendar loop then scans every cycle for each of 60 days. Cost grows with the user's whole history. | Load only the last 12 months. Precompute period ranges once. |
| P2 | `backend/app/routers/care.py:22`, `:32` | Clinics and articles load every row and filter in Python. The article list returns full bodies. | Filter in SQL. Return excerpts in the list and bodies on a detail endpoint. |
| P3 | `backend/app/db.py:12` | SQLite runs without WAL mode, so writes block reads. | Enable WAL and a busy timeout on connect. |
| P4 | `frontend/app/globals.css:69-75`, `:103-129`, `frontend/components/aurora.tsx` | Every card uses a 28 px backdrop blur. Three full-screen 80 px blurred blobs animate forever, and a full-screen noise layer uses a blend mode. This is heavy on the low-end Android phones common in Iran. | Reduce blur, pause the aurora when the tab is hidden, and honour reduced transparency. |
| P5 | `frontend/app/layout.tsx:30-33` | Google Fonts loads five weights of two families as render-blocking CSS. | Self-host a subset with `next/font/local`, the same fix as F4. |
| P6 | `frontend/app/(app)/cycle/page.tsx:111-116` | 42 calendar cells each run their own Framer Motion animation with a staggered delay. | Animate the grid container once, or use CSS. |

### 5.5 Checked and not vulnerable

- Deleting a cycle checks ownership, so there is no IDOR there (`backend/app/routers/tracking.py:41`).
- Log upserts and reads are scoped to the current user.
- `PATCH /api/auth/me` cannot set `is_premium` or `fund_member`, because `UserUpdate` does not contain them.
- No user-supplied data is rendered as raw HTML anywhere in the frontend.
- No raw SQL. Every query goes through SQLModel.
- Bandit reported zero issues on `backend/app`.

## 6. UI/UX gaps against the apple-design skill

The UI already uses springs, press-down feedback, shared-element pills and glass surfaces. These are the gaps found so far:

| ID | Where | Gap |
|---|---|---|
| U1 | `frontend/components/shell.tsx:160` | **Wayfinding bug.** The mobile tab bar shows only the first six of eight items. Learn, Settings and Logout cannot be reached on mobile. |
| U2 | `frontend/components/shell.tsx:159-181` | Mobile tabs are icons only. Apple tab bars show a short label under each icon. |
| U3 | `frontend/app/globals.css:167-173` | Reduced motion only stops CSS animations. Framer Motion springs still run. Wrap the app in `MotionConfig reducedMotion="user"`. |
| U4 | `frontend/app/globals.css` | No support for `prefers-reduced-transparency` or `prefers-contrast: more`. The skill asks for solid surfaces and stronger borders in those modes. |
| U5 | `frontend/components/providers.tsx:52-56` | The theme switch is an instant brightness jump. The skill asks for an eased dark and light change. |
| U6 | `frontend/components/ui.tsx:7-8` | Springs use stiffness and damping values that give damping ratios of about 0.87 and 0.97. The skill's default is a critically damped spring with a response around 0.3 to 0.4 seconds, with bounce only after a flick. |
| U7 | `frontend/components/shell.tsx:28`, `:51-67` | The theme button label is English only. Language buttons lack `aria-pressed`. |
| U8 | `frontend/app/login/page.tsx:120-123`, `frontend/app/(app)/settings/page.tsx:58`, `frontend/app/(app)/cycle/page.tsx:218` | `type="number"` can reject Persian digits typed on a Persian keyboard. The date input shows a Gregorian picker, while Iranian users expect Jalali dates. |
| U9 | Dashboard and pages | Loading uses spinners instead of skeletons, and saves give feedback only through a small text flash. |
| U10 | `frontend/lib/i18n.ts:57`, `:69`, `backend/app/routers/auth.py:18`, `:36` | The copy uses «رایانامه» for email. The user's Persian UX vocabulary reference says users don't know this word and to use «ایمیل» instead. |

## 7. Files not read yet

Read these before the UI/UX pass:

- `frontend/app/page.tsx`, the landing page
- `frontend/app/(app)/{insights,pregnancy,clinics,fund,learn}/page.tsx`
- `frontend/components/cycle-ring.tsx` and `frontend/components/icons.tsx`
- `frontend/lib/i18n.ts`, apart from lines 1-40 and 340-374
- `backend/app/seed_data.py`, lines 40-100

## 8. Suggested plan for the next session

Keep parallelism low, at four agents or fewer, because of the memory limit.

1. **Dependency triage, about 20 minutes.** Install `pip-audit` through the mirror and run it. Run `npm audit`. Upgrade Next and React for F1 first, since it is the only likely critical issue. Swap `python-jose` for PyJWT.
2. **Red team, about 60 minutes.** Verify each item in section 5 against the live API on port 8036. Save each proof as a curl command or a small Python script. Try the items code reading could not settle, such as CORS behaviour from a foreign origin, a forged JWT using the default secret, the login timing gap, oversized payloads, and the `?demo=1` session swap. Restore the DB backup afterwards.
3. **Blue team, about 90 minutes.** Fix the confirmed issues with the smallest diffs. Add one pytest file under `backend/tests/` with a regression test per fix, using httpx `ASGITransport` against a temporary DB. Measure login and insights latency before and after, so the performance cost of each fix is recorded.
4. **Pen-test re-run, about 30 minutes.** Re-run every proof from step 2. Each should now fail.
5. **UI/UX, about 60 minutes.** Read the files in section 7. Fix U1 to U10 and P4 to P6 using the apple-design rules. Run `npm run build`. Check RTL and LTR, light and dark, at 375 px and desktop widths.
6. **Report.** Summarise findings, fixes, test results and before-and-after numbers. Do not commit unless the user asks. If they ask, commit on a new branch, not `main`.

## 9. Questions for the user

- Should the demo account and the `?demo=1` link exist in production at all?
- Should the privacy copy be changed, or should account deletion and data export be built?
- Should the invented community statistics be removed?
- Is moving the token from localStorage to an httpOnly cookie in scope? It changes the auth flow on both sides.
