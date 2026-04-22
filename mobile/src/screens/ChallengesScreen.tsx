import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { NumericPrompt } from '../components/NumericPrompt';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  addChallenge,
  challengeCumulativeTotal,
  challengeStreak,
  challengeTodayTotal,
  deleteChallenge,
  listChallenges,
  logChallenge,
} from '../db';
import { Challenge } from '../domain/types';
import { theme } from '../theme';

interface ChallengeSnap {
  challenge: Challenge;
  today: number;
  cumulative: number;
  streak: number;
}

export function ChallengesScreen() {
  const [snaps, setSnaps] = useState<ChallengeSnap[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<Challenge | null>(null);

  const load = useCallback(async () => {
    const cs = await listChallenges();
    const next = await Promise.all(
      cs.map(async (c) => ({
        challenge: c,
        today: await challengeTodayTotal(c.id),
        cumulative: await challengeCumulativeTotal(c.id),
        streak: c.dailyTarget ? await challengeStreak(c.id, c.dailyTarget) : 0,
      })),
    );
    setSnaps(next);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenHeader
          title="Challenges"
          subtitle="Build streaks and hit big totals."
        />

        <View style={styles.section}>
          {snaps.length === 0 ? (
            <Card>
              <Text style={styles.empty}>
                No challenges yet. Try "100 push-ups per day" or "300 push-ups over 3 months".
              </Text>
            </Card>
          ) : (
            snaps.map((snap) => (
              <ChallengeCard
                key={snap.challenge.id}
                snap={snap}
                onLog={() => setLogTarget(snap.challenge)}
                onDelete={() =>
                  Alert.alert('Delete challenge', snap.challenge.title, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteChallenge(snap.challenge.id);
                        load();
                      },
                    },
                  ])
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.fabWrap}>
        <Button title="+ New challenge" onPress={() => setAddOpen(true)} />
      </View>

      <AddChallengeModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          load();
        }}
      />

      <NumericPrompt
        visible={!!logTarget}
        title={logTarget ? `Log ${logTarget.unit}` : ''}
        message={logTarget?.title}
        suffix={logTarget?.unit}
        initialValue=""
        confirmText="Log"
        onCancel={() => setLogTarget(null)}
        onConfirm={async (n) => {
          if (!logTarget) return;
          await logChallenge(logTarget.id, n);
          setLogTarget(null);
          load();
        }}
      />
    </View>
  );
}

function ChallengeCard({
  snap,
  onLog,
  onDelete,
}: {
  snap: ChallengeSnap;
  onLog: () => void;
  onDelete: () => void;
}) {
  const { challenge, today, cumulative, streak } = snap;
  const dailyPct = challenge.dailyTarget ? Math.min(1, today / challenge.dailyTarget) : 0;
  const totalPct = challenge.totalTarget ? Math.min(1, cumulative / challenge.totalTarget) : 0;
  const dailyDone = challenge.dailyTarget ? today >= challenge.dailyTarget : false;

  return (
    <Card style={{ marginBottom: theme.spacing(3) }}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.meta}>
            {challenge.dailyTarget ? `${challenge.dailyTarget} ${challenge.unit}/day` : null}
            {challenge.dailyTarget && challenge.totalTarget ? ' · ' : null}
            {challenge.totalTarget ? `${challenge.totalTarget} ${challenge.unit} total` : null}
          </Text>
        </View>
        {streak > 0 ? <Text style={styles.streak}>🔥 {streak}</Text> : null}
        <Pressable onPress={onDelete} hitSlop={10} style={{ marginLeft: 10 }}>
          <Text style={styles.deleteX}>×</Text>
        </Pressable>
      </View>

      {challenge.dailyTarget ? (
        <View style={{ marginTop: theme.spacing(3) }}>
          <Text style={styles.rowLabel}>
            Today{' '}
            <Text style={dailyDone ? styles.done : styles.rowValue}>
              {today}/{challenge.dailyTarget} {challenge.unit}
            </Text>
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${dailyPct * 100}%`, backgroundColor: dailyDone ? theme.colors.success : theme.colors.accent },
              ]}
            />
          </View>
        </View>
      ) : null}

      {challenge.totalTarget ? (
        <View style={{ marginTop: theme.spacing(3) }}>
          <Text style={styles.rowLabel}>
            Total <Text style={styles.rowValue}>{cumulative}/{challenge.totalTarget} {challenge.unit}</Text>
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${totalPct * 100}%`, backgroundColor: theme.colors.success }]} />
          </View>
        </View>
      ) : null}

      <Button title={`+ Log ${challenge.unit}`} variant="secondary" onPress={onLog} style={{ marginTop: theme.spacing(3) }} />
    </Card>
  );
}

function AddChallengeModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('reps');
  const [daily, setDaily] = useState('');
  const [total, setTotal] = useState('');

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setUnit('reps');
      setDaily('');
      setTotal('');
    }
  }, [visible]);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Name your challenge.');
      return;
    }
    const dailyN = daily ? parseFloat(daily) : null;
    const totalN = total ? parseFloat(total) : null;
    if (!dailyN && !totalN) {
      Alert.alert('Set a target', 'Add a daily or total target (or both).');
      return;
    }
    await addChallenge({
      title: title.trim(),
      unit: unit.trim() || 'reps',
      dailyTarget: dailyN,
      totalTarget: totalN,
      endDate: null,
    });
    onAdded();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="New challenge"
          right={
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>Close</Text>
            </Pressable>
          }
        />
        <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing(4), paddingBottom: 140 }}>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="100 push-ups per day" />
          <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="reps / km / mins" />
          <Field
            label="Daily target (optional)"
            keyboardType="decimal-pad"
            value={daily}
            onChangeText={setDaily}
            placeholder="e.g. 100"
          />
          <Field
            label="Total target (optional)"
            keyboardType="decimal-pad"
            value={total}
            onChangeText={setTotal}
            placeholder="e.g. 300 over 3 months"
          />
          <Button title="Create challenge" onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: theme.spacing(4), marginTop: theme.spacing(3) },
  empty: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  streak: { color: theme.colors.warning, fontSize: 14, fontWeight: '700' },
  deleteX: { color: theme.colors.textFaint, fontSize: 22, fontWeight: '700', paddingHorizontal: 4 },
  rowLabel: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 6 },
  rowValue: { color: theme.colors.text, fontWeight: '700' },
  done: { color: theme.colors.success, fontWeight: '700' },
  track: { height: 8, backgroundColor: theme.colors.border, borderRadius: theme.radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: theme.radius.pill },
  fabWrap: {
    position: 'absolute',
    left: theme.spacing(4),
    right: theme.spacing(4),
    bottom: theme.spacing(4),
  },
});
