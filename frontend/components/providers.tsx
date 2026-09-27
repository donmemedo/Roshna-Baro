"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, type User } from "@/lib/api";
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
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fa");
  const [theme, setTheme] = useState<Theme>("light");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedLocale = (localStorage.getItem("roshana.locale") as Locale) || "fa";
    const savedTheme =
      (localStorage.getItem("roshana.theme") as Theme) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setLocaleState(savedLocale);
    setTheme(savedTheme);
    if (getToken()) {
      api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dict[locale].dir;
    localStorage.setItem("roshana.locale", locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a0710" : "#fbf7f8");
    localStorage.setItem("roshana.theme", theme);
  }, [theme]);

  const signIn = useCallback(async (token: string) => {
    setToken(token);
    const me = await api.me();
    setUser(me);
    if (me.locale === "fa" || me.locale === "en") setLocaleState(me.locale);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (getToken()) setUser(await api.me());
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key: TKey) => (dict[locale] as Record<string, string>)[key] ?? key,
      dir: dict[locale].dir as "rtl" | "ltr",
      theme,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
      user,
      ready,
      signIn,
      signOut,
      refreshUser,
    }),
    [locale, theme, user, ready, signIn, signOut, refreshUser],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}
