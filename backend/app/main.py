from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select

from .config import settings
from .db import SessionLocal, init_db
from .models import Article, Clinic, Cycle, DailyLog, User
from .routers import auth, care, tracking
from .security import hash_password
from .seed_data import ARTICLES, CLINICS


async def seed() -> None:
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
    await init_db()
    await seed()
    yield


app = FastAPI(
    title=settings.app_name,
    description="Fertility, pregnancy and care API for روشنای باروری (Glow Iran).",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")] + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(tracking.router)
app.include_router(care.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": settings.app_name}
