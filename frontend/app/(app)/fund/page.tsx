"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/shell";
import { useApp } from "@/components/providers";
import { Button, Card, Pill, softSpring } from "@/components/ui";
import { api, type FundStats } from "@/lib/api";
import { formatNum, localeNum } from "@/lib/i18n";

const AMOUNTS = [150000, 300000, 500000, 1000000];

export default function FundPage() {
  const { t, locale, refreshUser } = useApp();
  const [fund, setFund] = useState<FundStats | null>(null);
  const [amount, setAmount] = useState(300000);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.fund().then((f) => { setFund(f); setAmount(f.monthly_amount); }).catch(() => {});
  }, []);

  const act = async (fn: () => Promise<FundStats>) => {
    setBusy(true);
    try {
      setFund(await fn());
      await refreshUser();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("fundTitle")} body={t("fundBody")} />

      {fund && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: formatNum(fund.members, locale), label: t("fundMembers"), tone: "var(--color-glow-500)" },
              { value: `${formatNum(Math.round(fund.pool_toman / 1_000_000), locale)}M`, label: `${t("fundPool")} (${t("toman")})`, tone: "var(--color-aurora-500)" },
              { value: formatNum(fund.treatments_funded, locale), label: t("fundTreatments"), tone: "var(--color-mint-500)" },
              { value: `${localeNum(fund.avg_discount, locale)}%`, label: t("fundDiscount"), tone: "var(--color-amber-glow)" },
            ].map((s, i) => (
              <Card key={s.label} className="p-6 text-center" transition={{ ...softSpring, delay: i * 0.05 }}>
                <div className="text-3xl font-black tracking-tight" style={{ color: s.tone }}>{s.value}</div>
                <div className="mt-1 text-xs muted">{s.label}</div>
              </Card>
            ))}
          </div>

          <Card className="mt-5 p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-mint-500),var(--color-aurora-500))] text-white">
                <Icon.shield />
              </span>
              <div>
                <h2 className="font-bold">{fund.is_member ? t("youAreMember") : t("joinFund")}</h2>
                <p className="text-xs muted">{t("monthlyAmount")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {AMOUNTS.map((a) => (
                <Pill key={a} active={amount === a} onClick={() => setAmount(a)}>
                  {formatNum(a, locale)} {t("toman")}
                </Pill>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => act(() => api.joinFund(amount))} disabled={busy}>
                {fund.is_member ? t("save") : t("joinFund")}
              </Button>
              {fund.is_member && (
                <Button variant="soft" onClick={() => act(() => api.leaveFund())} disabled={busy}>
                  {t("leaveFund")}
                </Button>
              )}
            </div>

            <p className="mt-6 border-t pt-5 text-xs muted">{t("fundLegal")}</p>
          </Card>
        </>
      )}
    </div>
  );
}
