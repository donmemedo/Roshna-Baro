export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8036";

const TOKEN_KEY = "roshana.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof URLSearchParams) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { detail?: string }).detail || `Request failed (${res.status})`);
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
  id?: number; log_date: string; temperature: number | null; opk_positive: boolean | null;
  intercourse: boolean; mood: string | null; flow: string | null; symptoms: string; note: string;
};
export type Clinic = {
  id: number; name_fa: string; name_en: string; city_fa: string; city_en: string;
  address_fa: string; phone: string; rating: number; services: string;
  partner_discount: number; verified: boolean;
};
export type Article = {
  id: number; slug: string; category: string; title_fa: string; title_en: string;
  excerpt_fa: string; excerpt_en: string; body_fa: string; body_en: string; read_minutes: number;
};
export type FundStats = {
  members: number; pool_toman: number; treatments_funded: number;
  avg_discount: number; is_member: boolean; monthly_amount: number;
};

export const api = {
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
  insights: () => request<Prediction>("/api/insights"),
  cycles: () => request<Cycle[]>("/api/cycles"),
  addCycle: (payload: { period_start: string; period_end?: string | null }) =>
    request<Cycle>("/api/cycles", { method: "POST", body: JSON.stringify(payload) }),
  deleteCycle: (id: number) => request<{ ok: boolean }>(`/api/cycles/${id}`, { method: "DELETE" }),
  logs: () => request<DailyLog[]>("/api/logs"),
  saveLog: (payload: DailyLog) => request<DailyLog>("/api/logs", { method: "PUT", body: JSON.stringify(payload) }),
  clinics: (params = "") => request<Clinic[]>(`/api/clinics${params}`),
  articles: () => request<Article[]>("/api/articles"),
  pregnancy: (lastPeriod: string) =>
    request<{ week: number; day_of_week: number; due_date: string; days_left: number; trimester: number; content: Record<string, string | number> }>(
      `/api/pregnancy/timeline?last_period=${lastPeriod}`,
    ),
  fund: () => request<FundStats>("/api/fund"),
  joinFund: (amount: number) => request<FundStats>(`/api/fund/join?monthly_amount=${amount}`, { method: "POST" }),
  leaveFund: () => request<FundStats>("/api/fund/leave", { method: "POST" }),
  community: () => request<{ users: number; cycles_logged: number; clinics: number; accuracy: number }>("/api/stats/community"),
};
