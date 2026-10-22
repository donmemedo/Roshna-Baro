"""Fertility prediction engine.

Blends cycle history (period start dates), basal body temperature shifts and
ovulation-test results into a day-by-day conception probability curve.
"""
from __future__ import annotations

from datetime import date, timedelta
from statistics import mean, pstdev

from .models import Cycle, DailyLog, User
from .schemas import DayForecast, Insight, PredictionOut

# Relative conception probability by day offset from ovulation (Wilcox et al.)
FERTILITY_CURVE = {-5: 0.10, -4: 0.16, -3: 0.14, -2: 0.27, -1: 0.31, 0: 0.33, 1: 0.10, 2: 0.02}


def _cycle_lengths(starts: list[date]) -> list[int]:
    return [(b - a).days for a, b in zip(starts, starts[1:], strict=False) if 15 <= (b - a).days <= 60]


def _regularity(lengths: list[int]) -> int:
    if len(lengths) < 2:
        return 50
    spread = pstdev(lengths)
    return max(0, min(100, round(100 - spread * 12)))


def _opk_ovulation(logs: list[DailyLog], last_start: date | None) -> date | None:
    """A positive ovulation test means ovulation follows within ~24-36h."""
    hits = [lg.log_date for lg in logs if lg.opk_positive and (not last_start or lg.log_date >= last_start)]
    return max(hits) + timedelta(days=1) if hits else None


def _bbt_ovulation(logs: list[DailyLog], last_start: date | None) -> date | None:
    """A sustained +0.2C shift marks the day after ovulation."""
    temps = sorted(
        [lg for lg in logs if lg.temperature and (not last_start or lg.log_date >= last_start)],
        key=lambda lg: lg.log_date,
    )
    if len(temps) < 8:
        return None
    for i in range(6, len(temps) - 2):
        base = mean(t.temperature for t in temps[i - 6 : i])
        after = [t.temperature for t in temps[i : i + 3]]
        if all(t - base >= 0.2 for t in after):
            return temps[i].log_date - timedelta(days=1)
    return None


def build_prediction(user: User, cycles: list[Cycle], logs: list[DailyLog], today: date) -> PredictionOut:
    starts = sorted({c.period_start for c in cycles})
    lengths = _cycle_lengths(starts)
    avg_len = round(mean(lengths)) if lengths else user.avg_cycle_length
    avg_len = max(21, min(45, avg_len))
    regularity = _regularity(lengths)
    luteal = 14

    last_start = starts[-1] if starts else None
    cycle_day = (today - last_start).days + 1 if last_start else None
    if cycle_day is not None and cycle_day > 60:
        cycle_day = None  # stale history

    ovulation = fertile_start = fertile_end = next_period = None
    confidence = 30
    source = "history"

    if last_start:
        next_period = last_start + timedelta(days=avg_len)
        if next_period < today:  # period is late, roll forward
            next_period = today + timedelta(days=1)
        ovulation = next_period - timedelta(days=luteal)
        confidence = 40 + min(len(lengths), 6) * 6 + regularity // 8

    measured = _opk_ovulation(logs, last_start) or _bbt_ovulation(logs, last_start)
    if measured:
        ovulation = measured
        next_period = measured + timedelta(days=luteal)
        confidence = min(96, confidence + 22)
        source = "measured"

    if ovulation:
        fertile_start = ovulation - timedelta(days=5)
        fertile_end = ovulation + timedelta(days=1)

    # ---- day by day calendar: 14 days back, 45 days forward ----
    calendar: list[DayForecast] = []
    period_len = user.avg_period_length
    period_days: set[date] = set()
    for c in cycles:
        end = min(c.period_end or c.period_start + timedelta(days=period_len - 1), c.period_start + timedelta(days=60))
        period_days.update(c.period_start + timedelta(days=i) for i in range((end - c.period_start).days + 1))
    for offset in range(-14, 46):
        day = today + timedelta(days=offset)
        chance = 0.0
        phase = "follicular"
        if ovulation:
            delta = (day - ovulation).days
            chance = FERTILITY_CURVE.get(delta, 0.0) * (0.55 + confidence / 220)
            if delta == 0:
                phase = "ovulation"
            elif -5 <= delta <= 1:
                phase = "fertile"
            elif delta > 1:
                phase = "luteal"
        in_period = day in period_days
        predicted_period = bool(next_period and next_period <= day < next_period + timedelta(days=period_len))
        if in_period or predicted_period:
            phase, chance = "period", 0.0
        calendar.append(
            DayForecast(day=day, phase=phase, conception_chance=round(chance, 3), is_predicted=day > today or predicted_period)
        )

    today_chance = next((d.conception_chance for d in calendar if d.day == today), 0.0)
    today_phase = next((d.phase for d in calendar if d.day == today), "follicular")
    days_to_fertile = (fertile_start - today).days if fertile_start and fertile_start > today else None

    insights = _insights(user, lengths, regularity, avg_len, today_phase, days_to_fertile, source, logs)
    referral = _referral(user, lengths, regularity, avg_len, cycles, today)

    return PredictionOut(
        today=today,
        cycle_day=cycle_day,
        avg_cycle_length=avg_len,
        regularity_score=regularity,
        next_period=next_period,
        ovulation_day=ovulation,
        fertile_start=fertile_start,
        fertile_end=fertile_end,
        conception_chance_today=round(today_chance, 3),
        days_to_fertile=days_to_fertile,
        phase=today_phase,
        confidence=min(confidence, 96),
        referral_recommended=referral,
        calendar=calendar,
        insights=insights,
    )


def _referral(user: User, lengths: list[int], regularity: int, avg_len: int, cycles: list[Cycle], today: date) -> bool:
    age = today.year - user.birth_year if user.birth_year else None
    if avg_len < 21 or avg_len > 35:
        return True
    if len(lengths) >= 3 and regularity < 45:
        return True
    if age and age >= 35 and len(cycles) >= 6 and user.goal == "conceive":
        return True
    if age and age < 35 and len(cycles) >= 12 and user.goal == "conceive":
        return True
    return False


def _insights(user, lengths, regularity, avg_len, phase, days_to_fertile, source, logs) -> list[Insight]:
    out: list[Insight] = []
    if not lengths:
        out.append(Insight(
            key="onboarding", severity="info",
            title_fa="چند چرخه ثبت کنید", title_en="Log a few cycles",
            body_fa="با ثبت تاریخ شروع دو یا سه پریود، پیش‌بینی ما دقیق‌تر می‌شود.",
            body_en="Logging two or three period start dates makes our prediction much sharper."))
    if regularity >= 75 and lengths:
        out.append(Insight(
            key="regular", severity="good",
            title_fa="چرخه شما منظم است", title_en="Your cycle is regular",
            body_fa=f"میانگین چرخه شما {avg_len} روز و نوسان آن کم است؛ این یعنی پنجره باروری قابل‌اتکاست.",
            body_en=f"Your average cycle is {avg_len} days with low variation, so the fertile window is reliable."))
    elif lengths and regularity < 50:
        out.append(Insight(
            key="irregular", severity="warn",
            title_fa="نوسان چرخه بالاست", title_en="Cycle variation is high",
            body_fa="نوسان زیاد می‌تواند نشانه تخمک‌گذاری نامنظم باشد. گفت‌وگو با متخصص زنان کمک می‌کند.",
            body_en="High variation can point to irregular ovulation. A specialist visit is worth booking."))
    if phase in ("fertile", "ovulation"):
        out.append(Insight(
            key="fertile_now", severity="good",
            title_fa="در پنجره باروری هستید", title_en="You are in your fertile window",
            body_fa="بیشترین شانس بارداری در این روزها است؛ رابطه یک‌روز‌درمیان بهترین نتیجه را می‌دهد.",
            body_en="These are your highest-chance days; intercourse every other day works best."))
    elif days_to_fertile is not None and days_to_fertile <= 5:
        out.append(Insight(
            key="fertile_soon", severity="info",
            title_fa=f"{days_to_fertile} روز تا پنجره باروری", title_en=f"{days_to_fertile} days to your fertile window",
            body_fa="از همین حالا خواب کافی، مکمل فولیک‌اسید و کاهش استرس را جدی بگیرید.",
            body_en="Start now with enough sleep, folic acid and less stress."))
    if source == "measured":
        out.append(Insight(
            key="measured", severity="good",
            title_fa="پیش‌بینی با داده واقعی تنظیم شد", title_en="Prediction tuned with your own data",
            body_fa="دمای پایه بدن یا تست تخمک‌گذاری شما، روز تخمک‌گذاری را دقیق‌تر کرد.",
            body_en="Your basal temperature or ovulation test refined the predicted ovulation day."))
    elif len([lg for lg in logs if lg.temperature]) < 5:
        out.append(Insight(
            key="bbt", severity="info",
            title_fa="دمای بدن را صبح‌ها ثبت کنید", title_en="Log your morning temperature",
            body_fa="ثبت دمای پایه بدن پیش از بلند شدن از تخت، تخمک‌گذاری را با دقت بالا نشان می‌دهد.",
            body_en="Basal temperature taken before getting out of bed pinpoints ovulation."))
    return out
