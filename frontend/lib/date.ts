/** Local-calendar helpers. `toISOString()` is UTC, which is the wrong day for Iran (UTC+3:30)
 *  between 00:00 and 03:30, so entries would land on yesterday. */
export function localISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = () => localISO();

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localISO(d);
}

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

/** Persian and Arabic-Indic digits (and the decimal separator) typed on a Persian keyboard -> ASCII. */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (c) => String(FA.indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String(AR.indexOf(c)))
    .replace(/[٫،]/g, ".");
}

/** Strict: "36.6" and "۳۶٫۶" parse; "36/6" or "abc" return null instead of silently becoming 36 or nothing. */
export function parseDecimal(s: string): number | null {
  const t = normalizeDigits(s.trim()).replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}
