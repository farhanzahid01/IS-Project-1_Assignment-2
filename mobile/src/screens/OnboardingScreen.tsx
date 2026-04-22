import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { useGoal } from '../context/GoalContext';
import { ActivityLevel, Sex } from '../domain/types';
import { computeTargets } from '../domain/goal';
import { theme } from '../theme';

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevel }[] = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Active', value: 'active' },
  { label: 'Very', value: 'very_active' },
];

export function OnboardingScreen() {
  const { setGoal } = useGoal();
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('28');
  const [height, setHeight] = useState('175');
  const [current, setCurrent] = useState('80');
  const [target, setTarget] = useState('60');
  const [weeks, setWeeks] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const ageN = parseInt(age, 10);
    const heightN = parseFloat(height);
    const currentN = parseFloat(current);
    const targetN = parseFloat(target);
    if (!ageN || !heightN || !currentN || !targetN) return null;
    try {
      return computeTargets({
        id: 0,
        sex,
        age: ageN,
        heightCm: heightN,
        startWeightKg: currentN,
        currentWeightKg: currentN,
        targetWeightKg: targetN,
        timeframeWeeks: weeks ? parseInt(weeks, 10) : null,
        activityLevel: activity,
        createdAt: '',
      });
    } catch {
      return null;
    }
  }, [sex, age, height, current, target, weeks, activity]);

  const handleSave = async () => {
    const ageN = parseInt(age, 10);
    const heightN = parseFloat(height);
    const currentN = parseFloat(current);
    const targetN = parseFloat(target);
    const weeksN = weeks ? parseInt(weeks, 10) : null;
    if (!ageN || !heightN || !currentN || !targetN) {
      Alert.alert('Missing info', 'Please fill in age, height, current and target weight.');
      return;
    }
    setSaving(true);
    try {
      await setGoal({
        sex,
        age: ageN,
        heightCm: heightN,
        currentWeightKg: currentN,
        targetWeightKg: targetN,
        timeframeWeeks: weeksN,
        activityLevel: activity,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing(10) }}>
        <ScreenHeader
          title="Set your goal"
          subtitle="We'll tailor calories, macros and activity around it."
        />

        <View style={styles.section}>
          <Card>
            <Text style={styles.sectionLabel}>About you</Text>
            <View style={{ marginBottom: theme.spacing(3) }}>
              <Text style={styles.miniLabel}>Sex</Text>
              <SegmentedControl
                options={[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                ]}
                value={sex}
                onChange={setSex}
              />
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: theme.spacing(2) }}>
                <Field label="Age" suffix="yrs" keyboardType="number-pad" value={age} onChangeText={setAge} />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing(2) }}>
                <Field label="Height" suffix="cm" keyboardType="decimal-pad" value={height} onChangeText={setHeight} />
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Card>
            <Text style={styles.sectionLabel}>Your goal</Text>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: theme.spacing(2) }}>
                <Field label="Current" suffix="kg" keyboardType="decimal-pad" value={current} onChangeText={setCurrent} />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing(2) }}>
                <Field label="Target" suffix="kg" keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
              </View>
            </View>
            <Field
              label="Timeframe (optional)"
              suffix="weeks"
              keyboardType="number-pad"
              value={weeks}
              onChangeText={setWeeks}
              placeholder="e.g. 20"
            />
            <Text style={styles.miniLabel}>Typical activity</Text>
            <SegmentedControl options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
          </Card>
        </View>

        {preview ? (
          <View style={styles.section}>
            <Card>
              <Text style={styles.sectionLabel}>Your daily plan</Text>
              <Text style={styles.previewBig}>{preview.calories} kcal</Text>
              <Text style={styles.previewSub}>
                {preview.direction === 'lose'
                  ? `-${preview.deficit} kcal/day deficit`
                  : preview.direction === 'gain'
                  ? `+${preview.deficit} kcal/day surplus`
                  : 'Maintenance'}
              </Text>
              <View style={styles.macroRow}>
                <MacroPill label="Protein" value={`${preview.proteinG}g`} color={theme.colors.protein} />
                <MacroPill label="Carbs" value={`${preview.carbsG}g`} color={theme.colors.carbs} />
                <MacroPill label="Fat" value={`${preview.fatG}g`} color={theme.colors.fat} />
              </View>
              <Text style={styles.activityHint}>Suggested: {preview.suggestedActivity}</Text>
            </Card>
          </View>
        ) : null}

        <View style={styles.section}>
          <Button title={saving ? 'Saving…' : 'Start tracking'} onPress={handleSave} disabled={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MacroPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: theme.spacing(4), marginTop: theme.spacing(2) },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: theme.spacing(3),
  },
  row: { flexDirection: 'row' },
  miniLabel: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  previewBig: { color: theme.colors.text, fontSize: 36, fontWeight: '800' },
  previewSub: { color: theme.colors.accent, fontSize: 13, marginTop: 2, marginBottom: theme.spacing(3) },
  macroRow: { flexDirection: 'row', gap: theme.spacing(2), marginBottom: theme.spacing(3) },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pillLabel: { color: theme.colors.textMuted, fontSize: 12, marginRight: 4 },
  pillValue: { color: theme.colors.text, fontWeight: '700', fontSize: 13 },
  activityHint: { color: theme.colors.textMuted, fontSize: 12 },
});
