"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import { forwardRef } from "react";

// Apple's two-parameter springs: bounce 0 is critically damped (no overshoot), duration is the response.
// Default for everything a user can touch; bounce is reserved for motion that follows a flick.
export const spring = { type: "spring" as const, duration: 0.4, bounce: 0 };
export const softSpring = { type: "spring" as const, duration: 0.5, bounce: 0 };
export const sheetSpring = { type: "spring" as const, duration: 0.35, bounce: 0.15 };

/** Where a flick would come to rest (UIScrollView deceleration), used to decide whether a drag dismisses. */
export function project(velocity: number, deceleration = 0.998) {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

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
      aria-pressed={active}
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

/** Placeholder that keeps the layout stable while data loads (shown instead of a bare spinner). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton relative overflow-hidden rounded-2xl bg-black/6 dark:bg-white/8", className)} />;
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="mx-auto max-w-6xl">
      <Skeleton className="mb-3 mt-2 h-8 w-56" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Skeleton className="h-96 rounded-4xl" />
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-4xl" />)}
          </div>
          <Skeleton className="h-32 rounded-4xl" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-16 max-w-sm text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-glow-500)]/12 text-[var(--color-glow-500)]">!</div>
      <p className="text-sm muted">{message}</p>
      {onRetry && <Button variant="soft" size="sm" className="mt-5" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  );
}

/** Inline error line for forms; announced to screen readers. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-2xl bg-[var(--color-glow-500)]/10 px-4 py-3 text-sm text-[var(--color-glow-600)]">{children}</p>;
}
