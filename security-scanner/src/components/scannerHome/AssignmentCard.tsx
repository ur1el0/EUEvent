import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, MapPin } from 'lucide-react-native';
import { Button } from '../ui/Button';
import type { AssignedGate } from '../../services/assignedGates';
import type { GateScanState } from '../../services/gateScanAvailability';
import type { CachedManifestSummary } from '../../services/offlineManifestStore';
import { getEventStatusLabel } from '../../services/ticketStatus';
import { colors, fonts, radius, spacing, typography } from '../../theme';

type AssignmentCardProps = {
  assignment: AssignedGate;
  cachedManifest?: CachedManifestSummary;
  scanState: GateScanState;
  isDownloading: boolean;
  isOffline: boolean;
  onScan: () => void;
  onDownload: () => void;
};

export function AssignmentCard({ assignment, cachedManifest, scanState, isDownloading, isOffline, onScan, onDownload }: AssignmentCardProps) {
  const statusLabel = getEventStatusLabel(assignment.event_status);
  const eventDate = new Date(assignment.starts_at);
  const schedule = Number.isNaN(eventDate.getTime())
    ? 'Schedule unavailable'
    : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(eventDate);
  const isActive = assignment.event_status === 'scheduled' || assignment.event_status === 'in_progress';

  return (
    <View style={styles.assignmentCard}>
      <View style={styles.assignmentHeader}>
        <View style={styles.assignmentIcon}><MapPin size={19} color={colors.gold} /></View>
        <View style={styles.assignmentCopy}>
          <Text style={styles.gateName}>{assignment.gate_name}</Text>
          <Text style={styles.gateMeta}>Gate {assignment.gate_code}</Text>
        </View>
        <View style={[styles.eventBadge, isActive ? styles.eventBadgeActive : styles.eventBadgeOther]}>
          <Text style={[styles.eventBadgeText, isActive ? styles.eventBadgeTextActive : styles.eventBadgeTextOther]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.eventName}>{assignment.event_name}</Text>
      <Text style={styles.schedule}>{schedule}</Text>
      <View style={styles.assignmentStats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>TICKETS</Text>
          <Text style={styles.statValue}>{assignment.ticket_count.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.manifestRow}>
        {cachedManifest ? (
          <>
            <View style={styles.manifestReadyRow}>
              <CheckCircle2 size={15} color={colors.green} />
              <Text style={styles.manifestReady}>Ready for offline · {cachedManifest.ticketCount} tickets</Text>
            </View>
            <Text style={styles.manifestMeta}>Ticket list saved {formatDownloadedAt(cachedManifest.downloadedAt)}</Text>
          </>
        ) : (
          <Text style={styles.manifestMeta}>No ticket list saved on this phone yet.</Text>
        )}
      </View>

      <Button
        label="Scan"
        onPress={onScan}
        disabled={!scanState.canScan}
        accessibilityHint={scanState.reason ?? `Opens the scanner for ${assignment.gate_name}`}
        style={styles.scanButton}
      />
      {scanState.reason ? <Text style={styles.scanReason}>{scanState.reason}</Text> : null}
      {scanState.isListOutOfDate && isOffline ? (
        <Text style={styles.manifestUnavailable}>
          Offline: this saved ticket list is out of date. Follow the event’s offline admission procedure; results may miss later changes.
        </Text>
      ) : null}
      <Button
        label={cachedManifest ? 'Update ticket list' : 'Download ticket list'}
        loadingLabel="Downloading…"
        variant="secondary"
        onPress={onDownload}
        loading={isDownloading}
        disabled={isOffline || !isActive}
        style={styles.downloadButton}
      />
    </View>
  );
}

function formatDownloadedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'recently'
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

const styles = StyleSheet.create({
  assignmentCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm + 4 },
  assignmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assignmentIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  assignmentCopy: { flex: 1, gap: 3 },
  gateName: { ...typography.bodyStrong, fontFamily: fonts.bodyBold, color: colors.text },
  gateMeta: { ...typography.caption, color: colors.muted },
  eventBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  eventBadgeActive: { backgroundColor: '#123D32' },
  eventBadgeOther: { backgroundColor: colors.surfaceRaised },
  eventBadgeText: { ...typography.caption, fontFamily: fonts.bodyBold },
  eventBadgeTextActive: { color: colors.green },
  eventBadgeTextOther: { color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  eventName: { ...typography.sectionTitle, color: colors.text },
  schedule: { ...typography.caption, color: colors.muted, marginTop: 3 },
  assignmentStats: { flexDirection: 'row', gap: 28, marginTop: 13 },
  stat: { gap: 3 },
  statLabel: { ...typography.eyebrow, color: colors.muted },
  statValue: { ...typography.bodyStrong, color: colors.text },
  manifestRow: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14, paddingTop: 12 },
  manifestReadyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  manifestReady: { ...typography.bodyStrong, fontFamily: fonts.bodyBold, color: colors.green },
  manifestMeta: { ...typography.caption, color: colors.muted },
  scanButton: { marginTop: spacing.md },
  scanReason: { ...typography.bodyStrong, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  manifestUnavailable: { ...typography.caption, color: colors.muted, marginTop: spacing.sm },
  downloadButton: { marginTop: spacing.sm + 2 },
});
