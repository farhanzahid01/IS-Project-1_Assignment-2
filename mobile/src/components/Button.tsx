import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: Props) {
  const base =
    variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost;
  const textStyle =
    variant === 'primary' ? styles.primaryText : variant === 'secondary' ? styles.secondaryText : styles.ghostText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        base,
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.accent },
  secondary: { backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  ghost: { backgroundColor: 'transparent' },
  primaryText: { color: '#0b1020', fontWeight: '700', fontSize: 15 },
  secondaryText: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
  ghostText: { color: theme.colors.accent, fontWeight: '600', fontSize: 15 },
});
