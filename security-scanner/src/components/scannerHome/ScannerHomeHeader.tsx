import { Image, StyleSheet, Text, View } from 'react-native';
import { ProfileIconButton } from '../ui/ProfileIconButton';
import { colors, fonts, typography } from '../../theme';

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
      <ProfileIconButton />
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
});
