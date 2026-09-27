from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    display_name: str = ""
    birth_year: Optional[int] = None
    goal: str = "conceive"
    locale: str = "fa"


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    birth_year: Optional[int]
    avg_cycle_length: int
    avg_period_length: int
    goal: str
    locale: str
    is_premium: bool
    fund_member: bool


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    birth_year: Optional[int] = None
    avg_cycle_length: Optional[int] = None
    avg_period_length: Optional[int] = None
    goal: Optional[str] = None
    locale: Optional[str] = None


class CycleIn(BaseModel):
    period_start: date
    period_end: Optional[date] = None
    note: str = ""


class CycleOut(CycleIn):
    id: int


class DailyLogIn(BaseModel):
    log_date: date
    temperature: Optional[float] = None
    opk_positive: Optional[bool] = None
    intercourse: bool = False
    mood: Optional[str] = None
    flow: Optional[str] = None
    symptoms: str = ""
    note: str = ""


class DailyLogOut(DailyLogIn):
    id: int


class DayForecast(BaseModel):
    day: date
    phase: str              # period | follicular | fertile | ovulation | luteal
    conception_chance: float
    is_predicted: bool


class Insight(BaseModel):
    key: str
    severity: str           # info | good | warn
    title_fa: str
    title_en: str
    body_fa: str
    body_en: str


class PredictionOut(BaseModel):
    today: date
    cycle_day: Optional[int]
    avg_cycle_length: int
    regularity_score: int            # 0..100
    next_period: Optional[date]
    ovulation_day: Optional[date]
    fertile_start: Optional[date]
    fertile_end: Optional[date]
    conception_chance_today: float
    days_to_fertile: Optional[int]
    phase: str
    confidence: int
    referral_recommended: bool
    calendar: list[DayForecast]
    insights: list[Insight]


class FundStats(BaseModel):
    members: int
    pool_toman: int
    treatments_funded: int
    avg_discount: int
    is_member: bool
    monthly_amount: int
