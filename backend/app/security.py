from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlmodel.ext.asyncio.session import AsyncSession

from . import ratelimit
from .config import settings
from .db import get_session
from .errors import ApiError
from .models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
_ALGORITHM = "HS256"


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode()[:72], bcrypt.gensalt(settings.bcrypt_rounds)).decode()


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode()[:72], hashed.encode())
    except ValueError:
        return False


# Verified against when the email is unknown, so "no such user" costs the same as "wrong password".
DUMMY_HASH = hash_password("timing-equalisation-only")


def create_access_token(user_id: int) -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(claims, settings.secret_key, algorithm=_ALGORITHM)


async def current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    unauthorized = ApiError(401, "unauthorized", "Could not validate credentials", {"WWW-Authenticate": "Bearer"})
    try:
        claims = jwt.decode(
            token, settings.secret_key, algorithms=[_ALGORITHM], options={"require": ["exp", "iat", "sub"]}
        )
        user_id = int(claims["sub"])
    except (jwt.PyJWTError, ValueError, TypeError):
        raise unauthorized from None
    user = await session.get(User, user_id)
    if not user:
        raise unauthorized
    # A token older than the account belongs to a previous owner of this id (see User.__table_args__).
    created = user.created_at if user.created_at.tzinfo else user.created_at.replace(tzinfo=UTC)
    if claims["iat"] + 2 < created.timestamp():
        raise unauthorized
    return user


async def writer(user: User = Depends(current_user)) -> User:
    """Authenticated user whose write rate is capped."""
    ratelimit.enforce(f"write:{user.id}", settings.write_max_per_minute, 60)
    return user
