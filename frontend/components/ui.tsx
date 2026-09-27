"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import { forwardRef } from "react";

export const spring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.9 };
export const softSpring = { type: "spring" as const, stiffness: 180, damping: 26 };

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
  sheen = true,
  ...rest
}: HTMLMotionProps<"div"> & { sheen?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={softSpring}
      className={cx("glass rounded-4xl", sheen && "card-sheen", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type ButtonProps = {
  variant?: "primary" | "ghost" | "soft" | "danger";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

const variants = {
  primary:
    "text-white shadow-[0_14px_36px_-12px_rgba(248,67,127,0.65)] bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))] hover:brightness-110",
  soft: "glass hover:brightness-[1.04]",
  ghost: "hover:bg-black/5 dark:hover:bg-white/10",
  danger: "text-white bg-[linear-gradient(110deg,#e01d61,#b8104c)]",
};

const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-[15px]", lg: "h-14 px-8 text-base" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", href, className, children, ...rest },
  ref,
) {
  const cls = cx(
    "pressable focusable inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} {...rest}>
      {children}
    </button>
  );
});

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-2xl border bg-white/60 dark:bg-white/5 px-4 h-12 outline-none transition focus:border-[var(--color-glow-400)] focus:ring-4 focus:ring-[var(--color-glow-400)]/15";

export function Stat({
  value,
  label,
  accent = "glow",
}: {
  value: string;
  label: string;
  accent?: "glow" | "aurora" | "mint";
}) {
  const colors = {
    glow: "var(--color-glow-500)",
    aurora: "var(--color-aurora-500)",
    mint: "var(--color-mint-500)",
  };
  return (
    <div className="text-center">
      <div className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: colors[accent] }}>
        {value}
      </div>
      <div className="mt-1 text-xs muted sm:text-sm">{label}</div>
    </div>
  );
}

export function Pill({
  active,
  children,
  ...rest
}: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cx(
        "pressable focusable h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition",
        active
          ? "border-transparent bg-[linear-gradient(110deg,var(--color-glow-500),var(--color-aurora-500))] text-white"
          : "hover:bg-black/5 dark:hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

export function Progress({ value, tone = "glow" }: { value: number; tone?: "glow" | "mint" | "aurora" }) {
  const bg = {
    glow: "linear-gradient(90deg,var(--color-glow-400),var(--color-glow-600))",
    mint: "linear-gradient(90deg,var(--color-mint-400),var(--color-mint-500))",
    aurora: "linear-gradient(90deg,var(--color-aurora-400),var(--color-aurora-600))",
  }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={softSpring}
        className="h-full rounded-full"
        style={{ background: bg }}
      />
    </div>
  );
}

export function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <div className="mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide muted">
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl font-black tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-base muted text-pretty">{body}</p>}
    </div>
  );
}
