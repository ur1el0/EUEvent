import { router } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { KeyRound, LogOut } from 'lucide-react-native';
import { IconLabelButton } from '../ui/IconLabelButton';
import { colors, fonts, typography } from '../../theme';

export function ScannerHomeHeader({ isSigningOut, onSignOut }: { isSigningOut: boolean; onSignOut: () => void }) {
  return (
    <>
      <View style={styles.brand}>
        <Image source={require('../../../assets/euevent-192.png')} style={styles.logo} accessibilityLabel="EUEvent logo" />
        <View>
          <Text style={styles.wordmark}>EU<Text style={styles.wordmarkGold}>EVENT</Text></Text>
          <Text style={styles.brandCaption}>GATE OPERATIONS</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <IconLabelButton icon={KeyRound} label="Password" tone="muted" onPress={() => router.push('/change-password')} accessibilityLabel="Change password" />
        {isSigningOut
          ? <ActivityIndicator color={colors.muted} style={styles.signingOut} accessibilityLabel="Signing out" />
          : <IconLabelButton icon={LogOut} label="Sign out" tone="muted" onPress={onSignOut} />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  logo: { width: 42, height: 42, borderRadius: 13 },
  wordmark: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 17, letterSpacing: 0.3 },
  wordmarkGold: { color: colors.gold },
  brandCaption: { ...typography.eyebrow, color: colors.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: -8, marginBottom: 20 },
  signingOut: { minWidth: 44, minHeight: 44 },
});
