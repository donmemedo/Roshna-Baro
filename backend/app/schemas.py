"""Request/response models. Every client-controlled field has an explicit bound."""
from datetime import date, datetime, timedelta
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from .clock import utc_today

Goal = Literal["conceive", "track", "pregnancy"]
Locale = Literal["fa", "en"]
Mood = Literal["calm", "happy", "low", "anxious"]
Flow = Literal["light", "medium", "heavy"]
SYMPTOM_KEYS = ("cramps", "headache", "bloating", "acne", "fatigue", "energy", "tender", "nausea")
FUND_TIERS = (150_000, 300_000, 500_000, 1_000_000)
MIN_DATE = date(1990, 1, 1)



def _check_date(v: date) -> date:
    # +1 day tolerates clients ahead of UTC (Iran is UTC+3:30)
    if v < MIN_DATE or v > utc_today() + timedelta(days=1):
        raise ValueError("date is out of the allowed range")
    return v


PastDate = Annotated[date, AfterValidator(_check_date)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


def _check_birth_year(v: int | None) -> int | None:
    if v is not None and not (1930 <= v <= utc_today().year - 10):
        raise ValueError("birth_year is out of range")
    return v


BirthYear = Annotated[int | None, AfterValidator(_check_birth_year)]


# ---------------- auth ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    display_name: Name = ""
    birth_year: BirthYear = None
    goal: Goal = "conceive"
    locale: Locale = "fa"

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def _bcrypt_limit(cls, v: str) -> str:
        if len(v.encode()) > 72:  # bcrypt silently truncates beyond 72 bytes
            raise ValueError("password must be at most 72 bytes")
        return v


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    display_name: str
    birth_year: int | None
    avg_cycle_length: int
    avg_period_length: int
    goal: str
    locale: str
    is_premium: bool
    fund_member: bool


class UserUpdate(BaseModel):
    """Partial update: only the fields sent are changed. `birth_year: null` clears it (data minimisation);
    every other field must hold a value when it is sent."""

    model_config = ConfigDict(extra="forbid")

    display_name: Name | None = None
    birth_year: BirthYear = None
    avg_cycle_length: int | None = Field(None, ge=15, le=60)
    avg_period_length: int | None = Field(None, ge=1, le=14)
    goal: Goal | None = None
    locale: Locale | None = None

    @model_validator(mode="after")
    def _no_null_except_birth_year(self) -> "UserUpdate":
        for name in self.model_fields_set - {"birth_year"}:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class DeleteAccountIn(BaseModel):
    password: str = Field(max_length=72)


class TimelineIn(BaseModel):
    last_period: date


# ---------------- tracking ----------------
class CycleIn(BaseModel):
    period_start: PastDate
    period_end: PastDate | None = None
    note: Note = ""

    @model_validator(mode="after")
    def _order(self) -> "CycleIn":
        if self.period_end is not None:
            gap = (self.period_end - self.period_start).days
            if gap < 0 or gap > 45:
                raise ValueError("period_end must be 0-45 days after period_start")
        return self


class CycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period_start: date
    period_end: date | None
    note: str


class DailyLogIn(BaseModel):
    log_date: PastDate
    temperature: float | None = Field(None, ge=34.0, le=42.0)
    opk_positive: bool | None = None
    intercourse: bool = False
    mood: Mood | None = None
    flow: Flow | None = None
    symptoms: str = Field("", max_length=120)
    note: Note = ""

    @field_validator("symptoms")
    @classmethod
    def _symptoms(cls, v: str) -> str:
        items = list(dict.fromkeys(s for s in v.split(",") if s))
        if any(s not in SYMPTOM_KEYS for s in items):
            raise ValueError("unknown symptom key")
        return ",".join(items)


class DailyLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_date: date
    temperature: float | None
    opk_positive: bool | None
    intercourse: bool
    mood: str | None
    flow: str | None
    symptoms: str
    note: str


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
    cycle_day: int | None
    avg_cycle_length: int
    regularity_score: int            # 0..100
    next_period: date | None
    ovulation_day: date | None
    fertile_start: date | None
    fertile_end: date | None
    conception_chance_today: float
    days_to_fertile: int | None
    phase: str
    confidence: int
    referral_recommended: bool
    calendar: list[DayForecast]
    insights: list[Insight]


# ---------------- care ----------------
class ClinicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name_fa: str
    name_en: str
    city_fa: str
    city_en: str
    address_fa: str
    phone: str
    rating: float
    services: str
    partner_discount: int
    verified: bool


class ArticleSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    category: str
    title_fa: str
    title_en: str
    excerpt_fa: str
    excerpt_en: str
    read_minutes: int


class ArticleOut(ArticleSummary):
    body_fa: str
    body_en: str


class FundStats(BaseModel):
    members: int
    monthly_pledges_toman: int
    avg_discount: int
    is_member: bool
    monthly_amount: int


class CommunityStats(BaseModel):
    users: int
    cycles_logged: int
    clinics: int


class ExportOut(BaseModel):
    exported_at: datetime
    user: UserOut
    cycles: list[CycleOut]
    logs: list[DailyLogOut]
    fund_membership: dict | None
