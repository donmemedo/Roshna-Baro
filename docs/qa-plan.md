# QA plan

## What exists

| Layer | Where | Count |
|---|---|---|
| Security regression (red team as tests) | `backend/tests/test_security.py` | 43 test functions |
| API behaviour | `backend/tests/test_api.py` | 18 test functions |
| Fertility engine (pure functions) | `backend/tests/test_prediction.py` | 8 test functions |
| **Total collected by pytest** | | **77 cases** (parametrised tests expand) |
| Live black-box probe of a running stack | `backend/scripts/live_probe.py` | 41 checks |
| Real-browser sweep with screenshots | `frontend/scripts/visual-check.mjs` | 43 pages |
| Static checks | Ruff, Bandit, `tsc`, `pip-audit`, `npm audit` | in CI |

Run: `cd backend && pytest`. Tests use a temporary database and cheap bcrypt (`BCRYPT_ROUNDS=4`), so the suite takes about 10 to 45 seconds.

## Highest-value tests still missing

1. A frozen clock at 20:30 UTC (midnight in Tehran): dates one day ahead accepted, two days rejected.
2. A period many days late, and goals "track" and "pregnancy" still showing conception odds.
3. Expired token; the legacy-database startup path with duplicate rows, run twice.
4. `/api/ready` returns 503 with the database down; limiter behind `X-Forwarded-For`.
5. Engine edges: cycle lengths outside 15 to 60, temperature shift thresholds, leap-day cycles.
6. Pagination caps (`limit=0`, `limit=1001`), export of 20 000 logs.
7. OpenAPI schema snapshot compared with `frontend/lib/api.ts`.
8. Playwright smoke: sign up, log a period, export, delete account.
9. Unit tests for `parseDecimal` and `normalizeDigits` ("۳۶٫۶", "36,6", "36/6", "abc").

## Manual exploratory checklist

- **RTL/LTR:** toggle on every page and hard reload; arrows mirror; phone numbers and e-mail stay left-to-right.
- **Light/dark:** reload in dark with English for any flash; check contrast of coloured text.
- **Sizes:** 375 px and 1280 px, 200 percent zoom; tab bar, More sheet, 42-cell calendar, no horizontal scroll.
- **Preferences:** reduced motion, reduced transparency, more contrast.
- **Keyboard only:** skip link, tab bar, More sheet and article dialog (Escape closes, focus returns), forms.
- **Screen reader in Persian:** calendar cell labels, charts, status messages.
- **PWA:** open offline while signed in (must not sign out); deploy a new version with a tab open (cache version changes).
- **Time:** use the app between 00:00 and 03:30 Tehran time; entries must land on today's date.
