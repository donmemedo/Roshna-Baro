// Drives a real Chrome over the DevTools protocol (no extra dependencies, Node >= 22).
//   node scripts/visual-check.mjs http://localhost:3036 http://localhost:8036 ./shots
// Seeds a throw-away user through the API, then visits every page in light/dark, fa/en, phone/desktop,
// saves screenshots and reports console errors, CSP violations and horizontal overflow.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WEB = (process.argv[2] || "http://localhost:3036").replace(/\/$/, "");
const API = (process.argv[3] || "http://localhost:8036").replace(/\/$/, "");
const OUT = process.argv[4] || "./shots";
const PORT = 9333;
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 864e5));

// ---- seed a user with realistic history
async function api(path, init = {}, token) {
  const res = await fetch(API + path, {
    ...init,
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}
const email = `visual-${Date.now()}@example.com`;
const { access_token: token } = await api("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ email, password: "correct-horse-battery", display_name: "مریم", birth_year: 1994, goal: "conceive", locale: "fa" }),
});
for (const [i, gap] of [0, 29, 28, 30, 27, 29].entries()) {
  const start = 14 + [0, 29, 28, 30, 27, 29].slice(0, i + 1).reduce((a, b) => a + b, 0);
  await api("/api/cycles", { method: "POST", body: JSON.stringify({ period_start: daysAgo(start), period_end: daysAgo(start - 4) }) }, token);
}
for (let d = 12; d >= 1; d--) {
  await api("/api/logs", { method: "PUT", body: JSON.stringify({ log_date: daysAgo(d), temperature: +(36.35 + (d % 2 ? 0.05 : 0) + (d < 5 ? 0.3 : 0)).toFixed(2), mood: "calm", intercourse: d % 3 === 0 }) }, token);
}

// ---- launch Chrome
const profile = mkdtempSync(join(tmpdir(), "roshana-chrome-"));
const chrome = spawn(process.env.CHROME || "google-chrome", [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  ...(process.env.CHROME_NO_SANDBOX ? ["--no-sandbox"] : []), "about:blank",
], { stdio: "ignore" });
let targets;
for (let i = 0; i < 60 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(500); }
}
if (!targets) { chrome.kill(); throw new Error("Chrome did not start"); }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else if (msg.method) events.push(msg);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const mid = ++id;
  pending.set(mid, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: mid, method, params }));
});
for (const d of ["Page", "Runtime", "Log", "Network"]) await send(`${d}.enable`);

const issues = [];
const VIEWPORTS = { phone: { width: 375, height: 812, mobile: true, dpr: 2 }, desktop: { width: 1280, height: 800, mobile: false, dpr: 1 } };
const PUBLIC = ["/", "/login"];
const PRIVATE = ["/dashboard", "/cycle", "/insights", "/pregnancy", "/clinics", "/fund", "/learn", "/settings"];
let scriptId;

async function setup({ locale, theme, authed, viewport, media }) {
  if (scriptId) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptId });
  const src = `try{localStorage.setItem('roshana.locale','${locale}');localStorage.setItem('roshana.theme','${theme}');${authed ? `localStorage.setItem('roshana.token','${token}');` : "localStorage.removeItem('roshana.token');"}}catch(e){}`;
  scriptId = (await send("Page.addScriptToEvaluateOnNewDocument", { source: src })).identifier;
  const v = VIEWPORTS[viewport];
  await send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.dpr, mobile: v.mobile });
  await send("Emulation.setEmulatedMedia", { media: "", features: media || [] });
}

async function visit(path, label, extra = async () => {}) {
  events.length = 0;
  await send("Page.navigate", { url: WEB + path });
  await sleep(3500);
  await extra();
  const m = (await send("Runtime.evaluate", { returnByValue: true, expression: `JSON.stringify({w:document.documentElement.scrollWidth,iw:innerWidth,dir:document.documentElement.dir,lang:document.documentElement.lang,dark:document.documentElement.classList.contains('dark'),path:location.pathname,h1:(document.querySelector('h1')||{}).textContent||''})` })).result.value;
  const info = JSON.parse(m);
  const problems = [];
  if (info.w > info.iw + 1) problems.push(`horizontal overflow ${info.w}>${info.iw}`);
  for (const e of events) {
    if (e.method === "Runtime.exceptionThrown") problems.push("exception: " + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text).slice(0, 160));
    if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") problems.push("console.error: " + e.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 160));
    if (e.method === "Log.entryAdded" && ["error", "warning"].includes(e.params.entry.level) && !/favicon|apple-touch|\/icon-\d+\.png/.test(e.params.entry.text + (e.params.entry.url || ""))) problems.push(`log.${e.params.entry.source}: ` + e.params.entry.text.slice(0, 160));
  }
  const shot = await send("Page.captureScreenshot", { format: "webp", quality: 72 });
  const file = join(OUT, `${label}.webp`);
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  issues.push({ label, path: info.path, dir: info.dir, dark: info.dark, problems });
  console.log(`${problems.length ? "ISSUE" : "ok   "}  ${label}${problems.length ? "  " + problems.join(" | ") : ""}`);
}

const matrix = [
  { viewport: "phone", theme: "light", locale: "fa" },
  { viewport: "phone", theme: "dark", locale: "en" },
  { viewport: "desktop", theme: "light", locale: "fa" },
  { viewport: "desktop", theme: "dark", locale: "en" },
];
for (const cfg of matrix) {
  const tag = `${cfg.viewport}-${cfg.theme}-${cfg.locale}`;
  await setup({ ...cfg, authed: false });
  for (const p of PUBLIC) await visit(p, `${tag}${p === "/" ? "-landing" : "-login"}`);
  await setup({ ...cfg, authed: true });
  for (const p of PRIVATE) await visit(p, `${tag}-${p.slice(1)}`);
  if (cfg.viewport === "phone") {
    await visit("/dashboard", `${tag}-more-sheet`, async () => {
      await send("Runtime.evaluate", { expression: `document.querySelector('nav button[aria-haspopup="dialog"]').click()` });
      await sleep(900);
    });
  }
}

// accessibility preferences: reduced motion + transparency + more contrast
await setup({ viewport: "phone", theme: "dark", locale: "fa", authed: true, media: [
  { name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-reduced-transparency", value: "reduce" }, { name: "prefers-contrast", value: "more" },
] });
await visit("/dashboard", "phone-dark-fa-dashboard-a11y-prefs");

writeFileSync(join(OUT, "report.json"), JSON.stringify(issues, null, 1));
const bad = issues.filter((i) => i.problems.length);
console.log(JSON.stringify({ pages: issues.length, withIssues: bad.length }));
ws.close();
chrome.kill();
process.exit(bad.length ? 1 : 0);
