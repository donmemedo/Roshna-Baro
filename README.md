<div dir="rtl">

# روشنای باروری — Roshana (Glow Iran)

پلتفرم سلامت دیجیتال زنان: ردیابی چرخه، پیش‌بینی پنجره باروری، راهنمای بارداری، اتصال به کلینیک‌های معتبر و صندوق همیاری درمان ناباروری.

</div>

**Roshana / روشنای باروری** — a Persian-first femtech platform inspired by the Glow business model
(glowing.com), localised for Iran per the business plan in `36-Business-plan-toolkit_Glow_Iran_filled.pdf`.

| | |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · PWA |
| Backend | FastAPI · SQLModel · SQLite (async) · JWT auth |
| Design | Apple-style fluid motion (springs, interruptible transitions, press-down feedback), glass/aurora surfaces, full light + dark, fully responsive |
| Languages | فارسی (RTL) و English (LTR) — instant switch, Persian UX-writing vocabulary |

---

## Quick start

### Option A — Docker (recommended)

```bash
cp .env.example .env          # optional: set a real SECRET_KEY
docker compose up --build
```

- Web app → http://localhost:3036
- API docs → http://localhost:8036/docs

### Option B — local dev

```bash
# backend
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload --port 8036

# frontend (new terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8036 npm run dev     # → http://localhost:3036
```

### Demo account

The API seeds a demo user with six logged cycles and twelve daily logs:

```
demo@glow.ir  /  glow1234
```

The landing page's **نمایش زنده / Live demo** button logs in with it automatically.

---

## What is in the product

| Route | What it does |
|---|---|
| `/` | Landing: hero, live community stats, features, journey, privacy promise, FAQ |
| `/login` | Log in / sign up (goal-based onboarding) + one-tap demo login |
| `/dashboard` | Animated cycle ring, conception chance today, next period / ovulation / fertile window, quick log, personal insights, specialist-referral banner |
| `/cycle` | 6-week phase calendar, daily log (BBT, flow, mood, symptoms, OPK, intercourse, note), period history |
| `/insights` | 21-day conception-odds chart, past cycle lengths, BBT curve, confidence & regularity |
| `/pregnancy` | Week-by-week guide (1–42), trimester progress, due date, baby size |
| `/clinics` | Partner fertility clinics with city/service filters and partner discounts |
| `/fund` | Glow First-style treatment support fund: pool stats, join/leave, monthly amount |
| `/learn` | Reviewed, non-judgemental articles (fertility, pregnancy, postpartum, mind) |
| `/settings` | Account, cycle defaults, language, theme, PWA install |

### The prediction engine (`backend/app/prediction.py`)

1. Cycle history → average length + regularity score (population SD → 0–100).
2. Next period → ovulation (luteal phase = 14 days) → fertile window (−5 … +1).
3. Refinement: a positive ovulation test, or a sustained +0.2 °C basal-temperature shift,
   overrides the historical estimate and raises the confidence score.
4. Day-by-day conception probability from the Wilcox fertility curve, scaled by confidence.
5. Referral rules: cycle < 21 or > 35 days, regularity < 45 with 3+ cycles, or 6/12 months
   of trying by age — the dashboard then surfaces the clinic banner.

> Not a medical device. Content and predictions are informational and do not replace a clinician.

---

## API

`GET /docs` for the live OpenAPI UI. Main endpoints:

```
POST /api/auth/register · POST /api/auth/login · GET|PATCH /api/auth/me
GET|POST /api/cycles · DELETE /api/cycles/{id}
GET /api/logs · PUT /api/logs
GET /api/insights                     ← prediction + calendar + insights
GET /api/clinics?city=&service=
GET /api/articles · GET /api/pregnancy/timeline?last_period=YYYY-MM-DD
GET /api/fund · POST /api/fund/join · POST /api/fund/leave
GET /api/stats/community
```

---

## Design system

- **Tokens** live in `frontend/app/globals.css` (`:root` / `.dark`): background, foreground,
  glass, line, shadow. Every colour is a token, so dark mode is one class switch with no FOUC
  (inline script in `app/layout.tsx` sets theme + dir before first paint).
- **Motion**: springs only for anything touchable (`spring`, `softSpring` in `components/ui.tsx`),
  press feedback on pointer-down (`.pressable`), layout-id shared elements for nav/tab/pill
  indicators, and full `prefers-reduced-motion` support.
- **Surfaces**: `.glass` (blur + saturate + hairline border), `.card-sheen`, animated aurora
  blobs + film grain behind everything.
- **RTL**: logical properties throughout (`ms-*`, `ps-*`, `inset-inline-*`); `dir` flips on the
  `<html>` element, Persian numerals and the Persian (Jalali) calendar via `Intl`.
- **Persian UX writing** follows the vocabulary reference: حساب کاربری، ورود، ثبت‌نام، پیش‌خوان،
  تنظیمات، نشانی، رمز عبور، دیدگاه، بازگشت، سفارش‌ها (never سفارشات).

---

## Next steps: PWA → APK → IPA

The web app already **is** a PWA: `public/manifest.webmanifest`, an offline-capable service
worker (`public/sw.js`, network-first for `/api/`, cache-first shell), maskable icons and an
in-app install button under **تنظیمات / Settings**.

For store builds, wrap the same frontend with Capacitor:

```bash
cd frontend
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android @capacitor/ios
npx cap init Roshana ir.roshana.app --web-dir=.next   # or point at a static export / server URL
npx cap add android && npx cap add ios
npx cap open android   # Android Studio → APK/AAB
npx cap open ios       # Xcode → IPA (needs macOS)
```

Recommended for phase 2: push notifications for fertile-window and test reminders,
biometric app lock (health data), and a Persian offline font bundle.
