# Graph Report - Roshna-Baro  (2026-10-22)

## Corpus Check
- 72 files · ~68,037 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .example 1, .ini 1)

## Summary
- 653 nodes · 1599 edges · 37 communities (26 shown, 11 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d588938`
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
- Session handoff: Roshana security, pen-test, performance and UI/UX pass
- main.py
- package.json
- app/layout.tsx
- LAST_Report: security, penetration test, performance and UX pass
- config.py
- روشنای باروری — Roshana (Glow Iran)
- backup.py
- ApiError
- dependencies
- devDependencies
- Red team report
- scripts
- live_probe.py
- test_s10_fund_amount_must_be_an_allowed_tier
- client_from
- pip-audit-after.json
- pip-audit-baseline.json
- middleware.ts
- next.config.mjs
- overrides

## God Nodes (most connected - your core abstractions)
1. `User` - 36 edges
2. `register()` - 36 edges
3. `useApp()` - 31 edges
4. `build_prediction()` - 24 edges
5. `Cycle` - 23 edges
6. `DailyLog` - 23 edges
7. `Card()` - 22 edges
8. `localeNum()` - 22 edges
9. `ApiError` - 21 edges
10. `CyclePage()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `5.5 Checked and not vulnerable` --references--> `UserUpdate`  [INFERRED]
  docs/history/SESSION_HANDOFF.md → backend/app/schemas.py
- `5.5 Checked and not vulnerable` --references--> `UserUpdate`  [INFERRED]
  SESSION_HANDOFF.md → backend/app/schemas.py
- `3. Environment state` --references--> `main()`  [INFERRED]
  docs/history/SESSION_HANDOFF.md → backend/scripts/bench.py
- `8. Suggested plan for the next session` --references--> `main()`  [INFERRED]
  docs/history/SESSION_HANDOFF.md → backend/scripts/bench.py
- `3. Environment state` --references--> `main()`  [INFERRED]
  SESSION_HANDOFF.md → backend/scripts/bench.py

## Import Cycles
- None detected.

## Communities (37 total, 11 thin omitted)

### Community 0 - "cycle/page.tsx"
Cohesion: 0.07
Nodes (102): Frontend (`frontend`), ClinicsPage(), SERVICES, blankLog(), CyclePage(), dayNumber(), FLOWS, MOODS (+94 more)

### Community 1 - "auth.py"
Cohesion: 0.05
Nodes (33): utc_now(), get_session(), get_today(), ApiError, User, client_ip(), enforce(), forget() (+25 more)

### Community 2 - "care.py"
Cohesion: 0.08
Nodes (30): Clinic, FundMembership, article(), articles(), clinics(), community_stats(), fund(), fund_join() (+22 more)

### Community 3 - "test_security.py"
Cohesion: 0.09
Nodes (23): register(), ago(), test_b1_quick_log_does_not_erase_existing_fields(), test_b3_concurrent_saves_do_not_duplicate(), test_control_idor_cycle_delete_is_owner_only(), test_control_logs_are_scoped_to_owner(), test_control_mass_assignment_blocked(), test_deleted_user_token_stops_working() (+15 more)

### Community 4 - "build_prediction"
Cohesion: 0.12
Nodes (27): _bbt_ovulation(), build_prediction(), _cycle_lengths(), _insights(), _opk_ovulation(), _referral(), _regularity(), Insight (+19 more)

### Community 5 - "test_api.py"
Cohesion: 0.11
Nodes (16): utc_today(), _check_birth_year(), ago(), test_cycles_crud_and_duplicate_guard(), test_demo_account_only_exists_when_demo_mode_is_on(), test_duplicate_email_is_409_with_code(), test_fund_join_leave_reports_real_numbers(), test_insights_for_a_new_user_asks_for_data() (+8 more)

### Community 6 - "visual-check.mjs"
Cohesion: 0.10
Nodes (19): API, bad, chrome, daysAgo(), events, iso(), issues, matrix (+11 more)

### Community 7 - "Cycle"
Cohesion: 0.19
Nodes (9): seed(), Article, Cycle, DailyLog, _now(), export_me(), fill(), main() (+1 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "db.py"
Cohesion: 0.15
Nodes (7): init_db(), _sqlite_pragmas(), reset_all(), client(), test_r6_sql_errors_do_not_leak_bound_values(), fresh(), go()

### Community 10 - "middleware.py"
Cohesion: 0.15
Nodes (3): configure_logging(), JsonFormatter, _BodyTooLarge

### Community 11 - ".__call__"
Cohesion: 0.14
Nodes (9): _json(), SecurityMiddleware, limited_receive(), send_wrapper(), Architecture, Backend (`backend/app`), Data model, Decisions (ADR-style) (+1 more)

### Community 12 - "Session handoff: Roshana security, pen-test, performance and UI/UX pass"
Cohesion: 0.12
Nodes (15): 1. What the user asked for, 2. Status, 3. Environment state, 4. Project map, 5.1 Security: backend, 5.2 Security: frontend, 5.3 Correctness bugs found along the way, 5.4 Performance (+7 more)

### Community 13 - "Session handoff: Roshana security, pen-test, performance and UI/UX pass"
Cohesion: 0.12
Nodes (15): 1. What the user asked for, 2. Status, 3. Environment state, 4. Project map, 5.1 Security: backend, 5.2 Security: frontend, 5.3 Correctness bugs found along the way, 5.4 Performance (+7 more)

### Community 14 - "main.py"
Cohesion: 0.17
Nodes (3): install_error_handlers(), create_app(), lifespan()

### Community 15 - "package.json"
Cohesion: 0.15
Nodes (12): engines, node, name, private, version, react-dom, tailwindcss, @tailwindcss/postcss (+4 more)

### Community 16 - "app/layout.tsx"
Cohesion: 0.21
Nodes (9): metadata, RootLayout(), viewport, Aurora(), Providers(), store(), setToken(), @fontsource-variable/inter (+1 more)

### Community 17 - "LAST_Report: security, penetration test, performance and UX pass"
Cohesion: 0.17
Nodes (11): 10. Evidence index, 1. What you asked for, 2. Honest status, 3. Timeline of the work, 4. Security work, 5. Performance, measured (CPU time, stable under a loaded host), 6. UI/UX (apple-design), 7. Residual risks and open decisions (+3 more)

### Community 19 - "روشنای باروری — Roshana (Glow Iran)"
Cohesion: 0.18
Nodes (10): API, Demo account, Design system, Next steps: PWA → APK → IPA, Option A — Docker (recommended), Option B — local dev, Quick start, The prediction engine (`backend/app/prediction.py`) (+2 more)

### Community 21 - "ApiError"
Cohesion: 0.29
Nodes (6): ApiError, getToken(), request(), cacheable(), put(), SHELL

### Community 22 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @fontsource-variable/inter, @fontsource-variable/vazirmatn, framer-motion, next, react, react-dom

### Community 23 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 24 - "Red team report"
Cohesion: 0.33
Nodes (5): Backend findings, Frontend findings, Independent reviews, Red team report, Residual risks (accepted, with owner action)

### Community 25 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

### Community 27 - "test_s10_fund_amount_must_be_an_allowed_tier"
Cohesion: 0.50
Nodes (3): test_s10_fund_amount_must_be_an_allowed_tier(), test_s11_pregnancy_timeline_rejects_out_of_range_dates(), test_s5_weak_or_oversized_passwords_rejected()

### Community 33 - "overrides"
Cohesion: 0.67
Nodes (3): postcss, overrides, next

## Knowledge Gaps
- **7 isolated node(s):** `react-dom`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 266 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Backend (`backend/app`)` connect `.__call__` to `auth.py`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Are the 22 inferred relationships involving `User` (e.g. with `build_prediction()` and `_referral()`) actually correct?**
  _`User` has 22 INFERRED edges - model-reasoned connections that need verification._
- **What connects `react-dom`, `@tailwindcss/postcss`, `@types/node` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cycle/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07077169132347061 - nodes in this community are weakly interconnected._
- **Why does `Architecture` connect `.__call__` to `cycle/page.tsx`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `build_prediction()` (e.g. with `Cycle` and `DailyLog`) actually correct?**
  _`build_prediction()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.052782558806655194 - nodes in this community are weakly interconnected._