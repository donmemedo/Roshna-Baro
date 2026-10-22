"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/shell";
import { useApp, useErrorText } from "@/components/providers";
import { Button, Card, ErrorState, FormError, Pill, Skeleton, softSpring } from "@/components/ui";
import { api, type FundStats } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { formatNum, localeNum } from "@/lib/i18n";

const AMOUNTS = [150000, 300000, 500000, 1000000];

export default function FundPage() {
  const { t, locale, refreshUser } = useApp();
  const errorText = useErrorText();
  const { data: fund, setData: setFund, error, reload } = useLoad(() => api.fund());
  const [amount, setAmount] = useState(300000);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (fund) setAmount(fund.monthly_amount);
    // only when the server value first arrives; later edits belong to the user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fund === null]);

  const act = async (fn: () => Promise<FundStats>) => {
    setBusy(true);
    setActionError("");
    try {
      setFund(await fn());
      await refreshUser();
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("fundTitle")} body={t("fundBody")} />

      {!fund && error != null && <ErrorState message={errorText(error)} retryLabel={t("retry")} onRetry={reload} />}
      {!fund && !error && (
        <div role="status" aria-label={t("loading")} className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-4xl" />)}
        </div>
      )}

      {fund && (
        <>
          {/* real figures only: member count, what members have pledged per month, partner clinics' average discount */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { value: formatNum(fund.members, locale), label: t("fundMembers"), tone: "var(--color-glow-500)" },
              { value: formatNum(fund.monthly_pledges_toman, locale), label: `${t("fundPool")} (${t("toman")})`, tone: "var(--color-aurora-500)" },
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

            <div className="mt-4"><FormError>{actionError}</FormError></div>
            <p className="mt-6 border-t pt-5 text-xs muted">{t("fundLegal")}</p>
          </Card>
        </>
      )}
    </div>
  );
}
