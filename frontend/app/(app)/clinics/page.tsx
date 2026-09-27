"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/shell";
import { useApp } from "@/components/providers";
import { Card, Pill, softSpring } from "@/components/ui";
import { api, type Clinic } from "@/lib/api";
import { localeNum } from "@/lib/i18n";

const SERVICES = [["ivf", "svcIvf"], ["iui", "svcIui"], ["lab", "svcLab"], ["counseling", "svcCounseling"]] as const;

export default function ClinicsPage() {
  const { t, locale } = useApp();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [city, setCity] = useState<string>("");
  const [service, setService] = useState<string>("");

  useEffect(() => { api.clinics().then(setClinics).catch(() => {}); }, []);

  const cities = useMemo(
    () => Array.from(new Set(clinics.map((c) => (locale === "fa" ? c.city_fa : c.city_en)))),
    [clinics, locale],
  );

  const filtered = clinics.filter(
    (c) =>
      (!city || (locale === "fa" ? c.city_fa : c.city_en) === city) &&
      (!service || c.services.split(",").includes(service)),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("clinicsTitle")} body={t("clinicsBody")} />

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Pill active={!city} onClick={() => setCity("")}>{t("allCities")}</Pill>
          {cities.map((cityName) => (
            <Pill key={cityName} active={city === cityName} onClick={() => setCity(cityName)}>{cityName}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill active={!service} onClick={() => setService("")}>{t("allServices")}</Pill>
          {SERVICES.map(([key, label]) => (
            <Pill key={key} active={service === key} onClick={() => setService(key)}>{t(label)}</Pill>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((c, i) => (
          <Card key={c.id} className="p-6" transition={{ ...softSpring, delay: i * 0.04 }}>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-glow-500),var(--color-aurora-500))] text-white">
                <Icon.pin />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold">{locale === "fa" ? c.name_fa : c.name_en}</h3>
                <p className="text-xs muted">{locale === "fa" ? c.city_fa : c.city_en}</p>
              </div>
              <span className="rounded-full bg-[var(--color-amber-glow)]/15 px-2.5 py-1 text-xs font-black text-[var(--color-amber-glow)]">
                ★ {localeNum(c.rating.toFixed(1), locale)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.services.split(",").map((s) => {
                const found = SERVICES.find(([key]) => key === s);
                return found ? (
                  <span key={s} className="rounded-full border px-2.5 py-1 text-[11px] font-semibold muted">{t(found[1])}</span>
                ) : null;
              })}
            </div>

            {locale === "fa" && c.address_fa && (
              <p className="mt-4 text-xs muted"><strong>{t("address")}:</strong> {c.address_fa}</p>
            )}

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-sm font-bold text-[var(--color-mint-500)]">
                {t("discount")} {localeNum(c.partner_discount, locale)}%
              </span>
              <a href={`tel:${c.phone}`} dir="ltr" className="pressable focusable rounded-full border px-4 py-2 text-xs font-bold">
                {c.phone}
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
