import { ActivityIndicator, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useKeepAwake } from 'expo-keep-awake';
import { TriangleAlert, X } from 'lucide-react-native';
import { IconLabelButton } from '../ui/IconLabelButton';
import { usePalette } from '../../hooks/usePalette';
import { usePassBrightness } from '../../hooks/usePassBrightness';
import type { StudentTicket } from '../../services/studentTickets';
import { getNewCodeHint } from '../../services/totpCountdown';
import { colors, radius, spacing, typography } from '../../theme';

const SCREEN_GUTTER = 20;
const QUIET_ZONE = 20;

type TicketPassFullScreenProps = {
  ticket: StudentTicket;
  qrPayload: string;
  secondsRemaining: number;
  codeError: string;
  onClose: () => void;
};

/** Full-screen pass for the gate. Mount it only while open: it keeps the screen awake and bright. */
export function TicketPassFullScreen({ ticket, qrPayload, secondsRemaining, codeError, onClose }: TicketPassFullScreenProps) {
  useKeepAwake('euevent-student-pass');
  usePassBrightness(true);
  const { width, height } = useWindowDimensions();
  const qrSize = Math.max(160, Math.min(width - SCREEN_GUTTER * 2 - QUIET_ZONE * 2, height * 0.5));
  const hint = getNewCodeHint(secondsRemaining);
  const palette = usePalette();

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <View style={styles.topRow}>
            <Text style={styles.eyebrow}>ENTRY PASS</Text>
            <IconLabelButton icon={X} label="Close" tone="text" onPress={onClose} accessibilityLabel="Close pass" />
          </View>

          <Text style={styles.eventName} accessibilityRole="header" numberOfLines={2}>{ticket.event.name}</Text>
          <Text style={styles.gate}>Gate {ticket.gate.code} · {ticket.gate.name}</Text>

          <View style={styles.qrArea}>
            {qrPayload ? (
              <View style={styles.qrFrame} accessible accessibilityRole="image" accessibilityLabel="Ticket QR code for event security to scan">
                <QRCode value={qrPayload} size={qrSize} color={colors.background} backgroundColor="#FFFFFF" />
              </View>
            ) : (
              <View style={[styles.qrPlaceholder, { width: qrSize + QUIET_ZONE * 2, height: qrSize + QUIET_ZONE * 2 }]}>
                <ActivityIndicator color={colors.goldDeep} />
                <Text style={styles.placeholderText}>{codeError || 'Preparing your secure ticket…'}</Text>
              </View>
            )}
          </View>

          <View style={styles.timerRow}>
            <View style={styles.timerTrack}>
              <View style={[styles.timerFill, { width: ((secondsRemaining / 30) * 100).toFixed(2) + '%' as `${number}%` }]} />
            </View>
            <Text style={styles.timerText}>Refreshes in {secondsRemaining}s</Text>
          </View>
          <View
            style={[styles.hint, hint ? { backgroundColor: palette.warningSurface, borderColor: palette.warning } : null]}
            accessibilityLiveRegion="polite"
          >
            {hint ? <TriangleAlert color={palette.warning} size={18} /> : null}
            <Text style={[styles.hintText, hint ? [styles.hintTextWarning, { color: palette.warning }] : null]}>
              {hint ?? 'Hold your phone flat under the scanner.'}
            </Text>
          </View>

          <Text style={styles.footer}>Screen brightness is raised while this pass is open.</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: SCREEN_GUTTER },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.gold },
  eventName: { ...typography.title, color: colors.text },
  gate: { ...typography.sectionTitle, color: colors.gold, marginTop: spacing.xs },
  qrArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  qrFrame: { padding: QUIET_ZONE, borderRadius: radius.lg, backgroundColor: '#FFFFFF' },
  qrPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  placeholderText: { ...typography.body, color: colors.muted, textAlign: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  timerTrack: { height: 8, flex: 1, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  timerFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.gold },
  timerText: { ...typography.bodyStrong, minWidth: 120, color: colors.text, textAlign: 'right' },
  hint: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent' },
  hintText: { ...typography.bodyStrong, color: colors.muted, textAlign: 'center' },
  hintTextWarning: { ...typography.status },
  footer: { ...typography.caption, color: colors.muted, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
});
