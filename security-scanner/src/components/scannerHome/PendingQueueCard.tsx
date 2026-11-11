import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { colors, typography } from '../../theme';

type PendingQueueCardProps = {
  pendingScansCount: number;
  isSyncingScans: boolean;
  syncMessage: string;
  onSync: () => void;
};

/** Scans saved on this phone that the server has not received yet. */
export function PendingQueueCard({ pendingScansCount, isSyncingScans, syncMessage, onSync }: PendingQueueCardProps) {
  if (pendingScansCount === 0) {
    return syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null;
  }

  return (
    <View style={styles.pendingQueue}>
      <Text style={styles.pendingQueueTitle}>
        {pendingScansCount} {pendingScansCount === 1 ? 'scan' : 'scans'} waiting to send
      </Text>
      <Text style={styles.pendingQueueText}>{syncMessage || 'Saved securely on this phone until they are sent to the server.'}</Text>
      <Button
        label="Send to server"
        loadingLabel="Sending…"
        onPress={onSync}
        loading={isSyncingScans}
        accessibilityHint="Uploads the scans saved on this phone"
        style={styles.sendButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pendingQueue: { gap: 4, padding: 14, borderRadius: 17, backgroundColor: '#33250D', borderWidth: 1, borderColor: '#6B5018', marginBottom: 14 },
  pendingQueueTitle: { ...typography.status, color: colors.gold },
  pendingQueueText: { ...typography.body, color: '#E6D5AA' },
  sendButton: { marginTop: 8 },
  syncMessage: { ...typography.caption, color: colors.muted, marginBottom: 12 },
});
