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
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatTile } from '../components/StatTile';
import { useGoal } from '../context/GoalContext';
import { addActivityEntry, deleteActivityEntry, listActivityForDay } from '../db';
import { ActivityEntry, ActivityType } from '../domain/types';
import { theme } from '../theme';

const RUN_KCAL_PER_KM = 65;
const STEPS_KCAL_PER_STEP = 0.04;

export function ActivityScreen() {
  const { goal } = useGoal();
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setItems(await listActivityForDay());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totals = items.reduce(
    (acc, a) => ({
      burned: acc.burned + a.caloriesBurned,
      steps: acc.steps + (a.steps ?? 0),
      runKm: acc.runKm + (a.type === 'run' ? a.distanceKm ?? 0 : 0),
      minutes: acc.minutes + (a.durationMin ?? 0),
    }),
    { burned: 0, steps: 0, runKm: 0, minutes: 0 },
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenHeader title="Activity" subtitle={goal ? goal.activityLevel.replace('_', ' ') : undefined} />

        <View style={styles.section}>
          <View style={styles.row}>
            <StatTile label="Steps" value={totals.steps.toLocaleString()} accent={theme.colors.success} />
            <View style={{ width: theme.spacing(3) }} />
            <StatTile label="Run" value={`${totals.runKm.toFixed(1)} km`} accent={theme.colors.accentDim} />
          </View>
          <View style={{ height: theme.spacing(3) }} />
          <View style={styles.row}>
            <StatTile label="Minutes" value={`${Math.round(totals.minutes)}`} accent={theme.colors.warning} />
            <View style={{ width: theme.spacing(3) }} />
            <StatTile label="Burned" value={`${Math.round(totals.burned)} kcal`} accent={theme.colors.accent} />
          </View>
        </View>

        <View style={styles.section}>
          <Card>
            <Text style={styles.cardTitle}>Today's activity ({items.length})</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>Nothing logged yet. Tap "+ Log activity".</Text>
            ) : (
              items.map((a) => (
                <View key={a.id} style={styles.entry}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryName}>{a.label}</Text>
                    <Text style={styles.entryMeta}>{describeActivity(a)}</Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Remove entry', a.label, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteActivityEntry(a.id);
                            load();
                          },
                        },
                      ])
                    }
                    hitSlop={10}
                  >
                    <Text style={styles.delete}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      <View style={styles.fabWrap}>
        <Button title="+ Log activity" onPress={() => setModalOpen(true)} />
      </View>

      <AddActivityModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => {
          setModalOpen(false);
          load();
        }}
      />
    </View>
  );
}

function describeActivity(a: ActivityEntry): string {
  const parts: string[] = [];
  if (a.distanceKm) parts.push(`${a.distanceKm.toFixed(2)} km`);
  if (a.durationMin) parts.push(`${Math.round(a.durationMin)} min`);
  if (a.steps) parts.push(`${a.steps.toLocaleString()} steps`);
  parts.push(`${Math.round(a.caloriesBurned)} kcal`);
  return parts.join(' · ');
}

function AddActivityModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [type, setType] = useState<ActivityType>('run');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [steps, setSteps] = useState('');
  const [label, setLabel] = useState('');
  const [calories, setCalories] = useState('');

  useEffect(() => {
    if (!visible) {
      setType('run');
      setDistance('');
      setDuration('');
      setSteps('');
      setLabel('');
      setCalories('');
    }
  }, [visible]);

  const autoCalories = (() => {
    if (type === 'run') {
      const km = parseFloat(distance) || 0;
      return km * RUN_KCAL_PER_KM;
    }
    if (type === 'steps') {
      const s = parseFloat(steps) || 0;
      return s * STEPS_KCAL_PER_STEP;
    }
    const mins = parseFloat(duration) || 0;
    return mins * 7;
  })();

  const save = async () => {
    const manual = parseFloat(calories);
    const burn = !isNaN(manual) && manual > 0 ? manual : autoCalories;
    const defaultLabel = type === 'run' ? 'Run' : type === 'steps' ? 'Steps' : 'Workout';
    const entry = {
      type,
      label: label.trim() || defaultLabel,
      distanceKm: type === 'run' ? parseFloat(distance) || null : null,
      durationMin: type !== 'steps' ? parseFloat(duration) || null : null,
      steps: type === 'steps' ? parseInt(steps, 10) || null : null,
      caloriesBurned: Math.round(burn),
    };
    if (!entry.distanceKm && !entry.durationMin && !entry.steps && !entry.caloriesBurned) {
      Alert.alert('Nothing to log', 'Add at least one metric.');
      return;
    }
    await addActivityEntry(entry);
    onAdded();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="Log activity"
          right={
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>Close</Text>
            </Pressable>
          }
        />
        <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing(4), paddingBottom: 140 }}>
          <View style={{ marginBottom: theme.spacing(3) }}>
            <SegmentedControl
              options={[
                { label: 'Run', value: 'run' },
                { label: 'Steps', value: 'steps' },
                { label: 'Workout', value: 'workout' },
              ]}
              value={type}
              onChange={setType}
            />
          </View>

          <Field
            label="Label (optional)"
            value={label}
            onChangeText={setLabel}
            placeholder={type === 'run' ? 'Morning run' : type === 'workout' ? 'Pull day' : 'Steps'}
          />

          {type === 'run' ? (
            <Field label="Distance" suffix="km" keyboardType="decimal-pad" value={distance} onChangeText={setDistance} />
          ) : null}
          {type === 'steps' ? (
            <Field label="Steps" keyboardType="number-pad" value={steps} onChangeText={setSteps} />
          ) : null}
          {type !== 'steps' ? (
            <Field
              label="Duration"
              suffix="min"
              keyboardType="decimal-pad"
              value={duration}
              onChangeText={setDuration}
            />
          ) : null}

          <Field
            label="Calories burned"
            suffix="kcal"
            keyboardType="decimal-pad"
            value={calories}
            onChangeText={setCalories}
            placeholder={`auto ≈ ${Math.round(autoCalories)}`}
          />

          <Button title="Save" onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: theme.spacing(4), marginTop: theme.spacing(3) },
  row: { flexDirection: 'row' },
  cardTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: theme.spacing(3) },
  empty: { color: theme.colors.textMuted, fontSize: 13 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  entryName: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  entryMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  delete: { color: theme.colors.danger, fontSize: 12, fontWeight: '600' },
  fabWrap: {
    position: 'absolute',
    left: theme.spacing(4),
    right: theme.spacing(4),
    bottom: theme.spacing(4),
  },
});
