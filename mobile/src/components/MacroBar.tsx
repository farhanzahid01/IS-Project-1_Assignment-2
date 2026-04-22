import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  label: string;
  consumed: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, consumed, target, color, unit = 'g' }: Props) {
  const pct = target > 0 ? Math.max(0, Math.min(1, consumed / target)) : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(consumed)}{unit} <Text style={styles.valueMuted}>/ {Math.round(target)}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing(3) },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
  value: { color: theme.colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  valueMuted: { color: theme.colors.textMuted },
  track: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: theme.radius.pill },
});
