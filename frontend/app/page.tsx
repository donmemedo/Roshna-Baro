"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Brand, LangToggle, ThemeToggle } from "@/components/shell";
import { Icon } from "@/components/icons";
import { useApp } from "@/components/providers";
import { Button, Card, SectionTitle, Stat, softSpring } from "@/components/ui";
import { api, type Community } from "@/lib/api";
import { formatNum, localeNum } from "@/lib/i18n";

const FAQ_FA = [
  ["آیا داده‌های من محرمانه می‌ماند؟", "بله. ارتباط شما با روشنا رمزنگاری می‌شود و داده‌های سلامت‌تان هیچ‌گاه بدون رضایت صریح شما با کسی به اشتراک گذاشته نمی‌شود. هر زمان می‌توانید از بخش تنظیمات نسخه داده‌ها را دریافت یا حساب را حذف کنید."],
  ["پیش‌بینی چقدر دقیق است؟", "دقت به تعداد چرخه‌های ثبت‌شده بستگی دارد. هرچه چرخه و داده‌های بیشتری ثبت کنید، درصد اطمینان پیش‌بینی بالاتر می‌رود. این پیش‌بینی جایگزین نظر پزشک نیست."],
  ["اگر چرخه‌ام نامنظم باشد چه؟", "الگوریتم نوسان چرخه را می‌سنجد و در صورت نیاز، زمان مراجعه به متخصص را به شما یادآوری می‌کند."],
  ["استفاده از آن رایگان است؟", "قابلیت‌های اصلی رایگان است. قابلیت‌های پرمیوم هنوز در دسترس نیست و در آینده اضافه می‌شود."],
];
const FAQ_EN = [
  ["Is my data private?", "Yes. Your connection to Roshana is encrypted and your health data is never shared without your explicit consent. You can download your data or delete your account from Settings at any time."],
  ["How accurate is the prediction?", "Accuracy grows with the cycles and data you log, and the confidence score shows it. A prediction never replaces a doctor's advice."],
  ["What if my cycle is irregular?", "The engine measures your variation and reminds you when a specialist visit is worth booking."],
  ["Is it free?", "Core features are free. Premium features are not available yet."],
];

export default function LandingPage() {
  const { t, locale, user } = useApp();
  const [stats, setStats] = useState<Community | null>(null);
  const [demo, setDemo] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    api.community().then(setStats).catch(() => {});
    api.health().then((h) => setDemo(h.demo)).catch(() => {});
  }, []);

  const faq = locale === "fa" ? FAQ_FA : FAQ_EN;

  return (
    <div className="relative z-10">
      <header className="sticky top-0 z-40 px-4 py-3 backdrop-blur-xl lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Brand />
          <div className="ms-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <Button href={user ? "/dashboard" : "/login"} size="sm" className="hidden sm:inline-flex">
              {user ? t("navDashboard") : t("ctaLogin")}
            </Button>
          </div>
        </div>
      </header>

      {/* hero */}
      <section ref={heroRef} className="relative px-4 pt-10 pb-20 lg:px-10 lg:pt-16">
        <motion.div style={{ y, opacity: fade }} className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={softSpring}
              className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--color-mint-500)] pulse-glow" />
              {t("tagline")}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...softSpring, delay: 0.05 }}
              className="text-balance text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            >
              {t("heroTitle").split("\n").map((line, i) => (
                <span key={i} className={i === 1 ? "grad-text block" : "block"}>
                  {line}
                </span>
              ))}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...softSpring, delay: 0.12 }}
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed muted sm:text-lg"
            >
              {t("heroBody")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...softSpring, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button href="/login?mode=signup" size="lg">
                {t("ctaStart")} <Icon.arrow className="h-5 w-5 rtl:rotate-180" />
              </Button>
              {demo && (
                <Button href="/login?demo=1" size="lg" variant="soft">
                  {t("ctaDemo")}
                </Button>
              )}
            </motion.div>

            {/* real numbers only, and only once there are enough to be meaningful */}
            {stats && stats.users >= 100 && (
              <div className="mt-12 grid max-w-md grid-cols-3 gap-6">
                <Stat value={formatNum(stats.users, locale)} label={t("statUsers")} />
                <Stat value={formatNum(stats.cycles_logged, locale)} label={t("statCycles")} accent="aurora" />
                <Stat value={localeNum(stats.clinics, locale)} label={t("statClinics")} accent="mint" />
              </div>
            )}
          </div>

          <HeroPreview />
        </motion.div>
      </section>

      {/* features */}
      <section className="px-4 py-16 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow={t("brand")} title={t("featuresTitle")} body={t("featuresBody")} />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Icon.spark, title: t("f1Title"), body: t("f1Body"), tone: "var(--color-glow-500)" },
              { icon: Icon.heart, title: t("f2Title"), body: t("f2Body"), tone: "var(--color-aurora-500)" },
              { icon: Icon.shield, title: t("f3Title"), body: t("f3Body"), tone: "var(--color-mint-500)" },
            ].map((f, i) => (
              <Card key={i} className="p-7" transition={{ ...softSpring, delay: i * 0.06 }}>
                <div
                  className="mb-5 grid h-12 w-12 place-items-center rounded-2xl text-white"
                  style={{ background: `linear-gradient(135deg, ${f.tone}, color-mix(in oklab, ${f.tone} 55%, #6d5cf6))` }}
                >
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* journey */}
      <section className="px-4 py-16 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <SectionTitle title={t("journeyTitle")} />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n, i) => (
              <Card key={n} className="flex gap-4 p-6" transition={{ ...softSpring, delay: i * 0.05 }}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-glow-500),var(--color-aurora-500))] text-sm font-black text-white">
                  {localeNum(n, locale)}
                </div>
                <div>
                  <h3 className="font-bold">{t(`journey${n}` as never)}</h3>
                  <p className="mt-1 text-sm muted">{t(`journey${n}b` as never)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* privacy */}
      <section className="px-4 py-16 lg:px-10">
        <Card className="mx-auto max-w-5xl overflow-hidden p-8 sm:p-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{t("privacyTitle")}</h2>
              <p className="mt-4 leading-relaxed muted">{t("privacyBody")}</p>
              <ul className="mt-6 space-y-3">
                {["privacyPoint1", "privacyPoint2", "privacyPoint3"].map((k) => (
                  <li key={k} className="flex items-center gap-3 text-sm font-medium">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-mint-500)] text-white">
                      <Icon.check className="h-3.5 w-3.5" />
                    </span>
                    {t(k as never)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative grid place-items-center">
              <div className="pulse-glow absolute h-48 w-48 rounded-full bg-[radial-gradient(circle,var(--color-mint-400),transparent_70%)] blur-2xl" />
              <Icon.shield className="relative h-40 w-40 stroke-[0.8] text-[var(--color-mint-500)]" />
            </div>
          </div>
        </Card>
      </section>

      {/* faq */}
      <section className="px-4 py-16 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <SectionTitle title={t("faqTitle")} />
          <div className="mt-10 space-y-3">
            {faq.map(([q, a], i) => (
              <Card key={i} sheen={false} className="overflow-hidden p-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="focusable flex w-full items-center gap-4 p-5 text-start font-bold"
                >
                  <span className="flex-1">{q}</span>
                  <motion.span animate={{ rotate: openFaq === i ? 45 : 0 }} transition={softSpring} className="text-2xl leading-none muted">
                    +
                  </motion.span>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={softSpring}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed muted">{a}</p>
                </motion.div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="px-4 pb-24 lg:px-10">
        <Card className="relative mx-auto max-w-4xl overflow-hidden p-10 text-center sm:p-16">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(248,67,127,0.18),rgba(109,92,246,0.18),rgba(20,184,148,0.18))]" />
          <h2 className="text-balance text-3xl font-black tracking-tight sm:text-4xl">{t("heroTitle").replace("\n", " ")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty muted">{t("heroBody")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/login?mode=signup" size="lg">{t("ctaStart")}</Button>
            {demo && <Button href="/login?demo=1" size="lg" variant="soft">{t("ctaDemo")}</Button>}
          </div>
        </Card>
      </section>

      <footer className="border-t px-4 py-10 text-center text-xs muted lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3">
          <Brand />
          <p className="max-w-lg text-pretty">{t("footerNote")}</p>
          <div className="flex gap-4">
            <Link href="/learn" className="hover:underline">{t("navLearn")}</Link>
            <Link href="/clinics" className="hover:underline">{t("navClinics")}</Link>
            <Link href="/fund" className="hover:underline">{t("navFund")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroPreview() {
  const { t, locale } = useApp();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...softSpring, delay: 0.15 }}
      className="relative"
    >
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="glass card-sheen rounded-[2.5rem] p-6 sm:p-8"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs muted">{t("todayIs")} · {t("sampleData")}</div>
            <div className="text-lg font-black">{t("phaseFertile")}</div>
          </div>
          <div className="rounded-full bg-[var(--color-mint-500)]/15 px-3 py-1 text-xs font-bold text-[var(--color-mint-500)]">
            {localeNum(93, locale)}% {t("confidence")}
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[260px]">
          <div className="pulse-glow absolute inset-6 rounded-full bg-[radial-gradient(circle,var(--color-mint-400),transparent_70%)] blur-2xl opacity-40" />
          <svg viewBox="0 0 320 320" className="relative h-full w-full">
            <circle cx="160" cy="160" r="128" fill="none" strokeWidth="20" className="stroke-black/8 dark:stroke-white/10" />
            <motion.circle
              cx="160" cy="160" r="128" fill="none" stroke="var(--color-glow-500)" strokeWidth="20" strokeLinecap="round"
              strokeDasharray="804" initial={{ strokeDashoffset: 804 }} animate={{ strokeDashoffset: 804 - 130 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }} transform="rotate(-90 160 160)"
            />
            <motion.circle
              cx="160" cy="160" r="128" fill="none" stroke="var(--color-mint-500)" strokeWidth="20" strokeLinecap="round"
              strokeDasharray="804" initial={{ strokeDashoffset: 804 }} animate={{ strokeDashoffset: 804 - 150 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.7 }} transform="rotate(60 160 160)"
            />
            <circle cx="160" cy="32" r="11" fill="var(--color-amber-glow)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="grad-text text-5xl font-black">{localeNum(33, locale)}%</div>
            <div className="mt-1 text-[11px] muted">{t("chanceToday")}</div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            [t("cycleDay"), localeNum(15, locale)],
            [t("nextPeriod"), locale === "fa" ? "۱۵ روز" : "15 d"],
            [t("regularity"), `${localeNum(88, locale)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border p-3">
              <div className="text-base font-black">{value}</div>
              <div className="mt-0.5 text-[10px] muted">{label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
