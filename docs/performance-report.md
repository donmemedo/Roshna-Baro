# Performance report

Rule applied: every security control is measured. Numbers are **CPU time per request** because wall-clock time was unusable while the host ran at a load average of 40 to 60 (other jobs). CPU time stays stable under that load. Source: `backend/scripts/bench.py`, raw output in `evidence/bench-compare.json` and `evidence/ratelimit-bench.json`. In-process (no network), bcrypt at the production cost of 12.

| Operation | Original | Hardened | Change |
|---|---|---|---|
| `GET /api/insights`, 6 cycles and 30 logs | 13.8 ms | 16.0 ms | +2.2 ms (middleware, logging, extra query bounds) |
| `GET /api/insights`, 3 years of history | 54.1 ms | 18.9 ms | 2.9 times less |
| `GET /api/insights`, 20 000 logs | 965 ms | 22.8 ms | 42 times less |
| `GET /api/logs`, 20 000 rows | 1 426 ms | 23.0 ms | 62 times less |
| `POST /api/auth/login` (correct password) | 429 ms | 451 ms | +5 percent: bcrypt dominates; now runs off the event loop |
| `GET /api/health` | 1.2 ms | 2.1 ms | +0.9 ms: headers, request id, JSON access log |
| `GET /api/auth/me` | 5.5 ms | 6.4 ms | +0.9 ms: PyJWT verification and checks |
| Rate limiter, one call | none | 2.2 microseconds | |
| Rejected login (429) | n/a | 3.5 ms | a real attempt costs 461 ms: **about 130 times cheaper to refuse** |

## Where the wins come from

- The prediction needs recent data only: last 24 cycles and 120 days of logs, with indexed queries, instead of the whole history.
- Calendar period lookup is a set lookup instead of scanning every cycle for each of 60 days.
- The log list defaults to the last 180 days with a cap.
- Clinics and articles filter in SQL; the article list no longer ships full bodies (fetched on open); public content is cacheable for 5 minutes.
- SQLite runs in WAL mode so reads no longer block the writer.

## Security cost, stated plainly

The always-on controls (security headers, request id, access log, body-size check, JWT checks) add about **1 ms** per request. The expensive control, bcrypt at cost 12, is unchanged and is the point of the design; the limiter makes sure it cannot be used as a CPU weapon.

## Frontend

First-load JavaScript is 159 to 166 kB per route (shared 103 kB). Costs removed: render-blocking Google Fonts stylesheet (fonts are now self-hosted and fetched per script subset), heavy 28 px backdrop blur reduced to 18 px on desktop and 12 px on phones, grain overlay removed on phones, ambient animation paused in hidden tabs and removed for reduced motion, one grid animation instead of 42 staggered springs. A Lighthouse run was **not** done.
