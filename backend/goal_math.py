from dataclasses import dataclass
from typing import Literal

Sex = Literal["male", "female"]
ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]
Direction = Literal["lose", "maintain", "gain"]

ACTIVITY_MULTIPLIERS: dict[str, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

KCAL_PER_KG = 7700


@dataclass
class DailyTargets:
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    direction: str
    deficit: int


def bmr(sex: str, weight_kg: float, height_cm: float, age: int) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == "male" else base - 161


def tdee(bmr_val: float, level: str) -> float:
    return bmr_val * ACTIVITY_MULTIPLIERS.get(level, 1.2)


def direction_for(current: float, target: float) -> str:
    if abs(current - target) < 0.25:
        return "maintain"
    return "lose" if current > target else "gain"


def compute_targets(
    sex: str,
    age: int,
    height_cm: float,
    current_weight_kg: float,
    target_weight_kg: float,
    timeframe_weeks: int | None,
    activity_level: str,
) -> DailyTargets:
    maintain = tdee(bmr(sex, current_weight_kg, height_cm, age), activity_level)
    direction = direction_for(current_weight_kg, target_weight_kg)

    deficit = 0.0
    if direction != "maintain":
        delta = abs(current_weight_kg - target_weight_kg)
        if timeframe_weeks and timeframe_weeks > 0:
            deficit = (delta * KCAL_PER_KG) / (timeframe_weeks * 7)
        else:
            deficit = 550.0
        deficit = min(deficit, 900.0)

    signed = -deficit if direction == "lose" else (deficit if direction == "gain" else 0.0)
    floor = 1200 if sex == "female" else 1500
    calories = max(floor, round(maintain + signed))

    protein_g = round(1.8 * current_weight_kg)
    fat_g = round(0.9 * current_weight_kg)
    remaining = max(0, calories - protein_g * 4 - fat_g * 9)
    carbs_g = round(remaining / 4)

    return DailyTargets(
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
        direction=direction,
        deficit=int(abs(signed)),
    )
