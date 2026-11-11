import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { colors } from '../theme';

export function ChangePasswordButton() {
  return (
    <Pressable onPress={() => router.push('/change-password')} accessibilityRole="button" accessibilityLabel="Change password" style={styles.iconButton}>
      <KeyRound size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
