from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import get_today
from ..errors import ApiError
from ..models import Cycle, DailyLog, User
from ..prediction import build_prediction
from ..schemas import CycleIn, CycleOut, DailyLogIn, DailyLogOut, PredictionOut
from ..security import current_user, writer

router = APIRouter(prefix="/api", tags=["tracking"])

HISTORY_CYCLES = 24      # the prediction only needs recent cycles
HISTORY_LOG_DAYS = 120   # ...and recent temperature/ovulation-test logs
LIMIT_REACHED = (409, "limit_reached", "Storage limit reached for this account.")


async def _count(session: AsyncSession, model, user: User) -> int:
    return (await session.exec(select(func.count()).select_from(model).where(model.user_id == user.id))).one()


@router.get("/cycles", response_model=list[CycleOut])
async def list_cycles(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    rows = await session.exec(select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.period_start))
    return list(rows)


@router.post("/cycles", response_model=CycleOut)
async def add_cycle(payload: CycleIn, user: User = Depends(writer), session: AsyncSession = Depends(get_session)):
    if await _count(session, Cycle, user) >= settings.max_cycles_per_user:
        raise ApiError(*LIMIT_REACHED)
    dup = await session.exec(select(Cycle.id).where(Cycle.user_id == user.id, Cycle.period_start == payload.period_start))
    if dup.first():
        raise ApiError(409, "duplicate", "A period starting on this date is already logged.")
    cycle = Cycle(user_id=user.id, **payload.model_dump())
    session.add(cycle)
    try:
        await session.commit()
    except IntegrityError:  # same start date submitted twice at once: the unique index decides
        await session.rollback()
        raise ApiError(409, "duplicate", "A period starting on this date is already logged.") from None
    await session.refresh(cycle)
    return cycle


@router.delete("/cycles/{cycle_id}")
async def delete_cycle(cycle_id: int, user: User = Depends(writer), session: AsyncSession = Depends(get_session)):
    cycle = await session.get(Cycle, cycle_id)
    if not cycle or cycle.user_id != user.id:
        raise ApiError(404, "not_found", "Not found")
    await session.delete(cycle)
    await session.commit()
    return {"ok": True}


@router.get("/logs", response_model=list[DailyLogOut])
async def list_logs(
    since: date | None = None,
    limit: int = Query(366, ge=1, le=1000),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
    today: date = Depends(get_today),
):
    """Newest `limit` logs since `since` (default: last 180 days), returned oldest-first."""
    since = since or today - timedelta(days=180)
    rows = await session.exec(
        select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.log_date >= since)
        .order_by(DailyLog.log_date.desc()).limit(limit)
    )
    return list(rows)[::-1]


@router.put("/logs", response_model=DailyLogOut)
async def upsert_log(payload: DailyLogIn, user: User = Depends(writer), session: AsyncSession = Depends(get_session)):
    """Create or update the log for a day. Only the fields the client sent are changed,
    so a quick-log tap can never erase the temperature, mood or notes saved earlier."""
    changes = payload.model_dump(exclude_unset=True)
    for attempt in (1, 2):
        log = (await session.exec(
            select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.log_date == payload.log_date)
        )).first()
        if log is None:
            if await _count(session, DailyLog, user) >= settings.max_logs_per_user:
                raise ApiError(*LIMIT_REACHED)
            log = DailyLog(user_id=user.id, log_date=payload.log_date)
        for key, value in changes.items():
            setattr(log, key, value)
        session.add(log)
        try:
            await session.commit()
        except IntegrityError:  # lost an insert race on (user, day): retry as an update
            await session.rollback()
            if attempt == 2:
                raise
            continue
        await session.refresh(log)
        return log


@router.get("/insights", response_model=PredictionOut)
async def insights(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
    today: date = Depends(get_today),
):
    recent = await session.exec(
        select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.period_start.desc()).limit(HISTORY_CYCLES)
    )
    logs = await session.exec(
        select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.log_date >= today - timedelta(days=HISTORY_LOG_DAYS))
        .order_by(DailyLog.log_date)
    )
    return build_prediction(user, list(recent)[::-1], list(logs), today)
