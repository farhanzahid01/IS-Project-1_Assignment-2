import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Field } from './Field';
import { theme } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  suffix?: string;
  initialValue?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}

export function NumericPrompt({
  visible,
  title,
  message,
  suffix,
  initialValue = '',
  confirmText = 'Save',
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Field
              label="Value"
              suffix={suffix}
              keyboardType="decimal-pad"
              value={value}
              onChangeText={setValue}
              autoFocus
            />
            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1, marginRight: 8 }} />
              <Button
                title={confirmText}
                onPress={() => {
                  const n = parseFloat(value);
                  if (!isNaN(n) && n > 0) onConfirm(n);
                }}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: theme.spacing(5),
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(5),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  message: { color: theme.colors.textMuted, fontSize: 13, marginBottom: theme.spacing(3) },
  actions: { flexDirection: 'row', marginTop: theme.spacing(2) },
});
