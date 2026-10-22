export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8036";

const TOKEN_KEY = "roshana.token";
export const UNAUTHORIZED_EVENT = "roshana:unauthorized";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode): the session just will not persist */
  }
}

/** Carries the server's machine-readable `code` so the UI can show a localized message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof URLSearchParams) ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new ApiError(0, "network", "Network error");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string; code?: string };
    const code = body.code || (res.status === 401 ? "unauthorized" : "error");
    // An expired or revoked token on an authenticated call: let the app sign the user out once.
    if (res.status === 401 && token && !path.startsWith("/api/auth/login") && typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const retry = Number(res.headers.get("Retry-After"));
    throw new ApiError(res.status, code, body.detail || `Request failed (${res.status})`, retry || undefined);
  }
  return res.json() as Promise<T>;
}

export type User = {
  id: number; email: string; display_name: string; birth_year: number | null;
  avg_cycle_length: number; avg_period_length: number; goal: string;
  locale: string; is_premium: boolean; fund_member: boolean;
};

export type DayForecast = { day: string; phase: string; conception_chance: number; is_predicted: boolean };
export type Insight = { key: string; severity: string; title_fa: string; title_en: string; body_fa: string; body_en: string };

export type Prediction = {
  today: string; cycle_day: number | null; avg_cycle_length: number; regularity_score: number;
  next_period: string | null; ovulation_day: string | null; fertile_start: string | null;
  fertile_end: string | null; conception_chance_today: number; days_to_fertile: number | null;
  phase: string; confidence: number; referral_recommended: boolean;
  calendar: DayForecast[]; insights: Insight[];
};

export type Cycle = { id: number; period_start: string; period_end: string | null; note: string };
export type DailyLog = {
  id?: number; log_date: string; temperature?: number | null; opk_positive?: boolean | null;
  intercourse?: boolean; mood?: string | null; flow?: string | null; symptoms?: string; note?: string;
};
export type Clinic = {
  id: number; name_fa: string; name_en: string; city_fa: string; city_en: string;
  address_fa: string; phone: string; rating: number; services: string;
  partner_discount: number; verified: boolean;
};
export type ArticleSummary = {
  id: number; slug: string; category: string; title_fa: string; title_en: string;
  excerpt_fa: string; excerpt_en: string; read_minutes: number;
};
export type Article = ArticleSummary & { body_fa: string; body_en: string };
export type FundStats = {
  members: number; monthly_pledges_toman: number; avg_discount: number;
  is_member: boolean; monthly_amount: number;
};
export type Community = { users: number; cycles_logged: number; clinics: number };

const q = (today: string) => `today=${today}`;

export const api = {
  health: () => request<{ status: string; demo: boolean }>("/api/health"),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: new URLSearchParams({ username: email, password }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  register: (payload: Record<string, unknown>) =>
    request<{ access_token: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<User>("/api/auth/me"),
  updateMe: (payload: Record<string, unknown>) =>
    request<User>("/api/auth/me", { method: "PATCH", body: JSON.stringify(payload) }),
  exportMe: () => request<Record<string, unknown>>("/api/auth/me/export"),
  deleteMe: (password: string) =>
    request<{ ok: boolean }>("/api/auth/me", { method: "DELETE", body: JSON.stringify({ password }) }),
  insights: (today: string) => request<Prediction>(`/api/insights?${q(today)}`),
  cycles: () => request<Cycle[]>("/api/cycles"),
  addCycle: (payload: { period_start: string; period_end?: string | null }) =>
    request<Cycle>("/api/cycles", { method: "POST", body: JSON.stringify(payload) }),
  deleteCycle: (id: number) => request<{ ok: boolean }>(`/api/cycles/${id}`, { method: "DELETE" }),
  logs: (today: string) => request<DailyLog[]>(`/api/logs?${q(today)}`),
  /** Only the fields present in `payload` are changed on the server. */
  saveLog: (payload: DailyLog) => request<DailyLog>("/api/logs", { method: "PUT", body: JSON.stringify(payload) }),
  clinics: () => request<Clinic[]>("/api/clinics"),
  articles: () => request<ArticleSummary[]>("/api/articles"),
  article: (slug: string) => request<Article>(`/api/articles/${encodeURIComponent(slug)}`),
  pregnancy: (lastPeriod: string, today: string) =>
    // POST: the date is pregnancy data and must not appear in URLs or proxy logs
    request<{ week: number; day_of_week: number; due_date: string; days_left: number; trimester: number; content: Record<string, string | number> }>(
      `/api/pregnancy/timeline?${q(today)}`,
      { method: "POST", body: JSON.stringify({ last_period: lastPeriod }) },
    ),
  fund: () => request<FundStats>("/api/fund"),
  joinFund: (amount: number) => request<FundStats>(`/api/fund/join?monthly_amount=${amount}`, { method: "POST" }),
  leaveFund: () => request<FundStats>("/api/fund/leave", { method: "POST" }),
  community: () => request<Community>("/api/stats/community"),
};
