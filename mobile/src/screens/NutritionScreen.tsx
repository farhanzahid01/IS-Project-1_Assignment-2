import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { MacroBar } from '../components/MacroBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { useGoal } from '../context/GoalContext';
import { addFoodEntry, deleteFoodEntry, listFoodEntriesForDay } from '../db';
import { FoodEntry } from '../domain/types';
import { FOOD_PRESETS, FoodPreset, suggestionsFor } from '../domain/foodSuggestions';
import { theme } from '../theme';

export function NutritionScreen() {
  const { targets } = useGoal();
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setFoods(await listFoodEntriesForDay());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!targets) return null;

  const consumed = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories * f.servings,
      protein: acc.protein + f.proteinG * f.servings,
      carbs: acc.carbs + f.carbsG * f.servings,
      fat: acc.fat + f.fatG * f.servings,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const remaining = Math.max(0, targets.calories - consumed.calories);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenHeader title="Nutrition" subtitle={`${Math.round(remaining)} kcal remaining`} />

        <View style={styles.section}>
          <Card>
            <Text style={styles.cardTitle}>Today's intake</Text>
            <MacroBar
              label="Calories"
              consumed={consumed.calories}
              target={targets.calories}
              color={theme.colors.accent}
              unit=" kcal"
            />
            <MacroBar label="Protein" consumed={consumed.protein} target={targets.proteinG} color={theme.colors.protein} />
            <MacroBar label="Carbs" consumed={consumed.carbs} target={targets.carbsG} color={theme.colors.carbs} />
            <MacroBar label="Fat" consumed={consumed.fat} target={targets.fatG} color={theme.colors.fat} />
          </Card>
        </View>

        <View style={styles.section}>
          <Card>
            <Text style={styles.cardTitle}>Logged ({foods.length})</Text>
            {foods.length === 0 ? (
              <Text style={styles.empty}>Nothing logged yet. Tap "Add food" to start.</Text>
            ) : (
              foods.map((f) => (
                <View key={f.id} style={styles.entry}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryName}>{f.name}</Text>
                    <Text style={styles.entryMeta}>
                      {Math.round(f.calories * f.servings)} kcal · P {Math.round(f.proteinG * f.servings)} · C{' '}
                      {Math.round(f.carbsG * f.servings)} · F {Math.round(f.fatG * f.servings)}
                      {f.servings !== 1 ? ` · ${f.servings}×` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete entry', f.name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteFoodEntry(f.id);
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

        <View style={styles.section}>
          <Card>
            <Text style={styles.cardTitle}>Meal ideas for your goal</Text>
            {suggestionsFor(targets.direction)
              .slice(0, 4)
              .map((s) => (
                <View key={s.name} style={styles.suggestion}>
                  <Text style={styles.suggestionName}>{s.name}</Text>
                  <Text style={styles.suggestionMeta}>
                    {s.calories} kcal · P{s.proteinG} C{s.carbsG} F{s.fatG}
                  </Text>
                </View>
              ))}
          </Card>
        </View>
      </ScrollView>

      <View style={styles.fabWrap}>
        <Button title="+ Add food" onPress={() => setModalOpen(true)} />
      </View>

      <AddFoodModal
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

function AddFoodModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<'search' | 'custom'>('search');
  const [query, setQuery] = useState('');
  const [servings, setServings] = useState('1');
  const [selected, setSelected] = useState<FoodPreset | null>(null);

  const [name, setName] = useState('');
  const [cals, setCals] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    if (!visible) {
      setMode('search');
      setQuery('');
      setServings('1');
      setSelected(null);
      setName('');
      setCals('');
      setProtein('');
      setCarbs('');
      setFat('');
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOOD_PRESETS;
    return FOOD_PRESETS.filter((f) => f.name.toLowerCase().includes(q));
  }, [query]);

  const saveFromPreset = async () => {
    if (!selected) return;
    const s = parseFloat(servings) || 1;
    await addFoodEntry({
      name: selected.name,
      calories: selected.calories,
      proteinG: selected.proteinG,
      carbsG: selected.carbsG,
      fatG: selected.fatG,
      servings: s,
    });
    onAdded();
  };

  const saveCustom = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the food a name first.');
      return;
    }
    await addFoodEntry({
      name: name.trim(),
      calories: parseFloat(cals) || 0,
      proteinG: parseFloat(protein) || 0,
      carbsG: parseFloat(carbs) || 0,
      fatG: parseFloat(fat) || 0,
      servings: 1,
    });
    onAdded();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
      >
        <ScreenHeader
          title="Add food"
          right={
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>Close</Text>
            </Pressable>
          }
        />
        <View style={{ paddingHorizontal: theme.spacing(4), marginBottom: theme.spacing(3) }}>
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setMode('search')}
              style={[styles.tab, mode === 'search' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'search' && styles.tabTextActive]}>Search</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('custom')}
              style={[styles.tab, mode === 'custom' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'custom' && styles.tabTextActive]}>Custom</Text>
            </Pressable>
          </View>
        </View>

        {mode === 'search' ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing(4), paddingBottom: 140 }}>
            <TextInput
              placeholder="Search foods…"
              placeholderTextColor={theme.colors.textFaint}
              value={query}
              onChangeText={setQuery}
              style={styles.search}
            />
            {filtered.map((f) => {
              const active = selected?.name === f.name;
              return (
                <Pressable
                  key={f.name}
                  onPress={() => setSelected(f)}
                  style={[styles.presetRow, active && styles.presetRowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.presetName}>{f.name}</Text>
                    <Text style={styles.presetMeta}>
                      {f.calories} kcal · P{f.proteinG} C{f.carbsG} F{f.fatG}
                    </Text>
                  </View>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
            {selected ? (
              <View style={{ marginTop: theme.spacing(3) }}>
                <Field
                  label="Servings"
                  keyboardType="decimal-pad"
                  value={servings}
                  onChangeText={setServings}
                />
                <Button title={`Add ${selected.name}`} onPress={saveFromPreset} />
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing(4), paddingBottom: 140 }}>
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Chicken burrito" />
            <Field label="Calories" suffix="kcal" keyboardType="decimal-pad" value={cals} onChangeText={setCals} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: theme.spacing(2) }}>
                <Field label="Protein" suffix="g" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
              </View>
              <View style={{ flex: 1, marginHorizontal: theme.spacing(1) }}>
                <Field label="Carbs" suffix="g" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing(2) }}>
                <Field label="Fat" suffix="g" keyboardType="decimal-pad" value={fat} onChangeText={setFat} />
              </View>
            </View>
            <Button title="Save food" onPress={saveCustom} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: theme.spacing(4), marginTop: theme.spacing(3) },
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
  suggestion: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionName: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  suggestionMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  fabWrap: {
    position: 'absolute',
    left: theme.spacing(4),
    right: theme.spacing(4),
    bottom: theme.spacing(4),
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: theme.radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: theme.colors.accent },
  tabText: { color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#0b1020' },
  search: {
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing(3),
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  presetRowActive: { borderColor: theme.colors.accent },
  presetName: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  presetMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  check: { color: theme.colors.accent, fontSize: 20, fontWeight: '700', marginLeft: 8 },
});
