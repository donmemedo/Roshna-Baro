"use client";

import { MotionConfig } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, UNAUTHORIZED_EVENT, api, getToken, setToken, type User } from "@/lib/api";
import { dict, type Locale, type TKey } from "@/lib/i18n";

type Theme = "light" | "dark";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey) => string;
  dir: "rtl" | "ltr";
  theme: Theme;
  toggleTheme: () => void;
  user: User | null;
  ready: boolean;
  /** A saved session exists but the server could not be reached (e.g. the PWA opened offline). */
  offline: boolean;
  retryConnect: () => void;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

const THEME_COLOR: Record<Theme, string> = { light: "#fbf7f8", dark: "#0a0710" };

function store(key: string, value?: string): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: preferences just will not persist */
  }
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fa");
  const [theme, setTheme] = useState<Theme>("light");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false); // saved preferences have been read
  const [offline, setOffline] = useState(false);

  const connect = useCallback(() => {
    setOffline(false);
    api.me()
      .then(setUser)
      .catch((e) => {
        // Only a rejected token ends the session; an unreachable server must not sign anyone out.
        if (e instanceof ApiError && e.status === 401) setToken(null);
        else setOffline(true);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const savedLocale = store("roshana.locale") === "en" ? "en" : "fa";
    const savedTheme =
      (store("roshana.theme") as Theme | null) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setLocaleState(savedLocale);
    setTheme(savedTheme === "dark" ? "dark" : "light");
    setLoaded(true);
    if (getToken()) connect();
    else setReady(true);
    // Versioned so a new deploy replaces the old app shell instead of serving it forever.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`).catch(() => {});
    }
    // Stop animating the ambient background while the tab is hidden.
    const onVisibility = () => document.documentElement.classList.toggle("tab-hidden", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [connect]);

  // Skipped until the saved values are loaded, otherwise the defaults overwrite them (and flash the wrong direction).
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dict[locale].dir;
    store("roshana.locale", locale);
  }, [locale, loaded]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.removeAttribute("media");
      m.setAttribute("content", THEME_COLOR[theme]);
    });
    store("roshana.theme", theme);
  }, [theme, loaded]);

  const signIn = useCallback(async (token: string) => {
    setToken(token);
    const me = await api.me();
    setUser(me);
    if (me.locale === "fa" || me.locale === "en") setLocaleState(me.locale);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    // Drop cached pages so the next person on this device never sees them.
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR" });
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, signOut);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOut);
  }, [signOut]);

  const refreshUser = useCallback(async () => {
    if (getToken()) setUser(await api.me());
  }, []);

  const toggleTheme = useCallback(() => {
    // Ease the colour change instead of an abrupt brightness jump (skipped for reduced motion in CSS).
    const root = document.documentElement;
    root.classList.add("theme-transition");
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    window.setTimeout(() => root.classList.remove("theme-transition"), 450);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key: TKey) => (dict[locale] as Record<string, string>)[key] ?? key,
      dir: dict[locale].dir as "rtl" | "ltr",
      theme,
      toggleTheme,
      user,
      ready,
      offline,
      retryConnect: connect,
      signIn,
      signOut,
      refreshUser,
    }),
    [locale, theme, toggleTheme, user, ready, offline, connect, signIn, signOut, refreshUser],
  );

  return (
    <AppCtx.Provider value={value}>
      {/* "user": springs and slides become cross-fades when the OS asks for reduced motion */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}

/** Localised message for an API/network failure. */
export function useErrorText() {
  const { t } = useApp();
  return useCallback(
    (e: unknown): string => {
      const code = (e as { code?: string })?.code;
      const key = (code ? `err_${code}` : "err_generic") as TKey;
      return (dict.en as Record<string, string>)[key] !== undefined ? t(key) : t("err_generic");
    },
    [t],
  );
}
