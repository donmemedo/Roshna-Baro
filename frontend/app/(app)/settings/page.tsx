"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/shell";
import { useApp, useErrorText } from "@/components/providers";
import { Button, Card, Field, FormError, Pill, inputCls } from "@/components/ui";
import { api } from "@/lib/api";
import { localISO, normalizeDigits } from "@/lib/date";
import { localeNum } from "@/lib/i18n";

export default function SettingsPage() {
  const { t, locale, setLocale, theme, toggleTheme, user, refreshUser, signOut } = useApp();
  const errorText = useErrorText();
  const router = useRouter();
  const [form, setForm] = useState({ display_name: "", birth_year: "", avg_cycle_length: 28, avg_period_length: 5 });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [dataError, setDataError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        display_name: user.display_name,
        birth_year: user.birth_year ? String(user.birth_year) : "",
        avg_cycle_length: user.avg_cycle_length,
        avg_period_length: user.avg_period_length,
      });
    }
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const save = async () => {
    setError("");
    const year = form.birth_year ? Number(form.birth_year) : null;
    if (year !== null && (year < 1930 || year > new Date().getFullYear() - 10)) {
      setError(t("err_validation_error"));
      return;
    }
    try {
      await api.updateMe({
        display_name: form.display_name.trim(),
        birth_year: year,
        avg_cycle_length: form.avg_cycle_length,
        avg_period_length: form.avg_period_length,
        locale,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(errorText(e));
    }
  };

  const exportData = async () => {
    setDataError("");
    setBusy(true);
    try {
      const data = await api.exportMe();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `roshana-data-${localISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDataError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDataError("");
    setBusy(true);
    try {
      await api.deleteMe(confirmPassword);
      signOut();
      router.replace("/");
    } catch (e) {
      setDataError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("settingsTitle")} />

      <Card className="p-6">
        <h2 className="mb-5 font-bold">{t("account")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("displayName")}>
            <input className={inputCls} maxLength={60} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </Field>
          <Field label={t("birthYear")}>
            {/* text + numeric keypad so Persian digits typed on a Persian keyboard are accepted */}
            <input
              type="text" inputMode="numeric" dir="ltr" maxLength={4} className={inputCls} value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 4) })}
            />
          </Field>
        </div>
        <p className="mt-4 text-xs muted" dir="ltr">{user?.email}</p>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="mb-5 font-bold">{t("cycleSettings")}</h2>
        <div className="space-y-6">
          {([
            ["avg_cycle_length", t("avgCycleLen"), 21, 45],
            ["avg_period_length", t("avgPeriodLen"), 2, 10],
          ] as const).map(([key, label, min, max]) => (
            <div key={key}>
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span className="muted">{label}</span>
                <span className="font-black">{localeNum(form[key], locale)} {t("days")}</span>
              </div>
              <input
                type="range" min={min} max={max} value={form[key]} aria-label={label}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                className="w-full accent-[var(--color-glow-500)]"
              />
            </div>
          ))}
        </div>
        <div className="mt-4"><FormError>{error}</FormError></div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save}>{t("save")}</Button>
          <span role="status" className="text-sm font-bold text-[var(--color-mint-500)]">{saved ? t("saved") : ""}</span>
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="mb-5 font-bold">{t("language")} · {t("theme")}</h2>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium muted">{t("language")}</span>
            <div className="ms-auto flex gap-2">
              <Pill active={locale === "fa"} onClick={() => setLocale("fa")}>فارسی</Pill>
              <Pill active={locale === "en"} onClick={() => setLocale("en")}>English</Pill>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t pt-5">
            <span className="text-sm font-medium muted">{t("theme")}</span>
            <div className="ms-auto flex gap-2">
              <Pill active={theme === "light"} onClick={() => theme !== "light" && toggleTheme()}>
                <span className="flex items-center gap-1.5"><Icon.sun className="h-4 w-4" /> {t("themeLight")}</span>
              </Pill>
              <Pill active={theme === "dark"} onClick={() => theme !== "dark" && toggleTheme()}>
                <span className="flex items-center gap-1.5"><Icon.moon className="h-4 w-4" /> {t("themeDark")}</span>
              </Pill>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="font-bold">{t("installApp")}</h2>
        <p className="mt-2 text-sm muted">{t("installBody")}</p>
        <Button
          className="mt-5"
          variant="soft"
          disabled={!installEvent}
          onClick={() => {
            const e = installEvent as unknown as { prompt: () => void };
            e?.prompt();
            setInstallEvent(null);
          }}
        >
          {t("install")}
        </Button>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="mb-1 font-bold">{t("privacyData")}</h2>
        <p className="text-sm muted">{t("exportBody")}</p>
        <Button className="mt-4" variant="soft" size="sm" onClick={exportData} disabled={busy}>
          <Icon.download className="h-4 w-4" /> {t("exportData")}
        </Button>

        <div className="mt-6 border-t pt-5">
          <h3 className="font-bold text-[var(--color-glow-600)]">{t("deleteAccount")}</h3>
          <p className="mt-1 text-sm muted">{t("deleteAccountBody")}</p>
          {!confirming ? (
            <Button className="mt-4" variant="soft" size="sm" onClick={() => setConfirming(true)}>
              <Icon.trash className="h-4 w-4" /> {t("deleteAccount")}
            </Button>
          ) : (
            <div className="mt-4 space-y-3">
              <Field label={t("deleteConfirmLabel")}>
                <input type="password" dir="ltr" maxLength={72} className={inputCls} value={confirmPassword} autoComplete="current-password" onChange={(e) => setConfirmPassword(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" disabled={!confirmPassword || busy} onClick={deleteAccount}>{t("deleteForever")}</Button>
                <Button variant="ghost" size="sm" onClick={() => { setConfirming(false); setConfirmPassword(""); }}>{t("confirmCancel")}</Button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4"><FormError>{dataError}</FormError></div>
      </Card>

      <div className="mt-5 text-center">
        <Button variant="ghost" onClick={() => { signOut(); router.replace("/"); }}>{t("logout")}</Button>
      </div>
    </div>
  );
}
