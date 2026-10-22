import asyncio

from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlmodel import delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from .. import ratelimit
from ..clock import utc_now
from ..config import settings
from ..db import get_session
from ..errors import ApiError
from ..models import Cycle, DailyLog, FundMembership, User
from ..schemas import DeleteAccountIn, ExportOut, RegisterIn, TokenOut, UserOut, UserUpdate
from ..security import DUMMY_HASH, create_access_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Password hashing is CPU bound: cap how many run at once so a burst queues instead of starving the host.
_hash_slots = asyncio.Semaphore(settings.bcrypt_concurrency)


async def _in_pool(fn, *args):
    async with _hash_slots:
        return await run_in_threadpool(fn, *args)


@router.post("/register", response_model=TokenOut)
async def register(request: Request, payload: RegisterIn, session: AsyncSession = Depends(get_session)):
    ratelimit.enforce(f"register:{ratelimit.client_ip(request)}", settings.register_max_per_hour, 3600)
    taken = ApiError(409, "email_taken", "This email is already registered.")
    if (await session.exec(select(User.id).where(User.email == payload.email))).first():
        raise taken
    await session.rollback()  # hand the pooled connection back before the slow hash
    hashed = await _in_pool(hash_password, payload.password)
    user = User(
        email=payload.email,
        hashed_password=hashed,
        display_name=payload.display_name or payload.email.split("@")[0],
        birth_year=payload.birth_year,
        goal=payload.goal,
        locale=payload.locale,
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:  # two simultaneous sign-ups with the same email
        await session.rollback()
        raise taken from None
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenOut)
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    ip = ratelimit.client_ip(request)
    email = form.username.strip().lower()[:254]
    window = settings.login_window_seconds
    # Throttle first: a rejected flood never reaches bcrypt.
    ratelimit.enforce(f"login-ip:{ip}", settings.login_ip_max_attempts, window)
    key = f"login:{ip}:{email}"
    ratelimit.enforce(key, settings.login_max_attempts, window)
    # Across all addresses: spreading guesses over many IPs (or an IPv6 block) must not lift the ceiling.
    account_key = f"login-fail:{email}"
    retry = ratelimit.peek(account_key, settings.login_account_max_failures, 3600)
    if retry:
        raise ApiError(429, "rate_limited", "Too many attempts. Try again later.", {"Retry-After": str(retry)})

    user = (await session.exec(select(User).where(User.email == email))).first()
    user_id, stored_hash = (user.id, user.hashed_password) if user else (None, DUMMY_HASH)
    await session.rollback()  # hand the pooled connection back before the slow hash
    ok = await _in_pool(verify_password, form.password, stored_hash)
    if user_id is None or not ok:
        ratelimit.hit(account_key, 10**9, 3600)  # record the failure (never blocks by itself)
        raise ApiError(401, "invalid_credentials", "Wrong email or password.", {"WWW-Authenticate": "Bearer"})
    ratelimit.forget(key)
    return TokenOut(access_token=create_access_token(user_id))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.get("/me/export", response_model=ExportOut)
async def export_me(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    """Everything we hold about the caller, as JSON (no password hash)."""
    cycles = list(await session.exec(select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.period_start)))
    logs = list(await session.exec(select(DailyLog).where(DailyLog.user_id == user.id).order_by(DailyLog.log_date)))
    fund = (await session.exec(select(FundMembership).where(FundMembership.user_id == user.id))).first()
    return ExportOut(
        exported_at=utc_now(),
        user=user, cycles=cycles, logs=logs,
        fund_membership=fund.model_dump(mode="json", exclude={"id", "user_id"}) if fund else None,
    )


@router.delete("/me")
async def delete_me(
    payload: DeleteAccountIn,
    request: Request,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
):
    """Permanently erase the account and all of its data in one transaction.
    Needs the password again: a stolen or forgotten-open session must not be able to erase a life's records."""
    ratelimit.enforce(f"delete:{user.id}", 5, 3600)
    user_id, stored_hash = user.id, user.hashed_password
    await session.rollback()
    if not await _in_pool(verify_password, payload.password, stored_hash):
        raise ApiError(403, "wrong_password", "Wrong password.")
    for table in (DailyLog, Cycle, FundMembership):
        await session.exec(delete(table).where(table.user_id == user_id))
    await session.exec(delete(User).where(User.id == user_id))
    await session.commit()
    return {"ok": True}
