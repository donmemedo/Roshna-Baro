"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Brand, LangToggle, ThemeToggle } from "@/components/shell";
import { useApp } from "@/components/providers";
import { Button, Card, Field, inputCls, softSpring } from "@/components/ui";
import { api } from "@/lib/api";

function LoginInner() {
  const { t, locale, signIn, user } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [form, setForm] = useState({ email: "", password: "", display_name: "", birth_year: "", goal: "conceive" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const run = async (fn: () => Promise<{ access_token: string }>) => {
    setBusy(true);
    setError("");
    try {
      const { access_token } = await fn();
      await signIn(access_token);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("wrongCreds"));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      run(() => api.login(form.email, form.password));
    } else {
      run(() =>
        api.register({
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          birth_year: form.birth_year ? Number(form.birth_year) : null,
          goal: form.goal,
          locale,
        }),
      );
    }
  };

  const demo = () => run(() => api.login("demo@glow.ir", "glow1234"));

  useEffect(() => {
    if (params.get("demo") === "1") demo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <div className="mb-6 flex rounded-full border p-1 text-sm font-semibold">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
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

            <h1 className="mb-6 text-2xl font-black tracking-tight">{mode === "login" ? t("loginTitle") : t("signupTitle")}</h1>

            <form onSubmit={submit} className="space-y-4">
              <Field label={t("email")}>
                <input
                  type="email" required dir="ltr" className={inputCls} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"
                />
              </Field>
              <Field label={t("password")}>
                <input
                  type="password" required minLength={6} dir="ltr" className={inputCls} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••"
                />
              </Field>

              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("displayName")}>
                      <input className={inputCls} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                    </Field>
                    <Field label={t("birthYear")}>
                      <input
                        type="number" min={1940} max={2015} dir="ltr" className={inputCls} value={form.birth_year}
                        onChange={(e) => setForm({ ...form, birth_year: e.target.value })} placeholder="1994"
                      />
                    </Field>
                  </div>
                  <Field label={t("goal")}>
                    <div className="grid gap-2">
                      {[["conceive", t("goalConceive")], ["track", t("goalTrack")], ["pregnancy", t("goalPregnancy")]].map(([value, label]) => (
                        <button
                          type="button" key={value} onClick={() => setForm({ ...form, goal: value })}
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

              {error && <p className="rounded-2xl bg-[var(--color-glow-500)]/10 px-4 py-3 text-sm text-[var(--color-glow-600)]">{error}</p>}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? t("loading") : mode === "login" ? t("ctaLogin") : t("ctaSignup")}
              </Button>
            </form>

            <div className="mt-6 border-t pt-5 text-center">
              <p className="mb-3 text-xs muted">{t("demoHint")}</p>
              <Button variant="soft" size="sm" onClick={demo} disabled={busy} className="w-full">
                {t("demoLogin")}
              </Button>
            </div>

            <p className="mt-5 text-center text-xs muted">
              {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
              <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-bold text-[var(--color-glow-500)]">
                {mode === "login" ? t("ctaSignup") : t("ctaLogin")}
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
