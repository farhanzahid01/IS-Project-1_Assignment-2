from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Goal(Base):
    __tablename__ = "goal"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sex: Mapped[str] = mapped_column(String)
    age: Mapped[int] = mapped_column(Integer)
    height_cm: Mapped[float] = mapped_column(Float)
    start_weight_kg: Mapped[float] = mapped_column(Float)
    current_weight_kg: Mapped[float] = mapped_column(Float)
    target_weight_kg: Mapped[float] = mapped_column(Float)
    timeframe_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    activity_level: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FoodEntry(Base):
    __tablename__ = "food_entry"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    calories: Mapped[float] = mapped_column(Float)
    protein_g: Mapped[float] = mapped_column(Float)
    carbs_g: Mapped[float] = mapped_column(Float)
    fat_g: Mapped[float] = mapped_column(Float)
    servings: Mapped[float] = mapped_column(Float, default=1.0)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ActivityEntry(Base):
    __tablename__ = "activity_entry"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String)
    label: Mapped[str] = mapped_column(String)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories_burned: Mapped[float] = mapped_column(Float)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Challenge(Base):
    __tablename__ = "challenge"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    unit: Mapped[str] = mapped_column(String)
    daily_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    logs: Mapped[list["ChallengeLog"]] = relationship(back_populates="challenge", cascade="all, delete-orphan")


class ChallengeLog(Base):
    __tablename__ = "challenge_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    challenge_id: Mapped[int] = mapped_column(ForeignKey("challenge.id", ondelete="CASCADE"))
    amount: Mapped[float] = mapped_column(Float)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    challenge: Mapped[Challenge] = relationship(back_populates="logs")
