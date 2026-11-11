import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { usePalette } from '../../hooks/usePalette';
import { radius, touchTarget, type Palette } from '../../theme';

/** The 44x44 header button that opens the account profile page. */
export function ProfileIconButton() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      accessibilityHint="Opens your account, password and sign out"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <UserRound size={20} color={palette.brand} />
    </Pressable>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    button: {
      width: touchTarget.icon,
      height: touchTarget.icon,
      borderRadius: radius.sm + 2,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { backgroundColor: palette.surfaceRaised },
  });
}
