import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Camera, CloudOff } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { colors, fonts } from '../../theme';

type CameraPermissionCardProps =
  | { state: 'web' }
  | { state: 'checking' }
  | { state: 'needed'; canBeRequested: boolean; onRequest: () => void };

/** Shown instead of the camera on web, while checking access, or when access is missing. */
export function CameraPermissionCard(props: CameraPermissionCardProps) {
  if (props.state === 'checking') {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.gold} />
        <Text style={styles.copy}>Checking camera access…</Text>
      </View>
    );
  }

  if (props.state === 'web') {
    return (
      <View style={styles.card}>
        <CloudOff size={26} color={colors.gold} />
        <Text style={styles.title}>Use the mobile scanner</Text>
        <Text style={styles.copy}>Camera scanning and encrypted offline scan storage are available in the iOS or Android app.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Camera size={27} color={colors.gold} />
      <Text style={styles.title}>Camera access needed</Text>
      <Text style={styles.copy}>EUEvent uses the camera to read student ticket QR codes. The image is checked on this phone and is not uploaded.</Text>
      <Button label={props.canBeRequested ? 'Allow camera' : 'Open settings'} onPress={props.onRequest} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 21, textAlign: 'center' },
  copy: { color: colors.muted, fontFamily: fonts.bodyRegular, textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 280 },
  button: { marginTop: 4, alignSelf: 'stretch' },
});
