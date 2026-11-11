import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LogOut, Settings2 } from 'lucide-react-native';
import { ChangePasswordButton } from '../ChangePasswordButton';
import { colors, fonts } from '../../theme';

export function ScannerHomeHeader({ isSigningOut, onSignOut }: { isSigningOut: boolean; onSignOut: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image source={require('../../../assets/euevent-192.png')} style={styles.logo} accessibilityLabel="EUEvent logo" />
        <View>
          <Text style={styles.wordmark}>EU<Text style={styles.wordmarkGold}>EVENT</Text></Text>
          <Text style={styles.brandCaption}>GATE OPERATIONS</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable onPress={() => router.push('/server-settings')} accessibilityRole="button" accessibilityLabel="Server settings" style={styles.iconButton}>
          <Settings2 size={18} color={colors.muted} />
        </Pressable>
        <ChangePasswordButton />
        <Pressable onPress={onSignOut} disabled={isSigningOut} accessibilityRole="button" accessibilityLabel="Sign out" style={styles.iconButton}>
          {isSigningOut ? <ActivityIndicator color={colors.muted} /> : <LogOut size={18} color={colors.muted} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 13 },
  wordmark: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 17, letterSpacing: 0.3 },
  wordmarkGold: { color: colors.gold },
  brandCaption: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 1.45 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
