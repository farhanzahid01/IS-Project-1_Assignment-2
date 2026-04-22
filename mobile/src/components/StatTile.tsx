import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}

export function StatTile({ label, value, hint, accent = theme.colors.accent }: Props) {
  return (
    <View style={styles.tile}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  label: { color: theme.colors.textMuted, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  value: { color: theme.colors.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  hint: { color: theme.colors.textFaint, fontSize: 11, marginTop: 4 },
});
