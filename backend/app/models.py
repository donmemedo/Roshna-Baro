from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    display_name: str = ""
    birth_year: Optional[int] = None
    avg_cycle_length: int = 28
    avg_period_length: int = 5
    goal: str = "conceive"  # conceive | track | pregnancy
    locale: str = "fa"
    is_premium: bool = False
    fund_member: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Cycle(SQLModel, table=True):
    """One menstrual cycle, identified by its period start date."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    period_start: date
    period_end: Optional[date] = None
    note: str = ""


class DailyLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    log_date: date = Field(index=True)
    temperature: Optional[float] = None       # basal body temperature, C
    opk_positive: Optional[bool] = None       # ovulation test
    intercourse: bool = False
    mood: Optional[str] = None
    flow: Optional[str] = None                # light | medium | heavy
    symptoms: str = ""                        # comma separated keys
    note: str = ""


class Clinic(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
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
    id: Optional[int] = Field(default=None, primary_key=True)
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
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    monthly_amount: int = 300000   # Toman
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    active: bool = True
