"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { CycleRing } from "@/components/cycle-ring";
import { Icon } from "@/components/icons";
import { useApp, useErrorText } from "@/components/providers";
import { Button, Card, ErrorState, PageSkeleton, Progress, softSpring } from "@/components/ui";
import { ApiError, api, type DailyLog } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { useLoad } from "@/lib/hooks";
import { formatDate, localeNum } from "@/lib/i18n";

export default function DashboardPage() {
  const { t, locale, user } = useApp();
  const errorText = useErrorText();
  const { data: p, error, reload } = useLoad(() => api.insights(todayISO()));
  const [saved, setSaved] = useState("");
  const [saveError, setSaveError] = useState("");

  // Sends only what was tapped. The server merges it, so temperature, mood and notes
  // already saved for today are never wiped by a quick-log tap.
  const quickLog = async (patch: Partial<DailyLog>) => {
    setSaveError("");
    try {
      await api.saveLog({ log_date: todayISO(), ...patch });
      setSaved(t("saved"));
      setTimeout(() => setSaved(""), 2000);
      reload();
    } catch (e) {
      setSaveError(errorText(e));
    }
  };

  // A period start changes the prediction only if it becomes a cycle; the flow flag alone is not read by the engine.
  const logPeriod = async () => {
    setSaveError("");
    try {
      try {
        await api.addCycle({ period_start: todayISO() });
      } catch (e) {
        if (!(e instanceof ApiError && e.code === "duplicate")) throw e; // already logged today: fine
      }
      await api.saveLog({ log_date: todayISO(), flow: "medium" });
      setSaved(t("saved"));
      setTimeout(() => setSaved(""), 2000);
      reload();
    } catch (e) {
      setSaveError(errorText(e));
    }
  };

  if (!p) {
    return error ? (
      <ErrorState message={errorText(error)} retryLabel={t("retry")} onRetry={reload} />
    ) : (
      <PageSkeleton label={t("loading")} />
    );
  }

  const tiles = [
    { label: t("nextPeriod"), value: formatDate(p.next_period, locale), icon: Icon.cycle, tone: "var(--color-glow-500)" },
    { label: t("ovulationDay"), value: formatDate(p.ovulation_day, locale), icon: Icon.spark, tone: "var(--color-amber-glow)" },
    {
      label: t("fertileWindow"),
      value: p.fertile_start ? `${formatDate(p.fertile_start, locale)} — ${formatDate(p.fertile_end, locale)}` : "—",
      icon: Icon.heart, tone: "var(--color-mint-500)",
    },
    { label: t("avgCycle"), value: `${localeNum(p.avg_cycle_length, locale)} ${t("days")}`, icon: Icon.chart, tone: "var(--color-aurora-500)" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={softSpring} className="mb-6 pt-2">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {t("hello")} {user?.display_name} 👋
        </h1>
        <p className="mt-1 text-sm muted">
          {t("todayIs")} — {formatDate(p.today, locale)}
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="p-6" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} whileInView={undefined}>
          <CycleRing p={p} />
          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="muted">{t("confidence")}</span>
                <span>{localeNum(p.confidence, locale)}%</span>
              </div>
              <Progress value={p.confidence} tone="aurora" />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="muted">{t("regularity")}</span>
                <span>{localeNum(p.regularity_score, locale)}%</span>
              </div>
              <Progress value={p.regularity_score} tone="mint" />
            </div>
          </div>
          <p className="mt-5 text-[11px] leading-relaxed muted">{t("disclaimer")}</p>
        </Card>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {tiles.map((tile, i) => (
              <Card key={tile.label} className="p-5" transition={{ ...softSpring, delay: i * 0.04 }}>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: tile.tone }}>
                    <tile.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-xs font-semibold muted">{tile.label}</span>
                </div>
                <div className="mt-3 text-lg font-black tracking-tight">{tile.value}</div>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{t("quickLog")}</h2>
              <span role="status" className="text-xs font-bold text-[var(--color-mint-500)]">{saved}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" size="sm" onClick={logPeriod}>🩸 {t("legendPeriod")}</Button>
              <Button variant="soft" size="sm" onClick={() => quickLog({ intercourse: true })}>💞 {t("intercourse")}</Button>
              <Button variant="soft" size="sm" onClick={() => quickLog({ opk_positive: true })}>🧪 {t("opk")}</Button>
              <Button variant="soft" size="sm" href="/cycle">➕ {t("logToday")}</Button>
            </div>
            {saveError && <p role="alert" className="mt-3 text-sm text-[var(--color-glow-600)]">{t("saveFailed")}: {saveError}</p>}
          </Card>

          {p.referral_recommended && (
            <Card className="border-[var(--color-glow-400)]/40 p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-glow-500)] text-white">
                  <Icon.pin />
                </span>
                <div className="min-w-[14rem] flex-1">
                  <h3 className="font-bold">{t("referralTitle")}</h3>
                  <p className="mt-1 text-sm muted">{t("referralBody")}</p>
                  <p className="mt-1 text-xs muted">{t("referralDisclosure")}</p>
                </div>
                <Button href="/clinics" size="sm">{t("seeClinics")}</Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-black tracking-tight">{t("insightsTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {p.insights.map((ins, i) => {
            const tone =
              ins.severity === "good" ? "var(--color-mint-500)" : ins.severity === "warn" ? "var(--color-glow-500)" : "var(--color-aurora-500)";
            return (
              <Card key={ins.key} className="p-5" transition={{ ...softSpring, delay: i * 0.05 }}>
                <span className="mb-3 inline-block h-1.5 w-10 rounded-full" style={{ background: tone }} />
                <h3 className="font-bold">{locale === "fa" ? ins.title_fa : ins.title_en}</h3>
                <p className="mt-2 text-sm leading-relaxed muted">{locale === "fa" ? ins.body_fa : ins.body_en}</p>
              </Card>
            );
          })}
        </div>
        <div className="mt-5">
          <Link href="/insights" className="focusable inline-flex items-center gap-2 text-sm font-bold text-[var(--color-glow-500)]">
            {t("navInsights")} <Icon.arrow className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
