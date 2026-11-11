import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, RefreshCw } from 'lucide-react-native';
import { GateScanModal } from './GateScanModal';
import { AssignmentCard } from '../components/scannerHome/AssignmentCard';
import { ClearManifestsButton } from '../components/scannerHome/ClearManifestsButton';
import { ConnectionStatusPill } from '../components/scannerHome/ConnectionStatusPill';
import { PendingQueueCard } from '../components/scannerHome/PendingQueueCard';
import { PreEventChecklist } from '../components/scannerHome/PreEventChecklist';
import { ScannerHomeHeader } from '../components/scannerHome/ScannerHomeHeader';
import { useGateAssignments } from '../hooks/useGateAssignments';
import { usePendingScans } from '../hooks/usePendingScans';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { useStaffSignOut } from '../hooks/useStaffSignOut';
import { colors, fonts } from '../theme';

export function ScannerHomeScreen() {
  const session = useSecuritySession();
  const { token, serverUrl, signOut: endSession } = session;
  const staffId = session.user?.id;
  const queue = usePendingScans(serverUrl, staffId, token);
  const gates = useGateAssignments({ token, staffId, serverUrl, endSession, refreshQueue: queue.refreshQueue });
  const { isSigningOut, signOut } = useStaffSignOut(staffId, queue.pendingScansCount, endSession);
  const [selectedScanGateId, setSelectedScanGateId] = useState<number | null>(null);
  const { assignments, cachedManifests, offlineManifests, message, isOffline, isLoading, isRefreshing } = gates;

  const selectedAssignment = assignments.find((assignment) => assignment.gate_id === selectedScanGateId);
  const selectedManifest = selectedScanGateId === null ? undefined : offlineManifests[selectedScanGateId];

  return (
    <>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={gates.refresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <ScannerHomeHeader isSigningOut={isSigningOut} onSignOut={signOut} />

          <View style={styles.greeting}>
            <Text style={styles.eyebrow}>SECURITY STAFF</Text>
            <Text style={styles.title}>Hi, {session.user?.name.split(' ')[0]}.</Text>
            <Text style={styles.subtitle}>Here are your assigned event gates.</Text>
          </View>

          <ConnectionStatusPill isLoading={isLoading} isOffline={isOffline} message={message} />

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your assignments</Text>
              <Text style={styles.sectionHint}>Current assignments or the last saved offline copies.</Text>
            </View>
            <Pressable onPress={gates.refresh} disabled={isRefreshing} accessibilityRole="button" accessibilityLabel="Refresh assignments" style={styles.refreshButton}>
              {isRefreshing ? <ActivityIndicator color={colors.gold} /> : <RefreshCw size={16} color={colors.gold} />}
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingCard}><ActivityIndicator color={colors.gold} /><Text style={styles.loadingText}>Loading your gate assignments…</Text></View>
          ) : null}
          {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
          <PendingQueueCard
            pendingScansCount={queue.pendingScansCount}
            isSyncingScans={queue.isSyncingScans}
            syncMessage={queue.syncMessage}
            onSync={queue.syncNow}
          />
          {!isLoading && !message && assignments.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><MapPin size={22} color={colors.gold} /></View>
              <Text style={styles.emptyTitle}>No gates assigned yet</Text>
              <Text style={styles.emptyText}>Ask an administrator to assign you to an event gate, then refresh this screen.</Text>
            </View>
          ) : null}
          {assignments.map((assignment) => {
            const snapshot = offlineManifests[assignment.gate_id];
            const manifestVersionMismatch = snapshot !== undefined
              && snapshot.manifest.manifest_version !== assignment.manifest_version;

            return (
              <AssignmentCard
                key={assignment.gate_id}
                assignment={assignment}
                cachedManifest={cachedManifests[assignment.gate_id]}
                isDownloading={gates.downloadingGateId === assignment.gate_id}
                isOffline={isOffline}
                manifestVersionMismatch={manifestVersionMismatch}
                canScan={Boolean(snapshot) && (!manifestVersionMismatch || isOffline)}
                onScan={() => setSelectedScanGateId(assignment.gate_id)}
                onDownload={() => gates.downloadManifest(assignment)}
              />
            );
          })}

          <PreEventChecklist
            staffName={session.user?.name ?? ''}
            assignmentCount={assignments.length}
            preparedGateCount={Object.keys(cachedManifests).length}
          />
          <ClearManifestsButton onPress={gates.confirmClearManifests} />
          <Text style={styles.footer}>EUEvent · Secure entry operations</Text>
        </ScrollView>
      </SafeAreaView>
      {selectedAssignment && selectedManifest ? (
        <GateScanModal
          visible
          assignment={selectedAssignment}
          snapshot={selectedManifest}
          serverUrl={serverUrl}
          staffId={staffId ?? 0}
          token={token ?? ''}
          pendingScanCount={queue.pendingScansCount}
          onClose={() => setSelectedScanGateId(null)}
          onQueueChanged={queue.handleQueueChanged}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 },
  greeting: { marginBottom: 16 },
  eyebrow: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.7, marginBottom: 5 },
  title: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 34, lineHeight: 39 },
  subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 23 },
  sectionHint: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10, marginTop: 2 },
  refreshButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  loadingCard: { minHeight: 108, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 13 },
  loadingText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  error: { color: colors.red, fontFamily: fonts.bodyStrong, fontSize: 12, lineHeight: 18, backgroundColor: '#49201E', borderRadius: 14, padding: 12, marginBottom: 13 },
  emptyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 21, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 25, marginBottom: 14 },
  emptyIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20 },
  emptyText: { color: colors.muted, fontFamily: fonts.bodyRegular, textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 5 },
  footer: { color: colors.muted, fontFamily: fonts.bodyRegular, textAlign: 'center', fontSize: 10, marginTop: 22 },
});
