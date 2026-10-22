"use client";

import { motion } from "framer-motion";
import type { Prediction } from "@/lib/api";
import { localeNum, type Locale } from "@/lib/i18n";
import { useApp } from "./providers";

const R = 132;
const C = 160;

function polar(angleDeg: number, radius: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) };
}

function arcPath(startDeg: number, endDeg: number, radius: number) {
  const s = polar(startDeg, radius);
  const e = polar(endDeg, radius);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
}

const dayDiff = (a: string, b: string) =>
  Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86400000);

export function CycleRing({ p }: { p: Prediction }) {
  const { t, locale, user } = useApp();
  const len = p.avg_cycle_length;
  const step = 360 / len;
  const cycleStart = p.next_period ? dayDiff(p.next_period, p.today) - len : -(p.cycle_day ?? 1) + 1;

  const dayToAngle = (offsetFromToday: number) => (offsetFromToday - cycleStart) * step;
  const periodLen = user?.avg_period_length ?? 5;

  const segments = [
    { key: "period", from: 0, to: periodLen * step, color: "var(--color-glow-500)" },
    p.fertile_start && p.fertile_end
      ? {
          key: "fertile",
          from: dayToAngle(dayDiff(p.fertile_start, p.today)),
          to: dayToAngle(dayDiff(p.fertile_end, p.today)) + step,
          color: "var(--color-mint-500)",
        }
      : null,
  ].filter(Boolean) as { key: string; from: number; to: number; color: string }[];

  const todayAngle = dayToAngle(0);
  const ovAngle = p.ovulation_day ? dayToAngle(dayDiff(p.ovulation_day, p.today)) + step / 2 : null;
  const marker = polar(todayAngle + step / 2, R);
  const chance = Math.round(p.conception_chance_today * 100);
  const phaseLabel = t((`phase${p.phase.charAt(0).toUpperCase()}${p.phase.slice(1)}`) as never);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <div
        aria-hidden
        className="pulse-glow absolute inset-8 rounded-full blur-2xl"
        style={{
          background:
            p.phase === "fertile" || p.phase === "ovulation"
              ? "radial-gradient(circle,var(--color-mint-400),transparent 68%)"
              : "radial-gradient(circle,var(--color-glow-400),transparent 68%)",
          opacity: 0.35,
        }}
      />
      <svg viewBox="0 0 320 320" className="relative h-full w-full -rotate-0">
        <circle cx={C} cy={C} r={R} fill="none" strokeWidth={18} className="stroke-black/8 dark:stroke-white/10" />

        {segments.map((seg, i) => (
          <motion.path
            key={seg.key}
            d={arcPath(seg.from, Math.min(seg.to, seg.from + 359), R)}
            fill="none"
            stroke={seg.color}
            strokeWidth={18}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}

        {/* day ticks */}
        {Array.from({ length: len }).map((_, i) => {
          const a = i * step + step / 2;
          const inner = polar(a, R - 26);
          const outer = polar(a, R - 21);
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              strokeWidth={i % 7 === 0 ? 2.5 : 1}
              className="stroke-black/20 dark:stroke-white/25"
            />
          );
        })}

        {ovAngle !== null && (
          <motion.circle
            cx={polar(ovAngle, R).x}
            cy={polar(ovAngle, R).y}
            r={9}
            fill="var(--color-amber-glow)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.7 }}
            style={{ transformOrigin: `${polar(ovAngle, R).x}px ${polar(ovAngle, R).y}px` }}
          />
        )}

        <motion.g
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.55 }}
          style={{ transformOrigin: `${marker.x}px ${marker.y}px` }}
        >
          <circle cx={marker.x} cy={marker.y} r={16} fill="var(--color-aurora-500)" opacity={0.25} />
          <circle cx={marker.x} cy={marker.y} r={8} fill="#fff" stroke="var(--color-aurora-500)" strokeWidth={4} />
        </motion.g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-xs font-semibold tracking-wide muted"
        >
          {phaseLabel}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.4 }}
          className="grad-text text-6xl font-black tabular-nums"
        >
          {localeNum(chance, locale as Locale)}%
        </motion.div>
        <div className="mt-1 max-w-[9rem] text-[11px] leading-tight muted">{t("chanceToday")}</div>
        {p.cycle_day !== null && (
          <div className="mt-3 rounded-full border px-3 py-1 text-[11px] font-semibold">
            {t("cycleDay")} {localeNum(p.cycle_day, locale as Locale)}
          </div>
        )}
      </div>
    </div>
  );
}
