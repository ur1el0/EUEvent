import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { usePalette } from '../../hooks/usePalette';
import { radius, spacing, touchTarget, typography, type Palette } from '../../theme';

type IconLabelButtonProps = {
  icon: LucideIcon;
  /** Short visible text; also the accessibility label unless one is given. */
  label: string;
  onPress: () => void;
  tone?: 'link' | 'text' | 'muted';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconLabelButton({
  icon: Icon,
  label,
  onPress,
  tone = 'link',
  accessibilityLabel,
  accessibilityHint,
  style,
}: IconLabelButtonProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const color = tone === 'link' ? palette.link : tone === 'text' ? palette.text : palette.muted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Icon color={color} size={18} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    button: {
      minHeight: touchTarget.icon,
      minWidth: touchTarget.icon,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
    pressed: { backgroundColor: palette.surfaceRaised },
    label: { ...typography.bodyStrong },
  });
}
