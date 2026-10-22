"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/shell";
import { useApp, useErrorText } from "@/components/providers";
import { Card, ErrorState, Pill, Skeleton, project, sheetSpring, softSpring } from "@/components/ui";
import { api, type Article, type ArticleSummary } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { localeNum } from "@/lib/i18n";

const CATS = [["fertility", "catFertility"], ["pregnancy", "catPregnancy"], ["postpartum", "catPostpartum"], ["mind", "catMind"]] as const;

export default function LearnPage() {
  const { t, locale } = useApp();
  const errorText = useErrorText();
  const { data, error, reload } = useLoad(() => api.articles());
  const articles = useMemo(() => data ?? [], [data]);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<ArticleSummary | null>(null);
  const [full, setFull] = useState<Article | null>(null);
  const [bodyError, setBodyError] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const list = articles.filter((a) => !cat || a.category === cat);

  // The list ships summaries only; the full text is fetched when an article is opened.
  useEffect(() => {
    setFull(null);
    setBodyError("");
    if (!open) return;
    let live = true;
    api.article(open.slug).then((a) => live && setFull(a)).catch((e) => live && setBodyError(errorText(e)));
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => { live = false; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(null);
    trigger.current?.focus();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("learnTitle")} body={t("learnBody")} />

      <div className="mb-5 flex flex-wrap gap-2">
        <Pill active={!cat} onClick={() => setCat("")}>{t("allServices")}</Pill>
        {CATS.map(([key, label]) => (
          <Pill key={key} active={cat === key} onClick={() => setCat(key)}>{t(label)}</Pill>
        ))}
      </div>

      {!data && error != null && <ErrorState message={errorText(error)} retryLabel={t("retry")} onRetry={reload} />}
      {!data && !error && (
        <div role="status" aria-label={t("loading")} className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-4xl" />)}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a, i) => (
          <Card key={a.id} className="p-0" transition={{ ...softSpring, delay: i * 0.04 }}>
            <button
              type="button"
              onClick={(e) => { trigger.current = e.currentTarget; setOpen(a); }}
              className="focusable block w-full rounded-4xl p-6 text-start"
            >
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-glow-500)]">
                {t((CATS.find(([k]) => k === a.category)?.[1] ?? "catFertility") as never)}
              </span>
              <h3 className="mt-2 text-lg font-bold">{locale === "fa" ? a.title_fa : a.title_en}</h3>
              <p className="mt-2 text-sm leading-relaxed muted">{locale === "fa" ? a.excerpt_fa : a.excerpt_en}</p>
              <p className="mt-4 text-[11px] muted">{localeNum(a.read_minutes, locale)} {t("readMin")}</p>
            </button>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center"
          >
            <motion.article
              role="dialog"
              aria-modal="true"
              aria-label={locale === "fa" ? open.title_fa : open.title_en}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={sheetSpring}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => info.offset.y + project(info.velocity.y) > 180 && close()}
              onClick={(e) => e.stopPropagation()}
              className="glass max-h-[85dvh] w-full overflow-y-auto rounded-t-4xl p-7 sm:max-w-xl sm:rounded-4xl"
            >
              <div aria-hidden className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/20 sm:hidden" />
              <h2 className="text-2xl font-black tracking-tight">{locale === "fa" ? open.title_fa : open.title_en}</h2>
              {full ? (
                <p className="mt-4 leading-relaxed muted">{locale === "fa" ? full.body_fa : full.body_en}</p>
              ) : bodyError ? (
                <p role="alert" className="mt-4 text-sm text-[var(--color-glow-600)]">{bodyError}</p>
              ) : (
                <div role="status" aria-label={t("loading")} className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-4/5" />
                </div>
              )}
              <button ref={closeBtn} onClick={close} className="pressable focusable mt-7 w-full rounded-full border py-3 text-sm font-bold">
                {t("close")}
              </button>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
