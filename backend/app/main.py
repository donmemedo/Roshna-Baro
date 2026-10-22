import logging
import os
from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from .config import settings
from .db import SessionLocal, engine, get_session, init_db
from .errors import install_error_handlers
from .logging_config import configure_logging
from .middleware import SecurityMiddleware
from .models import Article, Clinic, Cycle, DailyLog, User
from .routers import auth, care, tracking
from .security import hash_password
from .seed_data import ARTICLES, CLINICS

log = logging.getLogger("roshana")


async def seed() -> None:
    """Editorial content always; the public demo account only when DEMO_MODE is on."""
    async with SessionLocal() as session:
        if not (await session.exec(select(Clinic))).first():
            for n_fa, n_en, c_fa, c_en, addr, phone, rating, services, discount in CLINICS:
                session.add(Clinic(name_fa=n_fa, name_en=n_en, city_fa=c_fa, city_en=c_en,
                                   address_fa=addr, phone=phone, rating=rating,
                                   services=services, partner_discount=discount))
        if not (await session.exec(select(Article))).first():
            for slug, cat, t_fa, t_en, e_fa, e_en, b_fa, b_en, mins in ARTICLES:
                session.add(Article(slug=slug, category=cat, title_fa=t_fa, title_en=t_en,
                                    excerpt_fa=e_fa, excerpt_en=e_en, body_fa=b_fa,
                                    body_en=b_en, read_minutes=mins))
        await session.commit()

        if settings.demo_mode:
            if settings.app_env == "production":
                log.warning("DEMO_MODE is on in production: a public demo account exists")
            demo = (await session.exec(select(User).where(User.email == "demo@glow.ir"))).first()
            if not demo:
                demo = User(email="demo@glow.ir", hashed_password=hash_password("glow1234"),
                            display_name="مریم", birth_year=1994, goal="conceive", locale="fa")
                session.add(demo)
                await session.commit()
                await session.refresh(demo)
                today = date.today()
                gaps = [0, 29, 28, 30, 27, 29]
                for i in range(len(gaps)):
                    start = today - timedelta(days=14 + sum(gaps[: i + 1]))
                    session.add(Cycle(user_id=demo.id, period_start=start, period_end=start + timedelta(days=4)))
                for d in range(12, 0, -1):
                    day = today - timedelta(days=d)
                    session.add(DailyLog(user_id=demo.id, log_date=day,
                                         temperature=round(36.35 + (0.05 if d % 2 else 0), 2),
                                         intercourse=(d % 3 == 0), mood="calm",
                                         symptoms="energy" if d < 5 else ""))
                await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if int(os.environ.get("WEB_CONCURRENCY", "1") or 1) > 1:
        log.warning("several workers: rate limits are per process, so each worker counts separately")
    await init_db()
    await seed()
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    configure_logging(settings.log_level)
    docs = settings.app_env == "dev" or settings.enable_docs
    app = FastAPI(
        title=settings.app_name,
        description="Fertility, pregnancy and care API for روشنای باروری (Glow Iran).",
        version="1.1.0",
        lifespan=lifespan,
        docs_url="/docs" if docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if docs else None,
    )
    install_error_handlers(app)
    # Registered innermost-first: SecurityMiddleware wraps everything, including CORS preflights.
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,  # bearer tokens in a header, no cookies: credentials are not needed
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Retry-After", "X-Request-ID"],
        max_age=600,
    )
    app.add_middleware(SecurityMiddleware)
    for r in (auth.router, tracking.router, care.router):
        app.include_router(r)

    @app.get("/api/health", tags=["ops"])
    async def health():
        return {"status": "ok", "service": settings.app_name, "demo": settings.demo_mode}

    @app.get("/api/ready", tags=["ops"])
    async def ready(session: AsyncSession = Depends(get_session)):
        try:
            await session.exec(text("SELECT 1"))
        except Exception:
            log.exception("readiness check failed")
            return JSONResponse({"status": "unavailable"}, 503)
        return {"status": "ready"}

    return app


app = create_app()
