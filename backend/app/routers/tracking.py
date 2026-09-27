from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import Cycle, DailyLog, User
from ..prediction import build_prediction
from ..schemas import CycleIn, CycleOut, DailyLogIn, DailyLogOut, PredictionOut
from ..security import current_user

router = APIRouter(prefix="/api", tags=["tracking"])


async def _cycles(session, user):
    return list(await session.exec(select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.period_start)))


async def _logs(session, user):
    return list(await session.exec(select(DailyLog).where(DailyLog.user_id == user.id).order_by(DailyLog.log_date)))


@router.get("/cycles", response_model=list[CycleOut])
async def list_cycles(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    return await _cycles(session, user)


@router.post("/cycles", response_model=CycleOut)
async def add_cycle(payload: CycleIn, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    cycle = Cycle(user_id=user.id, **payload.model_dump())
    session.add(cycle)
    await session.commit()
    await session.refresh(cycle)
    return cycle


@router.delete("/cycles/{cycle_id}")
async def delete_cycle(cycle_id: int, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    cycle = await session.get(Cycle, cycle_id)
    if not cycle or cycle.user_id != user.id:
        raise HTTPException(404, "Not found")
    await session.delete(cycle)
    await session.commit()
    return {"ok": True}


@router.get("/logs", response_model=list[DailyLogOut])
async def list_logs(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    return await _logs(session, user)


@router.put("/logs", response_model=DailyLogOut)
async def upsert_log(payload: DailyLogIn, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    existing = (
        await session.exec(
            select(DailyLog).where(DailyLog.user_id == user.id, DailyLog.log_date == payload.log_date)
        )
    ).first()
    log = existing or DailyLog(user_id=user.id, log_date=payload.log_date)
    for key, value in payload.model_dump().items():
        setattr(log, key, value)
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log


@router.get("/insights", response_model=PredictionOut)
async def insights(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    return build_prediction(user, await _cycles(session, user), await _logs(session, user), date.today())
