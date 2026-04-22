import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { computeTargets } from '../domain/goal';
import { DailyTargets, Goal } from '../domain/types';
import { getCurrentGoal, saveGoal, updateCurrentWeight } from '../db';

interface GoalContextValue {
  goal: Goal | null;
  targets: DailyTargets | null;
  loading: boolean;
  setGoal: (g: Parameters<typeof saveGoal>[0]) => Promise<void>;
  logWeight: (kg: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const GoalContext = createContext<GoalContextValue | null>(null);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const g = await getCurrentGoal();
    setGoalState(g);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const setGoal = useCallback(async (input: Parameters<typeof saveGoal>[0]) => {
    await saveGoal(input);
    await refresh();
  }, [refresh]);

  const logWeight = useCallback(async (kg: number) => {
    await updateCurrentWeight(kg);
    await refresh();
  }, [refresh]);

  const targets = useMemo(() => (goal ? computeTargets(goal) : null), [goal]);

  const value: GoalContextValue = { goal, targets, loading, setGoal, logWeight, refresh };
  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoal(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoal must be used inside GoalProvider');
  return ctx;
}
