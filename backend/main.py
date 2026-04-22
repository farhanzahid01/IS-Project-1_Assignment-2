from datetime import date, datetime, timedelta
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from goal_math import compute_targets
from models import ActivityEntry, Challenge, ChallengeLog, FoodEntry, Goal
from schemas import (
    ActivityIn,
    ActivityOut,
    ChallengeIn,
    ChallengeLogIn,
    ChallengeOut,
    ChallengeProgress,
    FoodIn,
    FoodOut,
    GoalIn,
    GoalOut,
    Targets,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Goal Driven API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _day_range(d: date | None = None) -> tuple[datetime, datetime]:
    d = d or date.today()
    start = datetime.combine(d, datetime.min.time())
    return start, start + timedelta(days=1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/goal", response_model=GoalOut | None)
def get_goal(db: Session = Depends(get_db)):
    return db.execute(select(Goal).order_by(Goal.id.desc()).limit(1)).scalar_one_or_none()


@app.post("/goal", response_model=GoalOut)
def create_goal(payload: GoalIn, db: Session = Depends(get_db)):
    g = Goal(
        **payload.model_dump(),
        start_weight_kg=payload.current_weight_kg,
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@app.get("/goal/targets", response_model=Targets)
def goal_targets(db: Session = Depends(get_db)):
    g = db.execute(select(Goal).order_by(Goal.id.desc()).limit(1)).scalar_one_or_none()
    if not g:
        raise HTTPException(404, "No goal set")
    t = compute_targets(
        g.sex, g.age, g.height_cm, g.current_weight_kg, g.target_weight_kg, g.timeframe_weeks, g.activity_level
    )
    return Targets(**t.__dict__)


@app.get("/food", response_model=list[FoodOut])
def list_food(db: Session = Depends(get_db)):
    start, end = _day_range()
    rows = db.execute(
        select(FoodEntry).where(FoodEntry.logged_at >= start, FoodEntry.logged_at < end).order_by(FoodEntry.logged_at.desc())
    ).scalars().all()
    return rows


@app.post("/food", response_model=FoodOut)
def add_food(payload: FoodIn, db: Session = Depends(get_db)):
    entry = FoodEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@app.delete("/food/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    entry = db.get(FoodEntry, food_id)
    if not entry:
        raise HTTPException(404, "Not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}


@app.get("/activity", response_model=list[ActivityOut])
def list_activity(db: Session = Depends(get_db)):
    start, end = _day_range()
    rows = db.execute(
        select(ActivityEntry)
        .where(ActivityEntry.logged_at >= start, ActivityEntry.logged_at < end)
        .order_by(ActivityEntry.logged_at.desc())
    ).scalars().all()
    return rows


@app.post("/activity", response_model=ActivityOut)
def add_activity(payload: ActivityIn, db: Session = Depends(get_db)):
    entry = ActivityEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@app.delete("/activity/{entry_id}")
def delete_activity(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(ActivityEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}


@app.get("/challenges", response_model=list[ChallengeOut])
def list_challenges(db: Session = Depends(get_db)):
    return db.execute(select(Challenge).order_by(Challenge.created_at.desc())).scalars().all()


@app.post("/challenges", response_model=ChallengeOut)
def add_challenge(payload: ChallengeIn, db: Session = Depends(get_db)):
    c = Challenge(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@app.delete("/challenges/{challenge_id}")
def delete_challenge(challenge_id: int, db: Session = Depends(get_db)):
    c = db.get(Challenge, challenge_id)
    if not c:
        raise HTTPException(404, "Not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


@app.post("/challenges/{challenge_id}/log")
def log_challenge(challenge_id: int, payload: ChallengeLogIn, db: Session = Depends(get_db)):
    c = db.get(Challenge, challenge_id)
    if not c:
        raise HTTPException(404, "Not found")
    db.add(ChallengeLog(challenge_id=challenge_id, amount=payload.amount))
    db.commit()
    return {"ok": True}


@app.get("/challenges/{challenge_id}/progress", response_model=ChallengeProgress)
def challenge_progress(challenge_id: int, db: Session = Depends(get_db)):
    c = db.get(Challenge, challenge_id)
    if not c:
        raise HTTPException(404, "Not found")
    start, end = _day_range()
    today = db.execute(
        select(func.coalesce(func.sum(ChallengeLog.amount), 0)).where(
            ChallengeLog.challenge_id == challenge_id,
            ChallengeLog.logged_at >= start,
            ChallengeLog.logged_at < end,
        )
    ).scalar_one()
    cumulative = db.execute(
        select(func.coalesce(func.sum(ChallengeLog.amount), 0)).where(ChallengeLog.challenge_id == challenge_id)
    ).scalar_one()
    streak = 0
    if c.daily_target:
        day_totals = db.execute(
            select(func.date(ChallengeLog.logged_at), func.sum(ChallengeLog.amount))
            .where(ChallengeLog.challenge_id == challenge_id)
            .group_by(func.date(ChallengeLog.logged_at))
            .order_by(func.date(ChallengeLog.logged_at).desc())
        ).all()
        today_d = date.today()
        for i, (day_str, total) in enumerate(day_totals):
            expected = (today_d - timedelta(days=i)).isoformat()
            if str(day_str) == expected and total >= c.daily_target:
                streak += 1
            else:
                break
    return ChallengeProgress(id=challenge_id, today=float(today), cumulative=float(cumulative), streak=streak)
