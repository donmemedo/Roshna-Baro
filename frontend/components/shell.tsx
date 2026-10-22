"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { useApp } from "./providers";
import { ErrorState, cx, project, sheetSpring, spring } from "./ui";
import type { TKey } from "@/lib/i18n";

type NavItem = { href: string; key: TKey; icon: keyof typeof Icon };

const NAV: NavItem[] = [
  { href: "/dashboard", key: "navDashboard", icon: "home" },
  { href: "/cycle", key: "navCycle", icon: "cycle" },
  { href: "/insights", key: "navInsights", icon: "chart" },
  { href: "/pregnancy", key: "navPregnancy", icon: "heart" },
  { href: "/clinics", key: "navClinics", icon: "pin" },
  { href: "/fund", key: "navFund", icon: "shield" },
  { href: "/learn", key: "navLearn", icon: "book" },
  { href: "/settings", key: "navSettings", icon: "gear" },
];
// An iOS-style tab bar holds five items: four destinations plus "More" for the rest.
const PRIMARY = NAV.slice(0, 4);
const SECONDARY = NAV.slice(4);

const GRADIENT = "bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))]";

export function ThemeToggle() {
  const { theme, toggleTheme, t } = useApp();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? t("themeToLight") : t("themeToDark")}
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
  const { locale, setLocale, t } = useApp();
  return (
    <div role="group" aria-label={t("language")} className="glass relative flex h-10 items-center rounded-full p-1 text-sm font-semibold">
      {(["fa", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          lang={l}
          aria-label={l === "fa" ? "فارسی" : "English"}
          className="focusable relative z-10 h-8 w-11 rounded-full"
          style={{ color: locale === l ? "#fff" : "var(--fg-muted)" }}
        >
          {locale === l && (
            <motion.span layoutId="lang-pill" transition={spring} className={cx("absolute inset-0 -z-10 rounded-full", GRADIENT)} />
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
    <Link href="/" className="focusable flex items-center gap-2.5" aria-label={t("brand")}>
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

function MoreSheet({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const { t } = useApp();
  const firstRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        key="scrim"
        aria-hidden
        className="fixed inset-0 z-50 bg-black/40 lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* enters from the bottom, leaves to the bottom: the same path both ways */}
      <motion.div
        key="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("more")}
        className="glass fixed inset-x-0 bottom-0 z-50 rounded-t-4xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={sheetSpring}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          // dismiss by where the flick would land, not just where the finger let go
          if (info.offset.y + project(info.velocity.y) > 160) onClose();
        }}
      >
        <div aria-hidden className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/20" />
        <div className="grid grid-cols-2 gap-2">
          {SECONDARY.map((item, i) => {
            const IconCmp = Icon[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={i === 0 ? firstRef : undefined}
                onClick={onClose}
                className="pressable focusable flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold"
              >
                <IconCmp />
                {t(item.key)}
              </Link>
            );
          })}
        </div>
        <button
          onClick={onLogout}
          className="pressable focusable mt-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold text-[var(--color-glow-600)]"
        >
          <Icon.logout />
          {t("logout")}
        </button>
      </motion.div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, user, ready, offline, retryConnect, signOut } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (ready && !user && !offline) router.replace("/login");
  }, [ready, user, offline, router]);

  useEffect(() => setMoreOpen(false), [pathname]);

  const closeMore = () => {
    setMoreOpen(false);
    moreBtn.current?.focus();
  };
  const logout = () => {
    setMoreOpen(false);
    signOut();
    router.push("/");
  };

  if (ready && !user && offline) {
    return <ErrorState message={t("err_network")} retryLabel={t("retry")} onRetry={retryConnect} />;
  }

  if (!ready || !user) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-label={t("loading")}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-glow-500)] border-t-transparent" />
      </div>
    );
  }

  const moreActive = SECONDARY.some((i) => pathname === i.href);
  const tabCls = (active: boolean) =>
    cx(
      "pressable focusable relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold leading-tight",
      active ? "text-white" : "muted",
    );

  return (
    <div className="relative z-10 flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-[var(--color-glow-500)] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {t("skipToContent")}
      </a>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 p-4 lg:flex">
        <div className="glass mb-2 rounded-3xl p-4">
          <Brand />
        </div>
        <nav aria-label={t("brand")} className="glass flex flex-1 flex-col gap-1 rounded-3xl p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const IconCmp = Icon[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "focusable relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition",
                  active ? "text-white" : "muted hover:bg-black/5 dark:hover:bg-white/10",
                )}
              >
                {active && <motion.span layoutId="nav-active" transition={spring} className={cx("absolute inset-0 -z-10 rounded-2xl", GRADIENT)} />}
                <IconCmp />
                {t(item.key)}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="focusable mt-auto rounded-2xl px-3.5 py-2.5 text-start text-sm font-semibold muted hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("logout")}
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 px-4 pb-32 outline-none lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* mobile tab bar: icon + label, four destinations and "More" */}
      <nav
        aria-label={t("brand")}
        className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 gap-1 rounded-[28px] p-1.5 lg:hidden"
      >
        {PRIMARY.map((item) => {
          const active = pathname === item.href;
          const IconCmp = Icon[item.icon];
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabCls(active)}>
              {active && <motion.span layoutId="tab-active" transition={spring} className={cx("absolute inset-0 rounded-2xl", GRADIENT)} />}
              <span className="relative"><IconCmp /></span>
              <span className="relative max-w-full truncate">{t(item.key)}</span>
            </Link>
          );
        })}
        <button
          ref={moreBtn}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={tabCls(moreActive)}
        >
          {moreActive && <motion.span layoutId="tab-active" transition={spring} className={cx("absolute inset-0 rounded-2xl", GRADIENT)} />}
          <span className="relative"><Icon.more /></span>
          <span className="relative">{t("more")}</span>
        </button>
      </nav>

      <AnimatePresence>{moreOpen && <MoreSheet onClose={closeMore} onLogout={logout} />}</AnimatePresence>
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
