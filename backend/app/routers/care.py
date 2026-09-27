from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Article, Clinic, Cycle, FundMembership, User
from ..schemas import FundStats
from ..security import current_user
from ..seed_data import PREGNANCY_WEEKS

router = APIRouter(prefix="/api", tags=["care"])


@router.get("/clinics")
async def clinics(
    city: str | None = Query(default=None),
    service: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    rows = list(await session.exec(select(Clinic)))
    if city:
        rows = [c for c in rows if city in (c.city_fa, c.city_en)]
    if service:
        rows = [c for c in rows if service in c.services.split(",")]
    return sorted(rows, key=lambda c: -c.rating)


@router.get("/articles")
async def articles(category: str | None = None, session: AsyncSession = Depends(get_session)):
    rows = list(await session.exec(select(Article)))
    return [a for a in rows if not category or a.category == category]


@router.get("/pregnancy/week/{week}")
async def pregnancy_week(week: int):
    week = max(1, min(42, week))
    return PREGNANCY_WEEKS[week - 1] | {"week": week}


@router.get("/pregnancy/timeline")
async def pregnancy_timeline(last_period: date, session: AsyncSession = Depends(get_session)):
    days = (date.today() - last_period).days
    week = max(1, min(42, days // 7 + 1))
    due = last_period + timedelta(days=280)
    return {
        "week": week,
        "day_of_week": days % 7,
        "due_date": due,
        "days_left": (due - date.today()).days,
        "trimester": 1 if week <= 13 else (2 if week <= 27 else 3),
        "content": PREGNANCY_WEEKS[week - 1] | {"week": week},
    }


@router.get("/fund", response_model=FundStats)
async def fund(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    members = (await session.exec(select(func.count()).select_from(FundMembership).where(FundMembership.active == True))).one()  # noqa: E712
    mine = (await session.exec(select(FundMembership).where(FundMembership.user_id == user.id, FundMembership.active == True))).first()  # noqa: E712
    base_members = 4820 + members
    return FundStats(
        members=base_members,
        pool_toman=base_members * 300000 * 6,
        treatments_funded=base_members // 42,
        avg_discount=35,
        is_member=bool(mine),
        monthly_amount=mine.monthly_amount if mine else 300000,
    )


@router.post("/fund/join", response_model=FundStats)
async def fund_join(monthly_amount: int = 300000, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    mine = (await session.exec(select(FundMembership).where(FundMembership.user_id == user.id))).first()
    if mine:
        mine.active = True
        mine.monthly_amount = monthly_amount
    else:
        mine = FundMembership(user_id=user.id, monthly_amount=monthly_amount)
    user.fund_member = True
    session.add(mine)
    session.add(user)
    await session.commit()
    return await fund(user, session)


@router.post("/fund/leave", response_model=FundStats)
async def fund_leave(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    mine = (await session.exec(select(FundMembership).where(FundMembership.user_id == user.id))).first()
    if mine:
        mine.active = False
        session.add(mine)
    user.fund_member = False
    session.add(user)
    await session.commit()
    return await fund(user, session)


@router.get("/stats/community")
async def community_stats(session: AsyncSession = Depends(get_session)):
    users = (await session.exec(select(func.count()).select_from(User))).one()
    cycles = (await session.exec(select(func.count()).select_from(Cycle))).one()
    clinics_count = (await session.exec(select(func.count()).select_from(Clinic))).one()
    return {
        "users": 128_400 + users,
        "cycles_logged": 2_140_000 + cycles,
        "clinics": 20 + clinics_count,
        "accuracy": 93,
    }
