"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { useApp } from "@/components/providers";
import { Card, Pill, softSpring } from "@/components/ui";
import { api, type Article } from "@/lib/api";
import { localeNum } from "@/lib/i18n";

const CATS = [["fertility", "catFertility"], ["pregnancy", "catPregnancy"], ["postpartum", "catPostpartum"], ["mind", "catMind"]] as const;

export default function LearnPage() {
  const { t, locale } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<Article | null>(null);

  useEffect(() => { api.articles().then(setArticles).catch(() => {}); }, []);

  const list = articles.filter((a) => !cat || a.category === cat);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("learnTitle")} body={t("learnBody")} />

      <div className="mb-5 flex flex-wrap gap-2">
        <Pill active={!cat} onClick={() => setCat("")}>{t("allServices")}</Pill>
        {CATS.map(([key, label]) => (
          <Pill key={key} active={cat === key} onClick={() => setCat(key)}>{t(label)}</Pill>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a, i) => (
          <Card key={a.id} className="cursor-pointer p-6" transition={{ ...softSpring, delay: i * 0.04 }} onClick={() => setOpen(a)}>
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-glow-500)]">
              {t((CATS.find(([k]) => k === a.category)?.[1] ?? "catFertility") as never)}
            </span>
            <h3 className="mt-2 text-lg font-bold">{locale === "fa" ? a.title_fa : a.title_en}</h3>
            <p className="mt-2 text-sm leading-relaxed muted">{locale === "fa" ? a.excerpt_fa : a.excerpt_en}</p>
            <p className="mt-4 text-[11px] muted">{localeNum(a.read_minutes, locale)} {t("readMin")}</p>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-50 grid place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center"
          >
            <motion.article
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={softSpring}
              onClick={(e) => e.stopPropagation()}
              className="glass max-h-[85dvh] w-full overflow-y-auto rounded-t-4xl p-7 sm:max-w-xl sm:rounded-4xl"
            >
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/20 sm:hidden" />
              <h2 className="text-2xl font-black tracking-tight">{locale === "fa" ? open.title_fa : open.title_en}</h2>
              <p className="mt-4 leading-relaxed muted">{locale === "fa" ? open.body_fa : open.body_en}</p>
              <button onClick={() => setOpen(null)} className="pressable focusable mt-7 w-full rounded-full border py-3 text-sm font-bold">
                {t("cancel")}
              </button>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
