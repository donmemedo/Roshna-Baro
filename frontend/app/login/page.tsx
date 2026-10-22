"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Brand, LangToggle, ThemeToggle } from "@/components/shell";
import { useApp, useErrorText } from "@/components/providers";
import { Button, Card, Field, FormError, inputCls, softSpring } from "@/components/ui";
import { api } from "@/lib/api";
import { normalizeDigits } from "@/lib/date";

function LoginInner() {
  const { t, locale, signIn, user } = useApp();
  const errorText = useErrorText();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [form, setForm] = useState({ email: "", password: "", display_name: "", birth_year: "", goal: "conceive" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const demoBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  // The demo account only exists when the server runs with DEMO_MODE.
  useEffect(() => {
    api.health().then((h) => setDemo(h.demo)).catch(() => {});
  }, []);

  // A shared link may point people at the demo, but it must never sign anyone in by itself:
  // it only moves focus to the button, and signing in stays an explicit click.
  useEffect(() => {
    if (demo && params.get("demo") === "1") demoBtn.current?.focus();
  }, [demo, params]);

  const run = async (fn: () => Promise<{ access_token: string }>) => {
    setBusy(true);
    setError("");
    try {
      const { access_token } = await fn();
      await signIn(access_token);
      router.push("/dashboard");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (mode === "login") {
      run(() => api.login(email, form.password));
    } else {
      run(() =>
        api.register({
          email,
          password: form.password,
          display_name: form.display_name.trim(),
          birth_year: form.birth_year ? Number(form.birth_year) : null,
          goal: form.goal,
          locale,
        }),
      );
    }
  };

  const signup = mode === "signup";

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4 py-4 lg:px-10">
        <Brand />
        <div className="ms-auto flex gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={softSpring} className="w-full max-w-md">
          <Card className="p-7 sm:p-9" initial={false} whileInView={undefined}>
            <div role="group" aria-label={t("ctaLogin")} className="mb-6 flex rounded-full border p-1 text-sm font-semibold">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => { setMode(m); setError(""); }}
                  className="focusable relative h-10 flex-1 rounded-full"
                  style={{ color: mode === m ? "#fff" : "var(--fg-muted)" }}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="auth-pill"
                      transition={softSpring}
                      className="absolute inset-0 -z-10 rounded-full bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))]"
                    />
                  )}
                  {m === "login" ? t("ctaLogin") : t("ctaSignup")}
                </button>
              ))}
            </div>

            <h1 className="mb-6 text-2xl font-black tracking-tight">{signup ? t("signupTitle") : t("loginTitle")}</h1>

            <form onSubmit={submit} className="space-y-4" noValidate={false}>
              <Field label={t("email")}>
                <input
                  type="email" name="email" required dir="ltr" autoComplete="email" inputMode="email" maxLength={254}
                  className={inputCls} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"
                />
              </Field>
              <Field label={t("password")} hint={signup ? t("passwordHint") : undefined}>
                <input
                  type="password" name="password" required dir="ltr" maxLength={72}
                  minLength={signup ? 8 : undefined}
                  autoComplete={signup ? "new-password" : "current-password"}
                  className={inputCls} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••"
                />
              </Field>

              {signup && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("displayName")}>
                      <input
                        name="name" autoComplete="given-name" maxLength={60} className={inputCls}
                        value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                      />
                    </Field>
                    <Field label={t("birthYear")}>
                      {/* text + numeric keypad: type="number" rejects Persian digits typed on a Persian keyboard */}
                      <input
                        type="text" inputMode="numeric" name="bday-year" autoComplete="bday-year" dir="ltr"
                        pattern="[0-9]{4}" maxLength={4} className={inputCls} value={form.birth_year} placeholder="1994"
                        onChange={(e) => setForm({ ...form, birth_year: normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 4) })}
                      />
                    </Field>
                  </div>
                  <Field label={t("goal")}>
                    <div role="radiogroup" aria-label={t("goal")} className="grid gap-2">
                      {[["conceive", t("goalConceive")], ["track", t("goalTrack")], ["pregnancy", t("goalPregnancy")]].map(([value, label]) => (
                        <button
                          type="button" role="radio" aria-checked={form.goal === value} key={value}
                          onClick={() => setForm({ ...form, goal: value })}
                          className={`pressable focusable rounded-2xl border px-4 py-3 text-start text-sm font-medium transition ${
                            form.goal === value ? "border-transparent bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))] text-white" : ""
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              <FormError>{error}</FormError>

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? t("loading") : signup ? t("ctaSignup") : t("ctaLogin")}
              </Button>
            </form>

            {demo && (
              <div className="mt-6 border-t pt-5 text-center">
                <p className="mb-3 text-xs muted">{t("demoHint")}</p>
                <Button
                  ref={demoBtn} variant="soft" size="sm" disabled={busy} className="w-full"
                  onClick={() => run(() => api.login("demo@glow.ir", "glow1234"))}
                >
                  {t("demoLogin")}
                </Button>
              </div>
            )}

            <p className="mt-5 text-center text-xs muted">
              {signup ? t("haveAccount") : t("noAccount")}{" "}
              <button type="button" onClick={() => { setMode(signup ? "login" : "signup"); setError(""); }} className="focusable font-bold text-[var(--color-glow-500)]">
                {signup ? t("ctaLogin") : t("ctaSignup")}
              </button>
            </p>
          </Card>
          <p className="mt-5 text-center text-xs muted">
            <Link href="/" className="hover:underline">{t("navHome")}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-glow-500)] border-t-transparent" /></div>}>
      <LoginInner />
    </Suspense>
  );
}
