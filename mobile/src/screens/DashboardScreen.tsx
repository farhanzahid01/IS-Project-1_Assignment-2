import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../components/Card';
import { MacroBar } from '../components/MacroBar';
import { ProgressRing } from '../components/ProgressRing';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatTile } from '../components/StatTile';
import { Button } from '../components/Button';
import { NumericPrompt } from '../components/NumericPrompt';
import { useGoal } from '../context/GoalContext';
import {
  challengeCumulativeTotal,
  challengeStreak,
  challengeTodayTotal,
  listActivityForDay,
  listChallenges,
  listFoodEntriesForDay,
} from '../db';
import { progressToTarget } from '../domain/goal';
import { ActivityEntry, Challenge, FoodEntry } from '../domain/types';
import { theme } from '../theme';

interface ChallengeSnapshot {
  challenge: Challenge;
  today: number;
  cumulative: number;
  streak: number;
}

export function DashboardScreen() {
  const { goal, targets, logWeight } = useGoal();
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSnapshot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [weightPromptOpen, setWeightPromptOpen] = useState(false);

  const load = useCallback(async () => {
    const [f, a, cs] = await Promise.all([
      listFoodEntriesForDay(),
      listActivityForDay(),
      listChallenges(),
    ]);
    setFoods(f);
    setActivities(a);
    const snaps = await Promise.all(
      cs.map(async (c) => ({
        challenge: c,
        today: await challengeTodayTotal(c.id),
        cumulative: await challengeCumulativeTotal(c.id),
        streak: c.dailyTarget ? await challengeStreak(c.id, c.dailyTarget) : 0,
      })),
    );
    setChallenges(snaps);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!goal || !targets) return null;

  const consumed = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories * f.servings,
      protein: acc.protein + f.proteinG * f.servings,
      carbs: acc.carbs + f.carbsG * f.servings,
      fat: acc.fat + f.fatG * f.servings,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const burned = activities.reduce((acc, a) => acc + a.caloriesBurned, 0);
  const steps = activities.reduce((acc, a) => acc + (a.steps ?? 0), 0);
  const distanceKm = activities
    .filter((a) => a.type === 'run')
    .reduce((acc, a) => acc + (a.distanceKm ?? 0), 0);

  const net = consumed.calories - burned;
  const remaining = Math.max(0, targets.calories - net);
  const ringProgress = Math.min(1, net / targets.calories);
  const weightProgress = progressToTarget(goal);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingBottom: theme.spacing(10) }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={theme.colors.accent}
        />
      }
    >
      <ScreenHeader title="Today" subtitle={greet()} />

      <View style={styles.section}>
        <Card>
          <View style={styles.ringRow}>
            <ProgressRing
              progress={ringProgress}
              title={`${Math.round(remaining)}`}
              subtitle="kcal left"
              color={theme.colors.accent}
            />
            <View style={{ flex: 1, marginLeft: theme.spacing(4) }}>
              <Text style={styles.statBig}>{Math.round(consumed.calories)}</Text>
              <Text style={styles.statLabel}>consumed</Text>
              <Text style={[styles.statBig, { marginTop: theme.spacing(2) }]}>{Math.round(burned)}</Text>
              <Text style={styles.statLabel}>burned</Text>
              <Text style={[styles.statBig, { marginTop: theme.spacing(2) }]}>{targets.calories}</Text>
              <Text style={styles.statLabel}>daily target</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Card>
          <Text style={styles.cardTitle}>Macros</Text>
          <MacroBar label="Protein" consumed={consumed.protein} target={targets.proteinG} color={theme.colors.protein} />
          <MacroBar label="Carbs" consumed={consumed.carbs} target={targets.carbsG} color={theme.colors.carbs} />
          <MacroBar label="Fat" consumed={consumed.fat} target={targets.fatG} color={theme.colors.fat} />
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.tileRow}>
          <StatTile label="Steps" value={steps.toLocaleString()} accent={theme.colors.success} />
          <View style={{ width: theme.spacing(3) }} />
          <StatTile
            label="Distance"
            value={`${distanceKm.toFixed(1)} km`}
            accent={theme.colors.accentDim}
          />
        </View>
        <View style={{ height: theme.spacing(3) }} />
        <View style={styles.tileRow}>
          <StatTile label="Burned" value={`${Math.round(burned)} kcal`} accent={theme.colors.warning} />
          <View style={{ width: theme.spacing(3) }} />
          <StatTile
            label="Net"
            value={`${Math.round(net)} kcal`}
            hint={`target ${targets.calories}`}
            accent={theme.colors.accent}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Card>
          <Text style={styles.cardTitle}>Weight goal</Text>
          <Text style={styles.weightLine}>
            {goal.currentWeightKg.toFixed(1)} kg{' '}
            <Text style={styles.weightArrow}>→</Text>{' '}
            <Text style={{ color: theme.colors.accent }}>{goal.targetWeightKg.toFixed(1)} kg</Text>
          </Text>
          <View style={styles.weightTrack}>
            <View style={[styles.weightFill, { width: `${weightProgress * 100}%` }]} />
          </View>
          <Text style={styles.weightHint}>
            Started at {goal.startWeightKg.toFixed(1)} kg · {Math.round(weightProgress * 100)}% there
          </Text>
          <Button
            title="Log today's weight"
            variant="secondary"
            onPress={() => setWeightPromptOpen(true)}
            style={{ marginTop: theme.spacing(3) }}
          />
        </Card>
      </View>

      {challenges.length > 0 ? (
        <View style={styles.section}>
          <Card>
            <Text style={styles.cardTitle}>Challenges</Text>
            {challenges.map((c) => (
              <ChallengeSnippet key={c.challenge.id} snap={c} />
            ))}
          </Card>
        </View>
      ) : null}

      <NumericPrompt
        visible={weightPromptOpen}
        title="Log weight"
        message="What do you weigh today?"
        suffix="kg"
        initialValue={goal.currentWeightKg.toFixed(1)}
        onCancel={() => setWeightPromptOpen(false)}
        onConfirm={async (kg) => {
          setWeightPromptOpen(false);
          await logWeight(kg);
          await load();
        }}
      />
    </ScrollView>
  );
}

function ChallengeSnippet({ snap }: { snap: ChallengeSnapshot }) {
  const daily = snap.challenge.dailyTarget;
  const total = snap.challenge.totalTarget;
  const dailyPct = daily ? Math.min(1, snap.today / daily) : 0;
  const totalPct = total ? Math.min(1, snap.cumulative / total) : 0;
  return (
    <View style={{ marginBottom: theme.spacing(3) }}>
      <View style={styles.challengeRow}>
        <Text style={styles.challengeTitle}>{snap.challenge.title}</Text>
        {snap.streak > 0 ? <Text style={styles.streak}>🔥 {snap.streak}</Text> : null}
      </View>
      {daily ? (
        <View style={{ marginTop: 6 }}>
          <Text style={styles.challengeSub}>
            Today {snap.today}/{daily} {snap.challenge.unit}
          </Text>
          <View style={styles.miniTrack}>
            <View style={[styles.miniFill, { width: `${dailyPct * 100}%`, backgroundColor: theme.colors.accent }]} />
          </View>
        </View>
      ) : null}
      {total ? (
        <View style={{ marginTop: 6 }}>
          <Text style={styles.challengeSub}>
            Total {snap.cumulative}/{total} {snap.challenge.unit}
          </Text>
          <View style={styles.miniTrack}>
            <View style={[styles.miniFill, { width: `${totalPct * 100}%`, backgroundColor: theme.colors.success }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning — let\'s hit today\'s target.';
  if (h < 18) return 'Keep going — small wins add up.';
  return 'Evening check-in. One more push.';
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: theme.spacing(4), marginTop: theme.spacing(3) },
  ringRow: { flexDirection: 'row', alignItems: 'center' },
  statBig: { color: theme.colors.text, fontSize: 22, fontWeight: '700' },
  statLabel: { color: theme.colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: theme.spacing(3) },
  tileRow: { flexDirection: 'row' },
  weightLine: { color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(3) },
  weightArrow: { color: theme.colors.textMuted },
  weightTrack: {
    height: 10,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  weightFill: { height: '100%', backgroundColor: theme.colors.accent },
  weightHint: { color: theme.colors.textMuted, fontSize: 12, marginTop: 6 },
  challengeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  challengeSub: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 4 },
  streak: { color: theme.colors.warning, fontSize: 13, fontWeight: '700' },
  miniTrack: { height: 6, backgroundColor: theme.colors.border, borderRadius: theme.radius.pill, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: theme.radius.pill },
});
