"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { PageHeader } from "@/components/shell";
import { useApp, useErrorText } from "@/components/providers";
import { Card, ErrorState, Progress, Skeleton, softSpring } from "@/components/ui";
import { api, type DailyLog } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { useLoad } from "@/lib/hooks";
import { formatDate, localeNum } from "@/lib/i18n";

export default function InsightsPage() {
  const { t, locale } = useApp();
  const errorText = useErrorText();
  const { data, error, reload } = useLoad(async () => {
    const today = todayISO();
    const [pred, cy, lg] = await Promise.all([api.insights(today), api.cycles(), api.logs(today)]);
    return { pred, cy, lg };
  });
  const p = data?.pred ?? null;
  const cycles = useMemo(() => data?.cy ?? [], [data]);
  const logs = useMemo(() => data?.lg ?? [], [data]);

  const lengths = useMemo(() => {
    const starts = cycles.map((c) => c.period_start).sort();
    return starts.slice(1).map((s, i) => ({
      label: formatDate(starts[i], locale),
      value: Math.round((new Date(s).getTime() - new Date(starts[i]).getTime()) / 86400000),
    }));
  }, [cycles, locale]);

  const upcoming = useMemo(() => (p ? p.calendar.filter((d) => d.day >= p.today).slice(0, 21) : []), [p]);
  const temps = useMemo(() => logs.filter((l) => l.temperature).slice(-21), [logs]);

  if (!p) {
    return error ? (
      <ErrorState message={errorText(error)} retryLabel={t("retry")} onRetry={reload} />
    ) : (
      <div role="status" aria-label={t("loading")} className="mx-auto max-w-6xl">
        <Skeleton className="mb-6 mt-2 h-8 w-48" />
        <div className="grid gap-5 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-4xl" />)}</div>
        <Skeleton className="mt-5 h-64 rounded-4xl" />
      </div>
    );
  }

  const maxChance = Math.max(0.01, ...upcoming.map((d) => d.conception_chance));
  const maxLen = Math.max(30, ...lengths.map((l) => l.value));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("insightsTitle")} />

      <div className="grid gap-5 lg:grid-cols-3">
        {[
          { label: t("confidence"), value: p.confidence, tone: "aurora" as const },
          { label: t("regularity"), value: p.regularity_score, tone: "mint" as const },
          { label: t("chanceToday"), value: Math.round(p.conception_chance_today * 100), tone: "glow" as const },
        ].map((m, i) => (
          <Card key={m.label} className="p-6" transition={{ ...softSpring, delay: i * 0.05 }}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold muted">{m.label}</span>
              <span className="text-2xl font-black">{localeNum(m.value, locale)}%</span>
            </div>
            <div className="mt-3"><Progress value={m.value} tone={m.tone} /></div>
          </Card>
        ))}
      </div>

      <Card className="mt-5 p-6">
        <h2 className="mb-1 font-bold">{locale === "fa" ? "احتمال بارداری در ۲۱ روز آینده" : "Conception odds — next 21 days"}</h2>
        <p className="mb-6 text-xs muted">{locale === "fa" ? "ارتفاع هر ستون، شانس نسبی بارداری در آن روز است." : "Each bar is the relative chance of conception on that day."}</p>
        <div role="img" aria-label={locale === "fa" ? "نمودار احتمال بارداری در ۲۱ روز آینده" : "Conception odds for the next 21 days"} className="flex h-44 items-end gap-1.5">
          {upcoming.map((d, i) => {
            const h = (d.conception_chance / maxChance) * 100;
            const color =
              d.phase === "ovulation" ? "var(--color-amber-glow)"
              : d.phase === "fertile" ? "var(--color-mint-500)"
              : d.phase === "period" ? "var(--color-glow-500)"
              : "var(--color-aurora-400)";
            return (
              <motion.div
                key={d.day}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(h, d.phase === "period" ? 14 : 4)}%` }}
                transition={{ ...softSpring, delay: i * 0.02 }}
                title={`${d.day} · ${Math.round(d.conception_chance * 100)}%`}
                className="min-h-1 flex-1 rounded-t-lg"
                style={{ background: color, opacity: d.conception_chance || d.phase === "period" ? 0.9 : 0.25 }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-[10px] muted">
          <span>{formatDate(upcoming[0]?.day, locale)}</span>
          <span>{formatDate(upcoming[upcoming.length - 1]?.day, locale)}</span>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-6 font-bold">{locale === "fa" ? "طول چرخه‌های گذشته" : "Past cycle lengths"}</h2>
          {lengths.length === 0 ? (
            <p className="text-sm muted">{t("empty")}</p>
          ) : (
            <div className="space-y-3">
              {lengths.map((l, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[11px] muted">{l.label}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(l.value / maxLen) * 100}%` }}
                      transition={{ ...softSpring, delay: i * 0.06 }}
                      className="flex h-full items-center justify-end rounded-xl bg-[linear-gradient(90deg,var(--color-glow-400),var(--color-aurora-500))] px-2 text-[11px] font-bold text-white"
                    >
                      {localeNum(l.value, locale)}
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-6 font-bold">{locale === "fa" ? "دمای پایه بدن" : "Basal body temperature"}</h2>
          {temps.length < 2 ? (
            <p className="text-sm muted">{t("empty")}</p>
          ) : (
            <TempChart temps={temps} />
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {p.insights.map((ins, i) => {
          const tone = ins.severity === "good" ? "var(--color-mint-500)" : ins.severity === "warn" ? "var(--color-glow-500)" : "var(--color-aurora-500)";
          return (
            <Card key={ins.key} className="p-5" transition={{ ...softSpring, delay: i * 0.05 }}>
              <span className="mb-3 inline-block h-1.5 w-10 rounded-full" style={{ background: tone }} />
              <h3 className="font-bold">{locale === "fa" ? ins.title_fa : ins.title_en}</h3>
              <p className="mt-2 text-sm leading-relaxed muted">{locale === "fa" ? ins.body_fa : ins.body_en}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TempChart({ temps }: { temps: DailyLog[] }) {
  const values = temps.map((t) => t.temperature as number);
  const min = Math.min(...values) - 0.1;
  const max = Math.max(...values) + 0.1;
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * 300;
    const y = 120 - ((v - min) / (max - min)) * 110;
    return `${x},${y}`;
  });
  return (
    <svg role="img" aria-label="Basal body temperature trend" viewBox="0 0 300 130" className="h-40 w-full overflow-visible">
      <defs>
        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-aurora-500)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-aurora-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,130 ${points.join(" ")} 300,130`} fill="url(#tempFill)" />
      <motion.polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--color-aurora-500)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      {points.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--color-aurora-500)" />;
      })}
    </svg>
  );
}
