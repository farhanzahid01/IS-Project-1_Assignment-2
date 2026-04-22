import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { theme } from '../theme';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
