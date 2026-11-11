import { StyleSheet, Text, View } from 'react-native';
import { Wifi } from 'lucide-react-native';
import { colors, fonts } from '../../theme';

export function ConnectionStatusPill({ isLoading, isOffline, message }: { isLoading: boolean; isOffline: boolean; message: string }) {
  return (
    <View style={[styles.statusPill, (Boolean(message) || isOffline) && styles.statusPillOffline]}>
      <View style={[styles.statusDot, (Boolean(message) || isOffline) && styles.statusDotOffline]} />
      <Text style={[styles.statusPillText, (Boolean(message) || isOffline) && styles.statusPillTextOffline]}>
        {isLoading ? 'Connecting to event server' : isOffline ? 'Offline · local manifests available' : message ? 'Server unavailable' : 'Connected to event server'}
      </Text>
      <Wifi size={14} color={(message || isOffline) ? colors.red : colors.green} />
    </View>
  );
}

const styles = StyleSheet.create({
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: '#286A58', backgroundColor: '#123D32', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 19 },
  statusPillOffline: { borderColor: '#7B3631', backgroundColor: '#49201E' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  statusDotOffline: { backgroundColor: colors.red },
  statusPillText: { color: colors.green, fontFamily: fonts.bodyStrong, fontSize: 11 },
  statusPillTextOffline: { color: colors.red },
});
