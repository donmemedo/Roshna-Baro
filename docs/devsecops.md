# DevSecOps pipeline and vulnerability lifecycle

## Pipeline (`.github/workflows/ci.yml`)

| Job | Gate |
|---|---|
| backend | Ruff, Bandit (medium and above), `pip-audit`, pytest (security regression, API, engine) |
| frontend | `npm audit --omit=dev --audit-level=high`, `tsc --noEmit`, production build |
| secrets | gitleaks over full history |
| semgrep | OWASP Top 10, Python, TypeScript rules; errors and warnings only; metrics off (health data) |
| containers | Build both images, Trivy fails on HIGH or CRITICAL with a fix available |
| smoke | `docker compose up --wait`, then readiness and login page requests, proving the read-only runtime boots |
| schedule | Weekly run, so new advisories against unchanged code are found |

Dependabot (pip, npm, docker, actions) opens weekly update PRs. Open items: pin actions by commit SHA and images by digest, hashed Python lockfile, SBOM and signing at publish time, hadolint, CodeQL, nightly DAST.

## Vulnerability and threat-intelligence lifecycle

| Severity | Trigger | Triage within | Fix and release within |
|---|---|---|---|
| Critical | CVSS 9 or higher, or listed in CISA KEV, or EPSS 0.5 or higher and reachable | 24 hours | 72 hours (hotfix) |
| High | CVSS 7 to 8.9, fix exists | 3 days | 14 days |
| Medium | CVSS 4 to 6.9 | 7 days | 60 days or next release |
| Low or no fix | Unreachable or unpatched upstream | 30 days | Accept with an expiry date; re-review in 90 days |

- **Sources:** Dependabot alerts (GitHub Advisory Database, PyPI, npm), OSV.dev, the weekly CI run, CISA KEV and FIRST EPSS to rank findings, Next.js, Node and Python security releases, base-image distribution trackers.
- **Flow:** alert, then a GitHub issue labelled `security` (CVE, package, KEV/EPSS, reachable or not, decision), fix PR, green CI including the smoke job, tagged release and rebuilt images, rescan of the released image, issue closed with the run link.
- **Exceptions:** an entry with an expiry date and issue link; no permanent ignores.
- **Metrics:** time to fix against the table, open findings by age, percent fixed within target, open KEV hits (target 0), dependency lag in days.
- **Worked example from this project:** the original `npm audit` showed a critical Next.js advisory; it was triaged as critical, fixed by upgrading to 15.5.28, and the remaining PostCSS advisory (build-time only, not reachable because the app builds only its own CSS) was cleared by pinning the nested version rather than accepted.
