import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '../../hooks/usePalette';
import { radius, spacing, touchTarget, typography, type Palette } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Shown next to the spinner while loading. Defaults to `label`. */
  loadingLabel?: string;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const isInactive = disabled || loading;
  const textColor = variant === 'primary' ? palette.onAccent : variant === 'destructive' ? palette.onDanger : palette.text;
  const visibleLabel = loading ? loadingLabel ?? label : label;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={visibleLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={textColor} /> : null}
        <Text style={[styles.label, { color: textColor }]}>{visibleLabel}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    base: {
      minHeight: touchTarget.button + 4,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    primary: { backgroundColor: palette.accent, borderColor: palette.accent },
    secondary: { backgroundColor: 'transparent', borderColor: palette.controlBorder },
    destructive: { backgroundColor: palette.dangerFill, borderColor: palette.dangerFill },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
    content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    label: { ...typography.button, textAlign: 'center' },
  });
}
