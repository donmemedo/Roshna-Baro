from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy import literal
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..deps import get_today
from ..errors import ApiError
from ..models import Article, Clinic, Cycle, FundMembership, User
from ..schemas import FUND_TIERS, ArticleOut, ArticleSummary, ClinicOut, CommunityStats, FundStats, TimelineIn
from ..security import current_user, writer
from ..seed_data import PREGNANCY_WEEKS

router = APIRouter(prefix="/api", tags=["care"])
PUBLIC_CACHE = "public, max-age=300"  # editorial content: safe to cache for five minutes


@router.get("/clinics", response_model=list[ClinicOut])
async def clinics(
    response: Response,
    city: str | None = Query(default=None, max_length=40),
    service: Literal["ivf", "iui", "counseling", "lab"] | None = None,
    session: AsyncSession = Depends(get_session),
):
    query = select(Clinic).order_by(Clinic.rating.desc())
    if city:
        query = query.where((Clinic.city_fa == city) | (Clinic.city_en == city))
    if service:  # services is a comma list; match whole tokens only
        query = query.where((literal(",") + Clinic.services + literal(",")).like(f"%,{service},%"))
    response.headers["Cache-Control"] = PUBLIC_CACHE
    return list(await session.exec(query))


@router.get("/articles", response_model=list[ArticleSummary])
async def articles(
    response: Response,
    category: Literal["fertility", "pregnancy", "postpartum", "mind"] | None = None,
    session: AsyncSession = Depends(get_session),
):
    query = select(Article)
    if category:
        query = query.where(Article.category == category)
    response.headers["Cache-Control"] = PUBLIC_CACHE
    return list(await session.exec(query))


@router.get("/articles/{slug}", response_model=ArticleOut)
async def article(
    response: Response,
    slug: str = Path(pattern=r"^[a-z0-9-]{1,80}$"),
    session: AsyncSession = Depends(get_session),
):
    row = (await session.exec(select(Article).where(Article.slug == slug))).first()
    if not row:
        raise ApiError(404, "not_found", "Not found")
    response.headers["Cache-Control"] = PUBLIC_CACHE
    return row


@router.get("/pregnancy/week/{week}")
async def pregnancy_week(response: Response, week: int = Path(ge=1, le=42)):
    response.headers["Cache-Control"] = PUBLIC_CACHE
    return PREGNANCY_WEEKS[week - 1] | {"week": week}


@router.post("/pregnancy/timeline")
async def pregnancy_timeline(payload: TimelineIn, today: date = Depends(get_today)):
    """POST, not GET: the last-period date is pregnancy data and must not end up in URLs and proxy logs."""
    last_period = payload.last_period
    if not today - timedelta(days=300) <= last_period <= today + timedelta(days=1):
        raise ApiError(422, "validation_error", "last_period must be within the last 300 days")
    days = (today - last_period).days
    week = max(1, min(42, days // 7 + 1))
    due = last_period + timedelta(days=280)
    return {
        "week": week,
        "day_of_week": max(0, days) % 7,
        "due_date": due,
        "days_left": (due - today).days,
        "trimester": 1 if week <= 13 else (2 if week <= 27 else 3),
        "content": PREGNANCY_WEEKS[week - 1] | {"week": week},
    }


async def _fund_stats(session: AsyncSession, user: User) -> FundStats:
    active = FundMembership.active == True  # noqa: E712
    members, pledged = (await session.exec(
        select(func.count(), func.coalesce(func.sum(FundMembership.monthly_amount), 0)).where(active)
    )).one()
    avg_discount = (await session.exec(select(func.coalesce(func.avg(Clinic.partner_discount), 0)))).one()
    mine = (await session.exec(select(FundMembership).where(FundMembership.user_id == user.id, active))).first()
    return FundStats(
        members=members,
        monthly_pledges_toman=pledged,
        avg_discount=round(avg_discount),
        is_member=bool(mine),
        monthly_amount=mine.monthly_amount if mine else 300_000,
    )


@router.get("/fund", response_model=FundStats)
async def fund(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    return await _fund_stats(session, user)


@router.post("/fund/join", response_model=FundStats)
async def fund_join(
    monthly_amount: int = 300_000,
    user: User = Depends(writer),
    session: AsyncSession = Depends(get_session),
):
    if monthly_amount not in FUND_TIERS:  # query strings arrive as text, so Literal[int] cannot be used
        raise ApiError(422, "validation_error", f"monthly_amount must be one of {FUND_TIERS}")
    mine = (await session.exec(select(FundMembership).where(FundMembership.user_id == user.id))).first()
    if mine:
        mine.active, mine.monthly_amount = True, monthly_amount
    else:
        mine = FundMembership(user_id=user.id, monthly_amount=monthly_amount)
    user.fund_member = True
    session.add(mine)
    session.add(user)
    await session.commit()
    return await _fund_stats(session, user)


@router.post("/fund/leave", response_model=FundStats)
async def fund_leave(user: User = Depends(writer), session: AsyncSession = Depends(get_session)):
    mine = (await session.exec(select(FundMembership).where(FundMembership.user_id == user.id))).first()
    if mine:
        mine.active = False
        session.add(mine)
    user.fund_member = False
    session.add(user)
    await session.commit()
    return await _fund_stats(session, user)


@router.get("/stats/community", response_model=CommunityStats)
async def community_stats(response: Response, session: AsyncSession = Depends(get_session)):
    """Real counts only. (Earlier versions added invented offsets; see docs/red-team-report.md S12.)"""
    count = lambda model: select(func.count()).select_from(model)  # noqa: E731
    users = (await session.exec(count(User))).one()
    cycles = (await session.exec(count(Cycle))).one()
    clinics_count = (await session.exec(count(Clinic))).one()
    response.headers["Cache-Control"] = "public, max-age=60"
    return CommunityStats(users=users, cycles_logged=cycles, clinics=clinics_count)
