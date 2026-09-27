from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..db import get_session
from ..models import User
from ..schemas import RegisterIn, TokenOut, UserOut, UserUpdate
from ..security import create_access_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
async def register(payload: RegisterIn, session: AsyncSession = Depends(get_session)):
    exists = (await session.exec(select(User).where(User.email == payload.email))).first()
    if exists:
        raise HTTPException(400, "این نشانی رایانامه قبلاً ثبت شده است / Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name or payload.email.split("@")[0],
        birth_year=payload.birth_year,
        goal=payload.goal,
        locale=payload.locale,
    )
    session.add(user)
    await session.commit()
    return TokenOut(access_token=create_access_token(user.email))


@router.post("/login", response_model=TokenOut)
async def login(form: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    user = (await session.exec(select(User).where(User.email == form.username))).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "رمز عبور یا رایانامه نادرست است / Wrong email or password")
    return TokenOut(access_token=create_access_token(user.email))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
):
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(user, key, value)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user
