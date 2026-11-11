import { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { StatusBanner } from './StatusBanner';
import { usePalette } from '../../hooks/usePalette';
import { radius, spacing, typography, type Palette } from '../../theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  /** Optional stronger warning shown as a banner above the buttons. */
  warning?: string | null;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A themed yes/no dialog that also works on web, unlike the native Alert. */
export function ConfirmDialog({
  visible,
  title,
  message,
  warning,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? () => undefined : onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {warning ? <StatusBanner tone="warning" message={warning} style={styles.warning} /> : null}
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              loading={busy}
              onPress={onConfirm}
            />
            <Button label={cancelLabel} variant="secondary" disabled={busy} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    card: {
      gap: spacing.sm + 2,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    title: { ...typography.title, color: palette.text },
    message: { ...typography.body, color: palette.text },
    warning: { marginTop: spacing.xs },
    actions: { gap: spacing.sm, marginTop: spacing.sm },
  });
}
