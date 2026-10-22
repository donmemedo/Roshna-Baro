from datetime import UTC, date, datetime

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(UTC)


class User(SQLModel, table=True):
    # AUTOINCREMENT: SQLite otherwise reuses the highest id after a delete, and a token minted for the
    # deleted account would then unlock whoever registers next.
    __table_args__ = {"sqlite_autoincrement": True}

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    display_name: str = ""
    birth_year: int | None = None
    avg_cycle_length: int = 28
    avg_period_length: int = 5
    goal: str = "conceive"  # conceive | track | pregnancy
    locale: str = "fa"
    is_premium: bool = False
    fund_member: bool = False
    created_at: datetime = Field(default_factory=_now)


class Cycle(SQLModel, table=True):
    """One menstrual cycle, identified by its period start date."""

    __table_args__ = (Index("uq_cycle_user_start", "user_id", "period_start", unique=True),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    period_start: date
    period_end: date | None = None
    note: str = ""


class DailyLog(SQLModel, table=True):
    __table_args__ = (Index("uq_dailylog_user_date", "user_id", "log_date", unique=True),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    log_date: date = Field(index=True)
    temperature: float | None = None       # basal body temperature, C
    opk_positive: bool | None = None       # ovulation test
    intercourse: bool = False
    mood: str | None = None
    flow: str | None = None                # light | medium | heavy
    symptoms: str = ""                        # comma separated keys
    note: str = ""


class Clinic(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name_fa: str
    name_en: str
    city_fa: str
    city_en: str
    address_fa: str = ""
    phone: str = ""
    rating: float = 4.5
    services: str = ""       # comma separated keys: ivf,iui,counseling,lab
    partner_discount: int = 0
    verified: bool = True


class Article(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    category: str = "fertility"   # fertility | pregnancy | postpartum | mind
    title_fa: str
    title_en: str
    excerpt_fa: str = ""
    excerpt_en: str = ""
    body_fa: str = ""
    body_en: str = ""
    read_minutes: int = 3


class FundMembership(SQLModel, table=True):
    __table_args__ = (Index("uq_fund_user", "user_id", unique=True),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    monthly_amount: int = 300000   # Toman
    joined_at: datetime = Field(default_factory=_now)
    active: bool = True
