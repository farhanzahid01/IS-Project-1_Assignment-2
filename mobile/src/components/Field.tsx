import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../theme';

interface Props extends TextInputProps {
  label: string;
  suffix?: string;
}

export function Field({ label, suffix, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={theme.colors.textFaint}
          style={[styles.input, style]}
          {...rest}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing(3) },
  label: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    paddingVertical: 12,
    fontSize: 16,
  },
  suffix: { color: theme.colors.textMuted, marginLeft: 8 },
});
