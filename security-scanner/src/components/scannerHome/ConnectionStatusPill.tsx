import { StyleSheet, Text, View } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';
import { colors, typography } from '../../theme';

export function ConnectionStatusPill({ isLoading, isOffline, message }: { isLoading: boolean; isOffline: boolean; message: string }) {
  const hasProblem = Boolean(message) || isOffline;
  const label = isLoading
    ? 'Connecting to event server'
    : isOffline ? 'Offline · saved ticket lists available' : message ? 'Server unavailable' : 'Connected to event server';

  return (
    <View style={[styles.statusPill, hasProblem && styles.statusPillOffline]} accessible accessibilityLabel={label}>
      {hasProblem ? <WifiOff size={15} color={colors.red} /> : <Wifi size={15} color={colors.green} />}
      <Text style={[styles.statusPillText, hasProblem && styles.statusPillTextOffline]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: '#286A58', backgroundColor: '#123D32', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 19 },
  statusPillOffline: { borderColor: '#7B3631', backgroundColor: '#49201E' },
  statusPillText: { ...typography.label, color: colors.green },
  statusPillTextOffline: { color: colors.red },
});
