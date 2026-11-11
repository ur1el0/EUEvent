import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { ManifestFreshnessNotice } from '../components/ManifestFreshnessNotice';
import { CameraPermissionCard } from '../components/scanner/CameraPermissionCard';
import { ScanCameraFrame } from '../components/scanner/ScanCameraFrame';
import { ScanDecisionPanel } from '../components/scanner/ScanDecisionPanel';
import { ScannerStatusLine } from '../components/scanner/ScannerStatusLine';
import { StatusBanner } from '../components/ui/StatusBanner';
import { useManifestFreshness } from '../hooks/useManifestFreshness';
import { useTicketScanner } from '../hooks/useTicketScanner';
import type { AssignedGate } from '../services/assignedGates';
import type { OfflineGateManifest } from '../services/offlineManifestStore';
import { colors, fonts, typography } from '../theme';

export function GateScanModal({
  visible,
  assignment,
  snapshot,
  serverUrl,
  staffId,
  token,
  pendingScanCount,
  onClose,
  onQueueChanged,
}: {
  visible: boolean;
  assignment: AssignedGate;
  snapshot: OfflineGateManifest;
  serverUrl: string;
  staffId: number;
  token: string;
  pendingScanCount: number;
  onClose: () => void;
  onQueueChanged: () => void;
}) {
  const scanner = useTicketScanner({ visible, assignment, snapshot, serverUrl, staffId, token, onQueueChanged });
  const { camera, isScanning, isProcessing, decision, isSyncing, syncStatus, syncIssue } = scanner;
  const freshness = useManifestFreshness(snapshot);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.eyebrow}>SECURITY SCANNER</Text>
              <Text style={styles.title} numberOfLines={1}>{assignment.gate_code} · {assignment.gate_name}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{assignment.event_name} · manifest v{snapshot.manifest.manifest_version}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close scanner" style={styles.closeButton}>
              <X size={19} color={colors.text} />
            </Pressable>
          </View>

          <ScannerStatusLine gateCode={assignment.gate_code} downloadedAt={snapshot.downloadedAt} freshness={freshness} />
          <ManifestFreshnessNotice freshness={freshness} />
          {syncIssue ? <StatusBanner tone="error" message={syncIssue} style={styles.syncIssue} /> : null}

          {Platform.OS === 'web' ? (
            <CameraPermissionCard state="web" />
          ) : camera.isChecking ? (
            <CameraPermissionCard state="checking" />
          ) : !camera.isAllowed ? (
            <CameraPermissionCard state="needed" canBeRequested={camera.canBeRequested} onRequest={camera.request} />
          ) : (
            <>
              <ScanCameraFrame
                active={visible && camera.isAllowed}
                isScanning={isScanning}
                compact={decision !== null}
                onBarcodeScanned={scanner.handleBarcode}
              />
              {decision ? (
                <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
                  <ScanDecisionPanel
                    decision={decision}
                    canScanNext={!isScanning && !isProcessing}
                    onScanNext={scanner.scanNext}
                    isAutoResuming={scanner.isAutoResuming}
                    onHold={scanner.holdResult}
                  />
                </ScrollView>
              ) : (
                <View style={styles.instruction}>
                  {isProcessing ? <ActivityIndicator color={colors.gold} /> : null}
                  <Text style={styles.instructionText}>
                    {isProcessing ? 'Checking ticket…' : isScanning ? 'Align the student QR in the frame' : 'Scan paused'}
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerTitle}>{snapshot.manifest.tickets.length} tickets prepared for this gate</Text>
            {isSyncing ? (
              <View style={styles.syncLine} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.muted} />
                <Text style={styles.footerText}>Syncing saved scans in the background…</Text>
              </View>
            ) : null}
            <Text style={styles.footerText}>
              {pendingScanCount > 0
                ? `${pendingScanCount} ${pendingScanCount === 1 ? 'scan is' : 'scans are'} waiting for server confirmation. Continue scanning; queued scans stay encrypted on this device.`
                : syncStatus || 'Keep the screen visible at the door. Offline scans stay encrypted on this device until they are synchronized.'}
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 12 },
  headerTitleWrap: { flex: 1, gap: 3 },
  eyebrow: { ...typography.eyebrow, color: colors.gold },
  title: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 20 },
  subtitle: { ...typography.caption, color: colors.muted },
  closeButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  syncIssue: { marginBottom: 10 },
  panelScroll: { flex: 1 },
  panelContent: { flexGrow: 1 },
  instruction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 48, marginTop: 12 },
  instructionText: { ...typography.bodyStrong, color: colors.text },
  footer: { marginTop: 'auto', paddingTop: 12, paddingBottom: 4, gap: 4, borderTopWidth: 1, borderTopColor: colors.border },
  footerTitle: { ...typography.label, color: colors.text },
  footerText: { ...typography.caption, color: colors.muted },
  syncLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
