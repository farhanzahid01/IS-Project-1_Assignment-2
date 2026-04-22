export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type GoalDirection = 'lose' | 'maintain' | 'gain';

export interface Goal {
  id: number;
  sex: Sex;
  age: number;
  heightCm: number;
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  timeframeWeeks: number | null;
  activityLevel: ActivityLevel;
  createdAt: string;
}

export interface DailyTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  direction: GoalDirection;
  deficit: number;
  suggestedActivity: string;
}

export interface FoodEntry {
  id: number;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servings: number;
  loggedAt: string;
}

export type ActivityType = 'run' | 'steps' | 'workout';

export interface ActivityEntry {
  id: number;
  type: ActivityType;
  label: string;
  distanceKm: number | null;
  durationMin: number | null;
  steps: number | null;
  caloriesBurned: number;
  loggedAt: string;
}

export interface Challenge {
  id: number;
  title: string;
  unit: string;
  dailyTarget: number | null;
  totalTarget: number | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface ChallengeLog {
  id: number;
  challengeId: number;
  amount: number;
  loggedAt: string;
}

export interface WeightEntry {
  id: number;
  weightKg: number;
  loggedAt: string;
}
