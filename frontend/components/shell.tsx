"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "./icons";
import { useApp } from "./providers";
import { cx, spring } from "./ui";
import type { TKey } from "@/lib/i18n";

const NAV: { href: string; key: TKey; icon: keyof typeof Icon }[] = [
  { href: "/dashboard", key: "navDashboard", icon: "home" },
  { href: "/cycle", key: "navCycle", icon: "cycle" },
  { href: "/insights", key: "navInsights", icon: "chart" },
  { href: "/pregnancy", key: "navPregnancy", icon: "heart" },
  { href: "/clinics", key: "navClinics", icon: "pin" },
  { href: "/fund", key: "navFund", icon: "shield" },
  { href: "/learn", key: "navLearn", icon: "book" },
  { href: "/settings", key: "navSettings", icon: "gear" },
];

export function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Light" : "Dark"}
      className="pressable focusable glass relative grid h-10 w-10 place-items-center overflow-hidden rounded-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 16, opacity: 0, rotate: -35 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -16, opacity: 0, rotate: 35 }}
          transition={spring}
          className="grid place-items-center"
        >
          {theme === "dark" ? <Icon.moon /> : <Icon.sun />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function LangToggle() {
  const { locale, setLocale } = useApp();
  return (
    <div className="glass relative flex h-10 items-center rounded-full p-1 text-sm font-semibold">
      {(["fa", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className="focusable relative z-10 h-8 w-11 rounded-full"
          style={{ color: locale === l ? "#fff" : "var(--fg-muted)" }}
        >
          {locale === l && (
            <motion.span
              layoutId="lang-pill"
              transition={spring}
              className="absolute inset-0 -z-10 rounded-full bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))]"
            />
          )}
          {l === "fa" ? "فا" : "EN"}
        </button>
      ))}
    </div>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useApp();
  return (
    <Link href="/" className="focusable flex items-center gap-2.5">
      <Icon.logo />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-black tracking-tight">{t("brand")}</span>
          <span className="block text-[10px] muted">{t("brandSub")}</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, user, ready, signOut } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-glow-500)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-dvh">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 p-4 lg:flex">
        <div className="glass mb-2 rounded-3xl p-4">
          <Brand />
        </div>
        <nav className="glass flex flex-1 flex-col gap-1 rounded-3xl p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const IconCmp = Icon[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "focusable relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition",
                  active ? "text-white" : "muted hover:bg-black/5 dark:hover:bg-white/10",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={spring}
                    className="absolute inset-0 -z-10 rounded-2xl bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))]"
                  />
                )}
                <IconCmp />
                {t(item.key)}
              </Link>
            );
          })}
          <button
            onClick={() => { signOut(); router.push("/"); }}
            className="focusable mt-auto rounded-2xl px-3.5 py-2.5 text-start text-sm font-semibold muted hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("logout")}
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {/* mobile tab bar */}
      <nav className="glass fixed bottom-3 left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full p-1.5 lg:hidden">
        {NAV.slice(0, 6).map((item) => {
          const active = pathname === item.href;
          const IconCmp = Icon[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={t(item.key)}
              className={cx("pressable focusable relative grid h-11 w-12 shrink-0 place-items-center rounded-full", active ? "text-white" : "muted")}
            >
              {active && (
                <motion.span
                  layoutId="tab-active"
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))]"
                />
              )}
              <span className="relative"><IconCmp /></span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ title, body }: { title: string; body?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mb-6 pt-2">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
      {body && <p className="mt-2 max-w-2xl text-sm muted">{body}</p>}
    </motion.div>
  );
}
