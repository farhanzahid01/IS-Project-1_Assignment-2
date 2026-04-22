from datetime import datetime
from pydantic import BaseModel, Field


class GoalIn(BaseModel):
    sex: str
    age: int = Field(gt=0, lt=120)
    height_cm: float = Field(gt=0, lt=260)
    current_weight_kg: float = Field(gt=20, lt=400)
    target_weight_kg: float = Field(gt=20, lt=400)
    timeframe_weeks: int | None = None
    activity_level: str


class GoalOut(GoalIn):
    id: int
    start_weight_kg: float
    created_at: datetime

    class Config:
        from_attributes = True


class Targets(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    direction: str
    deficit: int


class FoodIn(BaseModel):
    name: str
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    servings: float = 1.0


class FoodOut(FoodIn):
    id: int
    logged_at: datetime

    class Config:
        from_attributes = True


class ActivityIn(BaseModel):
    type: str
    label: str
    distance_km: float | None = None
    duration_min: float | None = None
    steps: int | None = None
    calories_burned: float = 0.0


class ActivityOut(ActivityIn):
    id: int
    logged_at: datetime

    class Config:
        from_attributes = True


class ChallengeIn(BaseModel):
    title: str
    unit: str
    daily_target: float | None = None
    total_target: float | None = None
    end_date: datetime | None = None


class ChallengeLogIn(BaseModel):
    amount: float = Field(gt=0)


class ChallengeOut(ChallengeIn):
    id: int
    start_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ChallengeProgress(BaseModel):
    id: int
    today: float
    cumulative: float
    streak: int
