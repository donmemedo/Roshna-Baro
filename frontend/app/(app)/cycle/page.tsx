"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shell";
import { useApp, useErrorText } from "@/components/providers";
import { Button, Card, ErrorState, Field, FormError, Pill, Skeleton, cx, inputCls, softSpring } from "@/components/ui";
import { api, type DailyLog } from "@/lib/api";
import { localISO, parseDecimal, todayISO } from "@/lib/date";
import { useLoad } from "@/lib/hooks";
import { formatDate, localeNum, weekdayShort, type TKey } from "@/lib/i18n";

const PHASE_COLOR: Record<string, string> = {
  period: "var(--color-glow-500)",
  fertile: "var(--color-mint-500)",
  ovulation: "var(--color-amber-glow)",
  luteal: "var(--color-aurora-400)",
  follicular: "transparent",
};
const PHASE_LABEL: Record<string, TKey> = {
  period: "legendPeriod", fertile: "legendFertile", ovulation: "legendOvulation", luteal: "legendLuteal",
};

const SYMPTOMS = [
  ["cramps", "دل‌درد", "Cramps"], ["headache", "سردرد", "Headache"], ["bloating", "نفخ", "Bloating"],
  ["acne", "جوش", "Acne"], ["fatigue", "خستگی", "Fatigue"], ["energy", "پرانرژی", "Energetic"],
  ["tender", "حساسیت سینه", "Tender breasts"], ["nausea", "تهوع", "Nausea"],
];
const MOODS = [["calm", "آرام", "Calm"], ["happy", "شاد", "Happy"], ["low", "بی‌حوصله", "Low"], ["anxious", "مضطرب", "Anxious"]];
const FLOWS = [["light", "کم", "Light"], ["medium", "متوسط", "Medium"], ["heavy", "زیاد", "Heavy"]];

// Day numbers follow the calendar the dates are shown in (Jalali for Persian), not the Gregorian day.
const dayNumber = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : "en-GB", { day: "numeric" }).format(d);

const blankLog = (date: string): DailyLog => ({
  log_date: date, temperature: null, opk_positive: null, intercourse: false, mood: null, flow: null, symptoms: "", note: "",
});

export default function CyclePage() {
  const { t, locale } = useApp();
  const errorText = useErrorText();
  const today = todayISO();
  const { data, error, reload } = useLoad(async () => {
    const [pred, cy, lg] = await Promise.all([api.insights(todayISO()), api.cycles(), api.logs(todayISO())]);
    return { pred, cy, lg };
  });
  const [selected, setSelected] = useState(today);
  const [newStart, setNewStart] = useState(today);
  const [form, setForm] = useState<DailyLog>(blankLog(today));
  const [tempText, setTempText] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [cycleError, setCycleError] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const logs = data?.lg;
  useEffect(() => {
    const found = logs?.find((l) => l.log_date === selected);
    const next = found ? { ...found } : blankLog(selected);
    setForm(next);
    setTempText(next.temperature != null ? String(next.temperature) : "");
    setFormError("");
  }, [selected, logs]);

  const byDay = useMemo(() => new Map(data?.pred.calendar.map((d) => [d.day, d.phase]) ?? []), [data]);
  const logged = useMemo(() => new Set(logs?.map((l) => l.log_date) ?? []), [logs]);

  const grid = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 20);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  if (!data) {
    return error ? (
      <ErrorState message={errorText(error)} retryLabel={t("retry")} onRetry={reload} />
    ) : (
      <div role="status" aria-label={t("loading")} className="mx-auto max-w-6xl">
        <Skeleton className="mb-6 mt-2 h-8 w-48" />
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <Skeleton className="h-96 rounded-4xl" />
          <Skeleton className="h-96 rounded-4xl" />
        </div>
      </div>
    );
  }

  const saveLog = async () => {
    setFormError("");
    const temperature = tempText.trim() === "" ? null : parseDecimal(tempText);
    // "abc" or "36/6" must not silently erase or mangle the saved value
    if (tempText.trim() !== "" && (temperature === null || temperature < 34 || temperature > 42)) {
      setFormError(`${t("temperature")}: 34 – 42 °C`);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await api.saveLog({ ...form, id: undefined, log_date: selected, temperature });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      reload();
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const addCycle = async () => {
    if (busy) return;
    setBusy(true);
    setCycleError("");
    try {
      await api.addCycle({ period_start: newStart });
      reload();
    } catch (e) {
      setCycleError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const removeCycle = async (id: number) => {
    setCycleError("");
    try {
      await api.deleteCycle(id);
      setConfirmId(null);
      reload();
    } catch (e) {
      setCycleError(errorText(e));
    }
  };

  const toggleSymptom = (key: string) => {
    const list = form.symptoms ? form.symptoms.split(",").filter(Boolean) : [];
    const next = list.includes(key) ? list.filter((s) => s !== key) : [...list, key];
    setForm({ ...form, symptoms: next.join(",") });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("cycleTitle")} body={t("cycleBody")} />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-bold">{t("calendarTitle")}</h2>
          <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-[10px] muted" aria-hidden>
            {grid.slice(0, 7).map((d) => (
              <div key={localISO(d)}>{weekdayShort(d, locale)}</div>
            ))}
          </div>
          {/* one animation for the whole grid: 42 individually staggered springs cost more than they add */}
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={softSpring}
            className="grid grid-cols-7 gap-1.5"
          >
            {grid.map((d) => {
              const iso = localISO(d);
              const phase = byDay.get(iso) || "follicular";
              const isToday = iso === today;
              const isSelected = iso === selected;
              const future = iso > today;
              const phaseKey = PHASE_LABEL[phase];
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={future}
                  onClick={() => setSelected(iso)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${formatDate(iso, locale)}${phaseKey ? `, ${t(phaseKey)}` : ""}${future ? `, ${t("futureDay")}` : ""}`}
                  className={cx(
                    "pressable focusable relative aspect-square rounded-2xl border text-xs font-bold transition",
                    isSelected && "ring-2 ring-[var(--color-aurora-500)]",
                    isToday && "border-[var(--color-aurora-500)]",
                    future && "cursor-default opacity-80 active:scale-100",
                  )}
                  style={
                    phase === "follicular"
                      ? undefined
                      : { background: `color-mix(in oklab, ${PHASE_COLOR[phase]} ${phase === "ovulation" ? 85 : 55}%, transparent)`, color: "#fff", borderColor: "transparent" }
                  }
                >
                  {dayNumber(d, locale)}
                  {logged.has(iso) && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />}
                </button>
              );
            })}
          </motion.div>
          <div className="mt-5 flex flex-wrap gap-4 text-[11px] muted">
            {[["legendPeriod", "period"], ["legendFertile", "fertile"], ["legendOvulation", "ovulation"], ["legendLuteal", "luteal"]].map(([label, key]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PHASE_COLOR[key] }} />
                {t(label as TKey)}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{t("logTitle")}</h2>
            <span className="text-xs font-semibold muted">{formatDate(selected, locale)}</span>
          </div>

          <div className="space-y-5">
            <Field label={t("temperature")} hint="°C">
              {/* text + decimal keypad: type="number" rejects Persian digits and the Persian decimal mark */}
              <input
                type="text" inputMode="decimal" dir="ltr" className={inputCls} placeholder="36.60"
                value={tempText} onChange={(e) => setTempText(e.target.value)} maxLength={5}
              />
            </Field>

            <div role="group" aria-label={t("flow")}>
              <span className="mb-2 block text-sm font-medium muted">{t("flow")}</span>
              <div className="flex flex-wrap gap-2">
                {FLOWS.map(([key, fa, en]) => (
                  <Pill key={key} active={form.flow === key} onClick={() => setForm({ ...form, flow: form.flow === key ? null : key })}>
                    {locale === "fa" ? fa : en}
                  </Pill>
                ))}
              </div>
            </div>

            <div role="group" aria-label={t("mood")}>
              <span className="mb-2 block text-sm font-medium muted">{t("mood")}</span>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(([key, fa, en]) => (
                  <Pill key={key} active={form.mood === key} onClick={() => setForm({ ...form, mood: form.mood === key ? null : key })}>
                    {locale === "fa" ? fa : en}
                  </Pill>
                ))}
              </div>
            </div>

            <div role="group" aria-label={t("symptoms")}>
              <span className="mb-2 block text-sm font-medium muted">{t("symptoms")}</span>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map(([key, fa, en]) => (
                  <Pill key={key} active={(form.symptoms ?? "").split(",").includes(key)} onClick={() => toggleSymptom(key)}>
                    {locale === "fa" ? fa : en}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill active={!!form.opk_positive} onClick={() => setForm({ ...form, opk_positive: !form.opk_positive })}>
                🧪 {t("opk")}
              </Pill>
              <Pill active={!!form.intercourse} onClick={() => setForm({ ...form, intercourse: !form.intercourse })}>
                💞 {t("intercourse")}
              </Pill>
            </div>

            <Field label={t("note")}>
              <input className={inputCls} maxLength={500} value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>

            <FormError>{formError}</FormError>
            <div className="flex items-center gap-3">
              <Button onClick={saveLog} disabled={busy}>{t("save")}</Button>
              <span role="status" className="text-sm font-bold text-[var(--color-mint-500)]">{saved ? t("saved") : ""}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-6">
        <h2 className="mb-4 font-bold">{t("addPeriod")}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <Field label={t("periodStart")}>
              <input
                type="date" dir="ltr" className={inputCls} value={newStart} min="1990-01-01" max={today}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </Field>
          </div>
          <Button onClick={addCycle} disabled={busy}>{t("save")}</Button>
        </div>
        <div className="mt-3"><FormError>{cycleError}</FormError></div>

        <div className="mt-6 space-y-2">
          {data.cy.length === 0 && <p className="text-sm muted">{t("noCycles")}</p>}
          {[...data.cy].reverse().map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-glow-500)]" />
              <span className="font-semibold">{formatDate(c.period_start, locale)}</span>
              {confirmId === c.id ? (
                <span className="ms-auto flex items-center gap-3 text-xs font-bold">
                  <span className="muted">{t("confirmDeleteQ")}</span>
                  <button onClick={() => removeCycle(c.id)} className="focusable text-[var(--color-glow-600)] hover:underline">{t("confirmYesDelete")}</button>
                  <button onClick={() => setConfirmId(null)} className="focusable muted hover:underline">{t("confirmCancel")}</button>
                </span>
              ) : (
                <button onClick={() => setConfirmId(c.id)} className="focusable ms-auto text-xs font-bold text-[var(--color-glow-600)] hover:underline">
                  {t("delete")}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
