import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { usePalette } from '../../hooks/usePalette';
import { radius, touchTarget, type Palette } from '../../theme';

type RefreshIconButtonProps = {
  onPress: () => void;
  isRefreshing: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** The 44x44 bordered refresh square used on the staff and student home screens. */
export function RefreshIconButton({ onPress, isRefreshing, accessibilityLabel, style }: RefreshIconButtonProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isRefreshing}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: isRefreshing }}
      style={[styles.button, style]}
    >
      {isRefreshing ? <ActivityIndicator color={palette.brand} /> : <RefreshCw size={16} color={palette.brand} />}
    </Pressable>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    button: {
      flexShrink: 0,
      width: touchTarget.icon,
      height: touchTarget.icon,
      borderRadius: radius.sm + 2,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
