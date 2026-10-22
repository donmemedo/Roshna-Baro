"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { useApp, useErrorText } from "@/components/providers";
import { Card, Field, FormError, Skeleton, inputCls, softSpring } from "@/components/ui";
import { api } from "@/lib/api";
import { addDays, todayISO } from "@/lib/date";
import { formatDate, localeNum } from "@/lib/i18n";

type Timeline = Awaited<ReturnType<typeof api.pregnancy>>;
// same boundaries as the API: 1-13, 14-27, 28-40
const TRI = [[1, 13], [14, 27], [28, 40]] as const;

export default function PregnancyPage() {
  const { t, locale } = useApp();
  const errorText = useErrorText();
  const today = todayISO();
  const [lastPeriod, setLastPeriod] = useState("");
  const [data, setData] = useState<Timeline | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lastPeriod) return;
    let live = true;
    setError("");
    api.pregnancy(lastPeriod, todayISO())
      .then((d) => live && setData(d))
      .catch((e) => live && setError(errorText(e)));
    return () => { live = false; };
  }, [lastPeriod, errorText]);

  const c = data?.content as Record<string, string | number> | undefined;
  const progress = data ? Math.min(100, (data.week / 40) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("pregnancyTitle")} body={t("pregnancyBody")} />

      <Card className="p-6">
        <div className="max-w-xs">
          <Field label={t("lastPeriod")}>
            <input
              type="date" dir="ltr" className={inputCls} value={lastPeriod}
              min={addDays(today, -300)} max={today}
              onChange={(e) => e.target.value && setLastPeriod(e.target.value)}
            />
          </Field>
          <p className="mt-1.5 text-xs muted">{t("dateRangeHint")}</p>
        </div>
        <div className="mt-3"><FormError>{error}</FormError></div>
      </Card>

      {!lastPeriod && <p className="mt-5 text-center text-sm muted">{t("pickDate")}</p>}
      {lastPeriod && !data && !error && <Skeleton className="mt-5 h-48 rounded-4xl" />}

      {data && c && (
        <>
          <Card className="mt-5 overflow-hidden p-0">
            <div className="relative p-8 sm:p-10">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 opacity-60"
                style={{ background: "linear-gradient(120deg, rgba(248,67,127,0.16), rgba(109,92,246,0.16) 60%, rgba(20,184,148,0.16))" }}
              />
              <div className="flex flex-wrap items-center gap-8">
                <div className="relative grid h-36 w-36 shrink-0 place-items-center">
                  <svg viewBox="0 0 120 120" className="absolute h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-black/10 dark:stroke-white/10" />
                    <motion.circle
                      cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round"
                      stroke="var(--color-glow-500)" strokeDasharray={2 * Math.PI * 52}
                      initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - progress / 100) }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  <div className="text-center">
                    <div className="text-3xl font-black">{localeNum(data.week, locale)}</div>
                    <div className="text-[10px] muted">{t("week")}</div>
                  </div>
                </div>
                <div className="min-w-[12rem] flex-1">
                  <h2 className="text-2xl font-black tracking-tight">{locale === "fa" ? `${t("week")} ${localeNum(data.week, locale)} بارداری` : String(c.title_en)}</h2>
                  <p className="mt-2 text-sm muted">
                    {t("trimester")} {localeNum(data.trimester, locale)} · {t("babySize")}: <strong>{String(locale === "fa" ? c.size_fa : c.size_en)}</strong>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="glass rounded-full px-4 py-2 font-semibold">
                      {t("dueDate")}: {formatDate(data.due_date, locale)}
                    </span>
                    <span className="glass rounded-full px-4 py-2 font-semibold">
                      {localeNum(Math.max(0, data.days_left), locale)} {t("daysLeft")}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] muted">{t("disclaimer")}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-5 p-6">
            <h3 className="mb-2 font-bold">{t("weekFocus")}</h3>
            <p className="leading-relaxed muted">{String(locale === "fa" ? c.focus_fa : c.focus_en)}</p>
          </Card>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((tri) => (
              <Card key={tri} className="p-5" transition={{ ...softSpring, delay: tri * 0.05 }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold">{t("trimester")} {localeNum(tri, locale)}</span>
                  {data.trimester === tri && <span className="rounded-full bg-[var(--color-glow-500)] px-2 py-0.5 text-[10px] font-bold text-white">●</span>}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-glow-400),var(--color-aurora-500))]"
                    style={{ width: `${Math.max(0, Math.min(100, ((data.week - TRI[tri - 1][0] + 1) / (TRI[tri - 1][1] - TRI[tri - 1][0] + 1)) * 100))}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] muted">
                  {localeNum(TRI[tri - 1][0], locale)}–{localeNum(TRI[tri - 1][1], locale)} {t("week")}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
