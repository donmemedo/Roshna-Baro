# LAST_Report: security, penetration test, performance and UX pass

Project: Roshana (روشنای باروری), FastAPI backend and Next.js 15 frontend. Branch `security-hardening-and-ux`.
This report covers the whole job, from the first session to the last step. Detailed material is in `docs/`.

## 1. What you asked for

Audit the project with red team and blue team tactics, penetration test it, treat performance as part of every security fix, improve the UI/UX with the apple-design skill, use the listed security skills, build and run it, review it from the PO, Tech Lead, Red, Blue and QA angles, and finish with a pull request on a new branch.

## 2. Honest status

| Area | Status |
|---|---|
| Backend audit and fixes | **Done.** 33 findings fixed or mitigated, each with a regression test |
| Penetration test | **Done locally.** 41 of 41 live checks pass; baseline failed 29 of 36 tests |
| Independent reviews (red/blue, tech lead, QA, PO, DevSecOps) | **Done.** Confirmed findings fixed; open items in `docs/independent-reviews.md` and section 7. A post-push security review also flagged an owner lock-out risk in the per-account limit, now fixed |
| Performance | **Done and measured** (section 5) |
| UI/UX with apple-design | **Done** (section 6). Jalali date picker not built |
| Production build and run | **Done.** Backend and frontend ran locally; browser run: 43 pages, 0 errors, screenshots in `docs/screenshots/` |
| Docker images | **Not built.** The Docker daemon is not running on this machine. Compose file validates with `docker compose config` |
| graphify knowledge graph | **Done** (AST-only update). `graphify-out/graph.json` and `GRAPH_REPORT.md` are committed |
| Documentation | **Done.** `docs/README.md` indexes architecture, threat model, red team report, independent reviews, performance, UX, QA plan, DevSecOps and deployment |
| APK / IPA / PWA packaging | Not started; you said web app first. The PWA service worker is already in place |

## 3. Timeline of the work

1. **First session (2026-10-02).** Read the code, ran Bandit (0 issues), wrote a preliminary findings list in `SESSION_HANDOFF.md`. No code changed.
2. **Setup.** New branch `security-hardening-and-ux`. Removed a stray `main.py` that was staged by mistake.
3. **Red team first.** Wrote 36 security tests that assert the secure behaviour. On the original code **29 failed, 7 passed** (the 7 are controls that already held). Dependency audits on the original code: `pip-audit` 34 vulnerabilities in 4 packages, `npm audit` 1 critical and 3 high.
4. **Blue team.** Rewrote the backend (section 4), upgraded dependencies, hardened Docker and CI, rewrote much of the frontend.
5. **Independent reviews.** Three reviewers read the code. The red-team reviewer found a real high-severity bug I had missed (user ids reused after deletion). All confirmed items were fixed and tested.
6. **Re-test.** Backend suite, type check, production build, live probe against the running stack.

## 4. Security work

Findings use the IDs from `docs/red-team-report.md`.

| Area | Fixed |
|---|---|
| Secrets and config | Weak or default `SECRET_KEY` stops startup; wildcard CORS stops startup; demo account only with `DEMO_MODE`; API docs off by default |
| Authentication | PyJWT (HS256 pinned, required claims), numeric subject, `iat`, 7-day expiry, bcrypt in a thread pool, password 8 to 72 bytes, timing equalised for unknown users, e-mail case-insensitive |
| Abuse limits | Login 8 per 5 min per address and e-mail, 40 per 5 min per address, 30 failures per hour per account from any address (addresses that already signed in to that account are exempt, so strangers cannot lock the owner out), 10 sign-ups per hour per address, IPv6 grouped by /64, cap on simultaneous hashes, write limit per user |
| Input | Every field bounded or an enum; dates in range; per-user caps (600 cycles, 20 000 logs); 64 KiB body limit checked while streaming; fund tiers only |
| Data integrity | Partial log updates (a quick tap no longer erases temperature or notes), unique indexes for day, cycle and fund membership, duplicate-race handling |
| Privacy | Export and permanent account deletion (password required) now exist; copy no longer claims end-to-end encryption; no IPs, query strings or bodies in logs; SQL errors hide bound values; pregnancy date moved out of the URL |
| Headers and CSP | API security headers; strict per-request nonce CSP on pages; no third-party fonts (self-hosted) |
| Session safety | `?demo=1` no longer signs anyone in; expired token signs out once; a network failure no longer signs the user out; service worker versioned and cleared on sign-out |
| Supply chain | Python runtime closure clean after upgrade (was 34 findings). `npm audit`: **0** (was 1 critical, 3 high) after Next 15.5.28, React 19.1.10 and a pinned nested PostCSS |
| Containers and CI | Non-root, read-only root filesystem, no capabilities, resource limits, log rotation, tmpfs limits, pip and npm removed from runtime images; CI with lint, Bandit, pip-audit, npm audit, type check, build, gitleaks, Semgrep, Trivy and a boot smoke test; weekly schedule; Dependabot |

Static analysis: Bandit 0 issues, Ruff clean.

## 5. Performance, measured (CPU time, stable under a loaded host)

| Operation | Before | After |
|---|---|---|
| Insights, 3 years of history | 54 ms | 19 ms |
| Insights, 20 000 logs | 965 ms | 23 ms |
| Log list, 20 000 rows | 1 426 ms | 23 ms |
| Login (bcrypt cost 12, unchanged) | 429 ms | 451 ms |
| Health check (security middleware and JSON log added) | 1.2 ms | 2.1 ms |
| Rate limiter, one call | none | 2.2 microseconds |
| Rejected login (429) versus a real attempt | n/a | 3.5 ms versus 461 ms |

The security controls cost about one millisecond per request. Throttling before hashing makes a login flood about 130 times cheaper to absorb. Bundle: first-load JavaScript 159 to 166 kB per page. Frontend cost cuts: lighter blur on phones, no grain layer on phones, ambient animation paused in hidden tabs, one grid animation instead of 42, and no render-blocking font stylesheet.

Raw numbers: `docs/evidence/bench-compare.json`, `docs/evidence/ratelimit-bench.json`. Reproduce with `backend/scripts/bench.py`.

## 6. UI/UX (apple-design)

| Change | Why |
|---|---|
| Mobile tab bar: four labelled tabs plus a "More" bottom sheet | Learn, Settings and Logout were unreachable on phones |
| Critically damped springs (bounce 0, 0.4 s), sheet with a small bounce, flick-projection dismiss, symmetric enter/exit path | Apple's default and drawer values |
| Reduced motion (cross-fades), reduced transparency (solid surfaces), more contrast | Three independent accessibility signals |
| Eased light/dark change | No abrupt brightness jump |
| Skeletons, error states with retry, inline delete confirmation | Replaced endless spinners and silent failures |
| Persian digits accepted in number fields; local dates (UTC+3:30 safe); Jalali day numbers in the calendar | Real Persian keyboard behaviour |
| Size-specific type tracking and Persian-friendly line height | Apple typography rule |
| Vocabulary: «ایمیل» instead of «رایانامه», «نادرست» for errors, one error code per message in both languages | Your Persian UX reference |
| Medical disclaimer under predictions; unbacked claims removed (specialist review, thousands of members, 93 percent accuracy, premium features) | Product risk review |

## 7. Residual risks and open decisions

- **Tokens are not revocable** before expiry. Needs a token version when a password-change feature is built. Token still sits in `localStorage` (strict CSP mitigates); `HttpOnly` cookie needs a same-site deployment.
- **No encryption at rest.** Encrypt the volume and backups. Backup tool: `python -m app.backup`.
- **Sign-up reveals that an e-mail exists** (409). Needs e-mail verification.
- **Rate limits are per process.** Move to Redis before running more than one replica. Behind a proxy set `FORWARDED_ALLOW_IPS`.
- **No migrations tool.** Adopt Alembic before the first schema change after launch.
- **Not done:** Jalali date picker, hashed dependency lockfile, image digest pinning, SBOM and signing.
- **Owner decisions:** seeded clinic names and discounts look real and need your confirmation; the support fund needs legal review; conception percentage for users whose goal is not conceiving; minimum age; who clinically owns the "see a specialist" rules.

## 8. Safeguards, limits and memory

- Three of my responses were withheld by a safety classifier earlier in the session. I did not repeat the withheld content. I kept all testing local (in-process and localhost only) and expressed findings as regression tests. Recon tooling from the red-team skills (subdomain and host discovery, scanners aimed at networks) does not apply to a localhost app and was not run.
- Several usage limits interrupted the work; each time it resumed from the committed state.
- Model: I stayed on the model the session gave me and did not switch.
- Memory: the project memory folder was empty. The only carried state was `SESSION_HANDOFF.md`, kept at `docs/history/SESSION_HANDOFF.md`.
- A safety check blocked one command that removed a file through a shell wrapper. I did not work around it and did not need the removal.

## 9. How to run

```bash
cp .env.example .env            # then set SECRET_KEY (openssl rand -base64 48)
docker compose up --build       # web http://localhost:3036, API http://localhost:8036

# without Docker
cd backend && APP_ENV=dev .venv/bin/python -m uvicorn app.main:app --port 8036
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8036 npm run build && npx next start -p 3036

# checks
cd backend && .venv/bin/python -m pytest          # 74 tests
cd backend && python scripts/live_probe.py http://127.0.0.1:8036 http://localhost:3036
cd frontend && node scripts/visual-check.mjs http://localhost:3036 http://localhost:8036 ./shots
```

## 10. Evidence index

`docs/evidence/`: baseline test results, `pip-audit` and `npm audit` before and after, benchmark and limiter numbers, live probe output. `docs/architecture.md`, `docs/threat-model.md` (attack trees), `docs/red-team-report.md`.
