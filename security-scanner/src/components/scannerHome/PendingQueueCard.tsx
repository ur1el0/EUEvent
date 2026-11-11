import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CloudUpload } from 'lucide-react-native';
import { colors, fonts } from '../../theme';

type PendingQueueCardProps = {
  pendingScansCount: number;
  isSyncingScans: boolean;
  syncMessage: string;
  onSync: () => void;
};

export function PendingQueueCard({ pendingScansCount, isSyncingScans, syncMessage, onSync }: PendingQueueCardProps) {
  return pendingScansCount > 0 ? (
    <View style={styles.pendingQueue}>
      <View style={styles.pendingQueueCopy}>
        <Text style={styles.pendingQueueTitle}>{pendingScansCount} {pendingScansCount === 1 ? 'scan' : 'scans'} waiting to sync</Text>
        <Text style={styles.pendingQueueText}>{syncMessage || 'The saved scan queue is encrypted on this device.'}</Text>
      </View>
      <Pressable onPress={onSync} disabled={isSyncingScans} style={styles.syncButton}>
        {isSyncingScans ? <ActivityIndicator color={colors.background} size="small" /> : <CloudUpload size={15} color={colors.background} />}
        <Text style={styles.syncButtonText}>{isSyncingScans ? 'Syncing' : 'Sync'}</Text>
      </Pressable>
    </View>
  ) : syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null;
}

const styles = StyleSheet.create({
  pendingQueue: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 17, backgroundColor: '#33250D', borderWidth: 1, borderColor: '#6B5018', marginBottom: 14 },
  pendingQueueCopy: { flex: 1, gap: 3 },
  pendingQueueTitle: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12 },
  pendingQueueText: { color: '#E6D5AA', fontFamily: fonts.bodyRegular, fontSize: 10, lineHeight: 14 },
  syncButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 13, backgroundColor: colors.gold },
  syncButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 10 },
  syncMessage: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10, marginBottom: 12 },
});
