import os
from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from .config import settings

_IS_SQLITE = settings.database_url.startswith("sqlite")

if _IS_SQLITE:
    _path = settings.database_url.split("///", 1)[-1]
    if _path and _path != ":memory:":
        os.makedirs(os.path.dirname(_path) or ".", exist_ok=True)

engine = create_async_engine(
    settings.database_url,
    echo=False,
    hide_parameters=True,  # SQL error text must never carry bound values (health notes, e-mails, hashes)
    connect_args={"timeout": 15} if _IS_SQLITE else {},
)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

if _IS_SQLITE:

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")      # readers no longer block the writer
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.close()


async def init_db() -> None:
    from . import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        if _IS_SQLITE:
            # Databases created before these indexes existed: dedupe, then enforce.
            await conn.exec_driver_sql(
                "DELETE FROM dailylog WHERE id NOT IN "
                "(SELECT MIN(id) FROM dailylog GROUP BY user_id, log_date)"
            )
            await conn.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_dailylog_user_date ON dailylog (user_id, log_date)"
            )
            await conn.exec_driver_sql(
                "DELETE FROM cycle WHERE id NOT IN (SELECT MIN(id) FROM cycle GROUP BY user_id, period_start)"
            )
            await conn.exec_driver_sql("DROP INDEX IF EXISTS ix_cycle_user_start")
            await conn.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_cycle_user_start ON cycle (user_id, period_start)"
            )
            await conn.exec_driver_sql(
                "DELETE FROM fundmembership WHERE id NOT IN (SELECT MIN(id) FROM fundmembership GROUP BY user_id)"
            )
            await conn.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_fund_user ON fundmembership (user_id)"
            )


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
