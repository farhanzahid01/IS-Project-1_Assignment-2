import { ActivityLevel, DailyTargets, Goal, GoalDirection, Sex } from './types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_SUGGESTIONS: Record<ActivityLevel, string> = {
  sedentary: '6,000 steps + 2 light walks',
  light: '8,000 steps + 3 workouts / week',
  moderate: '10,000 steps + 4 workouts / week',
  active: '12,000 steps + 5 workouts / week',
  very_active: '14,000 steps + 6 workouts / week',
};

const KCAL_PER_KG = 7700;
const MIN_CALORIES_FEMALE = 1200;
const MIN_CALORIES_MALE = 1500;

export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function tdee(bmrVal: number, level: ActivityLevel): number {
  return bmrVal * ACTIVITY_MULTIPLIERS[level];
}

export function directionFor(current: number, target: number): GoalDirection {
  if (Math.abs(current - target) < 0.25) return 'maintain';
  return current > target ? 'lose' : 'gain';
}

export function computeTargets(goal: Goal): DailyTargets {
  const { sex, age, heightCm, currentWeightKg, targetWeightKg, timeframeWeeks, activityLevel } = goal;
  const maintain = tdee(bmr(sex, currentWeightKg, heightCm, age), activityLevel);
  const direction = directionFor(currentWeightKg, targetWeightKg);

  let deficit = 0;
  if (direction !== 'maintain') {
    const deltaKg = Math.abs(currentWeightKg - targetWeightKg);
    if (timeframeWeeks && timeframeWeeks > 0) {
      deficit = (deltaKg * KCAL_PER_KG) / (timeframeWeeks * 7);
    } else {
      deficit = 550;
    }
    deficit = Math.min(deficit, 900);
  }

  const signed = direction === 'lose' ? -deficit : direction === 'gain' ? deficit : 0;
  const floor = sex === 'female' ? MIN_CALORIES_FEMALE : MIN_CALORIES_MALE;
  const calories = Math.max(floor, Math.round(maintain + signed));

  const proteinG = Math.round(1.8 * currentWeightKg);
  const fatG = Math.round(0.9 * currentWeightKg);
  const remainingKcal = Math.max(0, calories - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(remainingKcal / 4);

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    direction,
    deficit: Math.round(Math.abs(signed)),
    suggestedActivity: ACTIVITY_SUGGESTIONS[activityLevel],
  };
}

export function progressToTarget(goal: Goal): number {
  const total = Math.abs(goal.startWeightKg - goal.targetWeightKg);
  if (total === 0) return 1;
  const done = Math.abs(goal.startWeightKg - goal.currentWeightKg);
  return Math.max(0, Math.min(1, done / total));
}

export function predictCompletionDays(
  currentKg: number,
  targetKg: number,
  avgWeeklyDelta: number,
): number | null {
  if (Math.abs(currentKg - targetKg) < 0.25) return 0;
  if (!avgWeeklyDelta || avgWeeklyDelta === 0) return null;
  const needed = currentKg - targetKg;
  if ((needed > 0 && avgWeeklyDelta >= 0) || (needed < 0 && avgWeeklyDelta <= 0)) return null;
  const weeks = Math.abs(needed / avgWeeklyDelta);
  return Math.round(weeks * 7);
}
