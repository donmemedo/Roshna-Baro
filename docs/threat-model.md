# Threat model and attack trees

Scope: the API, the web app/PWA, the SQLite file and the container runtime. Data class: **special-category health data** (cycle dates, temperatures, intercourse, mood, pregnancy), so confidentiality matters more than availability.

## Assets and trust boundaries

| Asset | Where | Who must not touch it |
|---|---|---|
| Cycle and daily-log rows | SQLite `/data/glow.db` | Anyone but the owning user |
| Session token | Browser `localStorage` | Scripts not served by us |
| `SECRET_KEY` | Environment | Everyone but the operator |
| Account credentials | bcrypt hashes in the `user` table | Everyone |

Boundaries: Internet → reverse proxy → Next.js and API; browser → API (cross-origin); API → SQLite volume.

## STRIDE summary

| | Threat | Control | Test / evidence |
|---|---|---|---|
| **S**poofing | Forged or stolen token, credential stuffing | HS256 pinned, required claims, strong secret enforced at start, rate limits, bcrypt 12 | `test_s2`, `test_s3_*`, `test_s7_*` |
| **T**ampering | Overwriting another user's rows, mass assignment | Every query filtered by `user_id`; `extra="forbid"` on updates; enums and bounds | `test_control_idor_*`, `test_control_mass_assignment_*` |
| **R**epudiation | "I never did that" | Request id on every response and log line | `test_health_ready_and_request_ids` |
| **I**nformation disclosure | Verbose errors, logs, CORS, enumeration | Error envelope, no IP/query/body logging, explicit CORS, timing equalised | `test_error_responses_*`, `test_s1_*`, `test_s4_*` |
| **D**enial of service | bcrypt flood, huge bodies, unbounded rows | Throttle before hashing, 64 KiB body cap, per-user caps, WAL | `test_s3_*`, `test_oversized_*`, `test_s9_cycle_rows_*` |
| **E**levation | Reaching admin or docs endpoints | No admin surface; docs off unless `APP_ENV=dev` | `test_s13_*` |

## Attack tree: read another person's health data

```mermaid
flowchart TD
  G["GOAL: read another user's health data"] --> A["Obtain a valid session"]
  G --> B["Bypass access control"]
  G --> C["Read the database or a backup"]
  A --> A1["XSS reads the token"]
  A --> A2["Forge a token"]
  A --> A3["Guess or stuff a password"]
  A --> A4["Trick victim into the attacker's session"]
  A --> A5["Use a shared or stolen device"]
  B --> B1["IDOR on /cycles/{id}"]
  B --> B2["Mass assignment on PATCH /me"]
  B --> B3["Read via export with a stolen token"]
  C --> C1["Host or volume access"]
  C --> C2["Unencrypted backup copy"]
  A1 -. "strict nonce CSP, React escaping, no user HTML" .-> M1(("mitigated"))
  A2 -. "weak secret refused at start, alg pinned" .-> M1
  A3 -. "8 tries/5 min per ip+email, 40/5 min per ip, bcrypt 12" .-> R1(("residual: distributed stuffing"))
  A4 -. "?demo=1 no longer signs anyone in" .-> M1
  A5 -. "7-day token, SW cache cleared on sign-out" .-> R2(("residual: token not revocable"))
  B1 -. "owner filter, 404 not 403" .-> M1
  B2 -. "extra=forbid" .-> M1
  B3 -. "same as A1-A5" .-> R2
  C1 -. "OS permissions, volume" .-> R3(("residual: no encryption at rest"))
  C2 -. "operator procedure" .-> R3
```

### Leaf annotations

| Leaf | Cost | Skill | Detectability | Priority |
|---|---|---|---|---|
| Distributed credential stuffing | Medium (botnet) | Low | Medium (many 401s, 429s in logs) | **High**: add per-account lock-out signal and breach-password check |
| XSS → token theft | High (needs an injection bug first) | High | Low | Medium: CSP is the main control |
| Stolen device | Low | Low | None | Medium: add "sign out all devices" (needs token versioning) |
| Database or backup copy | Low if host is compromised | Medium | Low | **High** for a health product: encrypt the volume and backups |
| Token forgery | Very high once the secret is strong | High | Medium | Low |

## Attack tree: take the service down

```mermaid
flowchart TD
  D["GOAL: make the service unavailable"] --> D1["CPU exhaustion"]
  D --> D2["Memory exhaustion"]
  D --> D3["Disk exhaustion"]
  D --> D4["Break the supply chain"]
  D1 --> D11["Flood /login (each bcrypt ~450 ms)"]
  D2 --> D21["Huge request bodies"]
  D2 --> D22["Many distinct rate-limit keys"]
  D3 --> D31["Create unlimited rows"]
  D4 --> D41["Vulnerable dependency"]
  D4 --> D42["Poisoned base image or CI action"]
  D11 -. "429 before bcrypt: 3.5 ms vs 461 ms" .-> M(("mitigated"))
  D21 -. "64 KiB cap, checked while streaming" .-> M
  D22 -. "per-IP caps bound keys; periodic sweep" .-> M
  D31 -. "600 cycles and 20 000 logs per user; register 10/h/IP" .-> M
  D41 -. "pip-audit, npm audit, Dependabot, weekly CI" .-> M
  D42 -. "pin by digest and SHA (open item)" .-> R(("residual"))
```

## Abuse of the predictor (safety)

A wrong prediction can change a medical decision. Controls: inputs are bounded (temperature 34–42 °C, dates in range), the confidence score is always shown, the UI states that the prediction does not replace a doctor, and the referral rule uses the caller's date.
