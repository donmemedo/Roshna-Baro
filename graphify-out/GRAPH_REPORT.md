# Graph Report - Roshna-Baro  (2026-10-22)

## Corpus Check
- 79 files · ~71,956 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .example 1, .ini 1)

## Summary
- 696 nodes · 1659 edges · 45 communities (31 shown, 14 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9c06df5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cycle/page.tsx
- auth.py
- care.py
- test_security.py
- build_prediction
- test_api.py
- visual-check.mjs
- Cycle
- compilerOptions
- db.py
- middleware.py
- .__call__
- Session handoff: Roshana security, pen-test, performance and UI/UX pass
- User
- main.py
- package.json
- ratelimit.py
- LAST_Report: security, penetration test, performance and UX pass
- config.py
- روشنای باروری — Roshana (Glow Iran)
- backup.py
- sw.js
- utc_today
- Threat model and attack trees
- Red team report
- logging_config.py
- live_probe.py
- test_s10_fund_amount_must_be_an_allowed_tier
- client_from
- pip-audit-after.json
- pip-audit-baseline.json
- middleware.ts
- next.config.mjs
- .__call__
- Deployment
- docs/README.md
- Independent reviews and what was done about each
- datetime
- Performance report
- UI/UX report (apple-design)
- QA plan

## God Nodes (most connected - your core abstractions)
1. `register()` - 39 edges
2. `User` - 36 edges
3. `useApp()` - 31 edges
4. `build_prediction()` - 24 edges
5. `Cycle` - 23 edges
6. `DailyLog` - 23 edges
7. `Card()` - 22 edges
8. `localeNum()` - 22 edges
9. `ApiError` - 21 edges
10. `CyclePage()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `3. Environment state` --references--> `main()`  [INFERRED]
  docs/history/SESSION_HANDOFF.md → backend/scripts/bench.py
- `8. Suggested plan for the next session` --references--> `main()`  [INFERRED]
  docs/history/SESSION_HANDOFF.md → backend/scripts/bench.py
- `3. Environment state` --references--> `main()`  [INFERRED]
  SESSION_HANDOFF.md → backend/scripts/bench.py
- `8. Suggested plan for the next session` --references--> `main()`  [INFERRED]
  SESSION_HANDOFF.md → backend/scripts/bench.py
- `Assets and trust boundaries` --references--> `user()`  [INFERRED]
  docs/threat-model.md → backend/tests/test_prediction.py

## Import Cycles
- None detected.

## Communities (45 total, 14 thin omitted)

### Community 0 - "cycle/page.tsx"
Cohesion: 0.07
Nodes (106): Frontend (`frontend`), Highest-value tests still missing, ClinicsPage(), SERVICES, blankLog(), CyclePage(), dayNumber(), FLOWS (+98 more)

### Community 1 - "auth.py"
Cohesion: 0.14
Nodes (12): get_session(), ApiError, enforce(), delete_me(), _in_pool(), login(), register(), update_me() (+4 more)

### Community 2 - "care.py"
Cohesion: 0.19
Nodes (14): Article, Clinic, FundMembership, _now(), article(), articles(), clinics(), community_stats() (+6 more)

### Community 3 - "test_security.py"
Cohesion: 0.09
Nodes (24): register(), ago(), test_b1_quick_log_does_not_erase_existing_fields(), test_b3_concurrent_saves_do_not_duplicate(), test_backup_produces_a_consistent_copy(), test_control_idor_cycle_delete_is_owner_only(), test_control_logs_are_scoped_to_owner(), test_control_mass_assignment_blocked() (+16 more)

### Community 4 - "build_prediction"
Cohesion: 0.08
Nodes (37): _bbt_ovulation(), build_prediction(), _cycle_lengths(), _insights(), _opk_ovulation(), _referral(), _regularity(), ArticleOut (+29 more)

### Community 5 - "test_api.py"
Cohesion: 0.13
Nodes (12): ago(), test_cycles_crud_and_duplicate_guard(), test_demo_account_only_exists_when_demo_mode_is_on(), test_duplicate_email_is_409_with_code(), test_fund_join_leave_reports_real_numbers(), test_insights_for_a_new_user_asks_for_data(), test_logs_window_and_limit(), test_per_user_caps_are_enforced() (+4 more)

### Community 6 - "visual-check.mjs"
Cohesion: 0.10
Nodes (19): API, bad, chrome, daysAgo(), events, iso(), issues, matrix (+11 more)

### Community 7 - "Cycle"
Cohesion: 0.21
Nodes (8): seed(), Cycle, DailyLog, export_me(), me(), fill(), main(), timed()

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "db.py"
Cohesion: 0.14
Nodes (6): init_db(), _sqlite_pragmas(), client(), test_r6_sql_errors_do_not_leak_bound_values(), fresh(), go()

### Community 11 - ".__call__"
Cohesion: 0.22
Nodes (6): SecurityMiddleware, Architecture, Backend (`backend/app`), Data model, Decisions (ADR-style), Runtime topology

### Community 12 - "Session handoff: Roshana security, pen-test, performance and UI/UX pass"
Cohesion: 0.05
Nodes (31): UserUpdate, 1. What the user asked for, 2. Status, 3. Environment state, 4. Project map, 5.1 Security: backend, 5.2 Security: frontend, 5.3 Correctness bugs found along the way (+23 more)

### Community 13 - "User"
Cohesion: 0.20
Nodes (9): User, add_cycle(), _count(), delete_cycle(), insights(), list_cycles(), list_logs(), upsert_log() (+1 more)

### Community 14 - "main.py"
Cohesion: 0.12
Nodes (4): install_error_handlers(), configure_logging(), create_app(), lifespan()

### Community 15 - "package.json"
Cohesion: 0.05
Nodes (44): metadata, RootLayout(), viewport, Aurora(), Providers(), store(), setToken(), dependencies (+36 more)

### Community 16 - "ratelimit.py"
Cohesion: 0.13
Nodes (12): client_ip(), forget(), hit(), known(), remember(), reset_all(), _sweep(), undo() (+4 more)

### Community 17 - "LAST_Report: security, penetration test, performance and UX pass"
Cohesion: 0.18
Nodes (11): 10. Evidence index, 1. What you asked for, 2. Honest status, 3. Timeline of the work, 4. Security work, 5. Performance, measured (CPU time, stable under a loaded host), 6. UI/UX (apple-design), 7. Residual risks and open decisions (+3 more)

### Community 19 - "روشنای باروری — Roshana (Glow Iran)"
Cohesion: 0.18
Nodes (10): API, Demo account, Design system, Next steps: PWA → APK → IPA, Option A — Docker (recommended), Option B — local dev, Quick start, The prediction engine (`backend/app/prediction.py`) (+2 more)

### Community 21 - "sw.js"
Cohesion: 0.67
Nodes (3): cacheable(), put(), SHELL

### Community 22 - "utc_today"
Cohesion: 0.28
Nodes (5): utc_now(), utc_today(), _check_birth_year(), test_insights_uses_client_local_today_within_one_day(), test_b3_one_log_row_per_user_and_day()

### Community 23 - "Threat model and attack trees"
Cohesion: 0.22
Nodes (8): test_health_ready_and_request_ids(), Abuse of the predictor (safety), Assets and trust boundaries, Attack tree: read another person's health data, Attack tree: take the service down, Leaf annotations, STRIDE summary, Threat model and attack trees

### Community 24 - "Red team report"
Cohesion: 0.33
Nodes (5): Backend findings, Frontend findings, Independent reviews, Red team report, Residual risks (accepted, with owner action)

### Community 27 - "test_s10_fund_amount_must_be_an_allowed_tier"
Cohesion: 0.27
Nodes (4): test_oversized_bodies_are_rejected_with_413(), test_s10_fund_amount_must_be_an_allowed_tier(), test_s11_pregnancy_timeline_rejects_out_of_range_dates(), test_s5_weak_or_oversized_passwords_rejected()

### Community 28 - "client_from"
Cohesion: 0.33
Nodes (5): client_from(), test_r2_guessing_one_account_from_many_addresses_hits_the_account_limit(), test_r2b_strangers_cannot_lock_the_owner_out_from_a_known_address(), test_r2c_a_concurrent_burst_cannot_exceed_the_account_cap(), guess()

### Community 33 - ".__call__"
Cohesion: 0.38
Nodes (3): _json(), limited_receive(), send_wrapper()

### Community 37 - "Deployment"
Cohesion: 0.29
Nodes (6): Behind a reverse proxy (public use), Data, Deployment, Docker Compose (hardened), Next: PWA, Android (APK), iOS (IPA), Scaling and limits

### Community 38 - "docs/README.md"
Cohesion: 0.29
Nodes (4): DevSecOps pipeline and vulnerability lifecycle, Pipeline (`.github/workflows/ci.yml`), Vulnerability and threat-intelligence lifecycle, Documentation index

### Community 39 - "Independent reviews and what was done about each"
Cohesion: 0.29
Nodes (6): Containers and CI, Independent reviews and what was done about each, Product owner, QA lead, Red / blue team (backend), Tech lead

### Community 42 - "Performance report"
Cohesion: 0.40
Nodes (4): Frontend, Performance report, Security cost, stated plainly, Where the wins come from

### Community 43 - "UI/UX report (apple-design)"
Cohesion: 0.40
Nodes (4): Known gaps, Persian UX vocabulary (from your reference), Principles applied, UI/UX report (apple-design)

### Community 44 - "QA plan"
Cohesion: 0.50
Nodes (3): Manual exploratory checklist, QA plan, What exists

## Knowledge Gaps
- **7 isolated node(s):** `react-dom`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 284 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Architecture` connect `.__call__` to `cycle/page.tsx`?**
  _High betweenness centrality (0.292) - this node is a cross-community bridge._
- **Are the 22 inferred relationships involving `User` (e.g. with `build_prediction()` and `_referral()`) actually correct?**
  _`User` has 22 INFERRED edges - model-reasoned connections that need verification._
- **What connects `react-dom`, `@tailwindcss/postcss`, `@types/node` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cycle/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06668307086614174 - nodes in this community are weakly interconnected._
- **Why does `Backend (`backend/app`)` connect `.__call__` to `auth.py`, `User`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `build_prediction()` (e.g. with `Cycle` and `DailyLog`) actually correct?**
  _`build_prediction()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1425287356321839 - nodes in this community are weakly interconnected._