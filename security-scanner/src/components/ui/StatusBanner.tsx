import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CircleAlert, Info, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { usePalette } from '../../hooks/usePalette';
import { radius, spacing, typography, type Palette } from '../../theme';

type StatusTone = 'info' | 'warning' | 'error';

type StatusBannerProps = {
  tone: StatusTone;
  message: string;
  title?: string;
  /** Full text for screen readers when it differs from what is shown. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const toneIcons: Record<StatusTone, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
};

const tonePrefixes: Record<StatusTone, string> = {
  info: 'Notice',
  warning: 'Warning',
  error: 'Error',
};

/** Status message that pairs an icon and words with colour, never colour alone. */
export function StatusBanner({ tone, message, title, accessibilityLabel, style }: StatusBannerProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const Icon = toneIcons[tone];
  const color = tone === 'info' ? palette.info : tone === 'warning' ? palette.warning : palette.danger;
  const spokenText = accessibilityLabel ?? [title, message].filter(Boolean).join('. ');

  return (
    <View
      accessible
      accessibilityRole={tone === 'info' ? 'text' : 'alert'}
      accessibilityLabel={`${tonePrefixes[tone]}: ${spokenText}`}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.banner, styles[tone], style]}
    >
      <Icon color={color} size={20} strokeWidth={2.4} />
      <View style={styles.textColumn}>
        {title ? <Text style={[styles.title, { color }]}>{title}</Text> : null}
        <Text style={[styles.message, { color: title ? palette.text : color }]}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm + 2,
      padding: spacing.md - 2,
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    info: { backgroundColor: palette.infoSurface, borderColor: palette.border },
    warning: { backgroundColor: palette.warningSurface, borderColor: palette.warning },
    error: { backgroundColor: palette.dangerSurface, borderColor: palette.danger },
    textColumn: { flex: 1, gap: 2 },
    title: { ...typography.status },
    message: { ...typography.bodyStrong },
  });
}
