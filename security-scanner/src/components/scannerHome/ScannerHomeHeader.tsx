import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { colors, fonts, radius, touchTarget, typography } from '../../theme';

export function ScannerHomeHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image source={require('../../../assets/euevent-192.png')} style={styles.logo} accessibilityLabel="EUEvent logo" />
        <View>
          <Text style={styles.wordmark}>EU<Text style={styles.wordmarkGold}>EVENT</Text></Text>
          <Text style={styles.brandCaption}>GATE OPERATIONS</Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel="Profile"
        accessibilityHint="Opens your account, password and sign out"
        style={({ pressed }) => [styles.profileButton, pressed && styles.profilePressed]}
      >
        <UserRound size={20} color={colors.gold} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 13 },
  wordmark: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 17, letterSpacing: 0.3 },
  wordmarkGold: { color: colors.gold },
  brandCaption: { ...typography.eyebrow, color: colors.muted },
  profileButton: {
    width: touchTarget.icon,
    height: touchTarget.icon,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePressed: { backgroundColor: colors.surfaceRaised },
});
