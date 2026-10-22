"""Unit tests for the fertility engine (pure functions, no I/O)."""
from datetime import date, timedelta

from app.models import Cycle, DailyLog, User
from app.prediction import build_prediction

TODAY = date(2026, 6, 15)


def user(**kw) -> User:
    return User(email="u@example.com", hashed_password="x", **kw)


def cycles(starts: list[date]) -> list[Cycle]:
    return [Cycle(user_id=1, period_start=s, period_end=s + timedelta(days=4)) for s in starts]


def regular(n: int, gap: int = 28, last_ago: int = 10) -> list[date]:
    last = TODAY - timedelta(days=last_ago)
    return [last - timedelta(days=gap * i) for i in range(n - 1, -1, -1)]


def test_no_history_falls_back_to_profile_defaults():
    p = build_prediction(user(avg_cycle_length=30), [], [], TODAY)
    assert p.avg_cycle_length == 30 and p.next_period is None and p.cycle_day is None
    assert len(p.calendar) == 60 and p.insights[0].key == "onboarding"


def test_regular_history_predicts_next_period_and_ovulation():
    starts = regular(6)
    p = build_prediction(user(), cycles(starts), [], TODAY)
    assert p.avg_cycle_length == 28 and p.regularity_score >= 90
    assert p.next_period == starts[-1] + timedelta(days=28)
    assert p.ovulation_day == p.next_period - timedelta(days=14)
    assert p.fertile_end == p.ovulation_day + timedelta(days=1) and p.cycle_day == 11


def test_late_period_rolls_forward_instead_of_predicting_the_past():
    p = build_prediction(user(), cycles(regular(4, last_ago=40)), [], TODAY)
    assert p.next_period > TODAY


def test_positive_ovulation_test_overrides_the_calendar_estimate():
    starts = regular(4, last_ago=12)
    logs = [DailyLog(user_id=1, log_date=TODAY - timedelta(days=1), opk_positive=True)]
    p = build_prediction(user(), cycles(starts), logs, TODAY)
    assert p.ovulation_day == TODAY and p.confidence > 60
    assert any(i.key == "measured" for i in p.insights)


def test_sustained_temperature_rise_marks_ovulation():
    starts = regular(3, last_ago=14)
    temps = [36.3] * 8 + [36.6] * 4
    logs = [DailyLog(user_id=1, log_date=TODAY - timedelta(days=11 - i), temperature=t) for i, t in enumerate(temps)]
    p = build_prediction(user(), cycles(starts), logs, TODAY)
    assert any(i.key == "measured" for i in p.insights)


def test_period_days_are_flagged_in_the_calendar():
    starts = regular(3, last_ago=2)
    p = build_prediction(user(), cycles(starts), [], TODAY)
    by_day = {d.day: d.phase for d in p.calendar}
    assert by_day[TODAY] == "period" and by_day[TODAY - timedelta(days=5)] != "period"


def test_referral_age_rule_uses_the_supplied_today_not_the_server_clock():
    many = cycles(regular(7))
    older = user(birth_year=1985, goal="conceive")      # 41 on TODAY: refer after 6 cycles
    younger = user(birth_year=2000, goal="conceive")    # 26: needs 12 cycles
    assert build_prediction(older, many, [], TODAY).referral_recommended is True
    assert build_prediction(younger, many, [], TODAY).referral_recommended is False
    # same user, a "today" 20 years earlier: now under 35, so the rule must flip
    assert build_prediction(older, many, [], date(2006, 6, 15)).referral_recommended is False


def test_irregular_cycles_trigger_warning_and_referral():
    starts, day = [], TODAY - timedelta(days=200)
    for gap in (21, 45, 24, 50, 22):
        starts.append(day)
        day += timedelta(days=gap)
    p = build_prediction(user(), cycles(starts), [], TODAY)
    assert p.regularity_score < 50 and p.referral_recommended
    assert any(i.key == "irregular" for i in p.insights)
