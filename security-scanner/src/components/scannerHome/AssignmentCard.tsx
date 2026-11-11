import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, CheckCircle2, CloudDownload, MapPin } from 'lucide-react-native';
import type { AssignedGate } from '../../services/assignedGates';
import type { CachedManifestSummary } from '../../services/offlineManifestStore';
import { colors, fonts } from '../../theme';

export function AssignmentCard({
  assignment,
  cachedManifest,
  isDownloading,
  isOffline,
  manifestVersionMismatch,
  canScan,
  onScan,
  onDownload,
}: {
  assignment: AssignedGate;
  cachedManifest?: CachedManifestSummary;
  isDownloading: boolean;
  isOffline: boolean;
  manifestVersionMismatch: boolean;
  canScan: boolean;
  onScan: () => void;
  onDownload: () => void;
}) {
  const statusLabel = assignment.event_status.replace('_', ' ');
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
          <Text style={styles.gateMeta}>{assignment.gate_code} · Gate ID {assignment.gate_id}</Text>
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
          <Text style={styles.statLabel}>VALID TICKETS</Text>
          <Text style={styles.statValue}>{assignment.ticket_count.toLocaleString()}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>CONFIGURATION</Text>
          <Text style={styles.statValue}>v{assignment.manifest_version}</Text>
        </View>
      </View>
      <View style={styles.manifestRow}>
        <View style={styles.manifestCopy}>
          {cachedManifest ? (
            <>
              <Text style={styles.manifestReady}><CheckCircle2 size={13} color={colors.green} />  Encrypted copy · {cachedManifest.ticketCount} tickets</Text>
              <Text style={styles.manifestMeta}>Version {cachedManifest.manifestVersion} · downloaded {formatDownloadedAt(cachedManifest.downloadedAt)}</Text>
            </>
          ) : (
            <Text style={styles.manifestMeta}>No offline manifest saved for this gate yet.</Text>
          )}
        </View>
        <View style={styles.manifestActions}>
          {canScan ? (
            <Pressable onPress={onScan} disabled={!isActive} accessibilityRole="button" style={[styles.scanButton, !isActive && styles.downloadButtonDisabled]}>
              <Camera size={15} color={colors.gold} />
              <Text style={styles.scanButtonText}>Scan</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onDownload}
            disabled={isDownloading || isOffline || !isActive}
            accessibilityRole="button"
            style={[styles.downloadButton, (isDownloading || isOffline || !isActive) && styles.downloadButtonDisabled]}
          >
            {isDownloading
              ? <ActivityIndicator color={colors.background} size="small" />
              : <CloudDownload size={15} color={colors.background} />}
            <Text style={styles.downloadButtonText}>
              {isDownloading ? 'Saving' : cachedManifest ? 'Update' : 'Prepare'}
            </Text>
          </Pressable>
        </View>
      </View>
      {manifestVersionMismatch ? (
        <Text style={styles.manifestUnavailable}>
          {isOffline
            ? 'Offline: this saved manifest is out of date. Use the event’s offline admission procedure; local results may miss later changes.'
            : 'The event changed after this manifest was saved. Update the manifest before scanning.'}
        </Text>
      ) : null}
      {!isActive ? <Text style={styles.manifestUnavailable}>Manifests are available when the event is scheduled or in progress.</Text> : null}
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
  assignmentCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 21, padding: 15, marginBottom: 12 },
  assignmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assignmentIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  assignmentCopy: { flex: 1, gap: 3 },
  gateName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  gateMeta: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 9 },
  eventBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  eventBadgeActive: { backgroundColor: '#123D32' },
  eventBadgeOther: { backgroundColor: colors.surfaceRaised },
  eventBadgeText: { fontFamily: fonts.bodyBold, fontSize: 8, textTransform: 'uppercase' },
  eventBadgeTextActive: { color: colors.green },
  eventBadgeTextOther: { color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  eventName: { color: colors.text, fontFamily: fonts.heading, fontSize: 19 },
  schedule: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10, marginTop: 3 },
  assignmentStats: { flexDirection: 'row', gap: 28, marginTop: 13 },
  stat: { gap: 3 },
  statLabel: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 1 },
  statValue: { color: colors.text, fontFamily: fonts.bodyStrong, fontSize: 12 },
  manifestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14, paddingTop: 12 },
  manifestActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  scanButton: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.surfaceRaised },
  scanButtonText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 10 },
  manifestCopy: { flex: 1, gap: 4 },
  manifestReady: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 10 },
  manifestMeta: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 9, lineHeight: 14 },
  downloadButton: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.gold },
  downloadButtonDisabled: { opacity: 0.45 },
  downloadButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 10 },
  manifestUnavailable: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 9, marginTop: 8 },
});
