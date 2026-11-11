import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheckBig, CircleX, CloudCheck, IdCard, Smartphone } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { usePalette } from '../../hooks/usePalette';
import {
  getConfirmationNote,
  getDecisionAnnouncement,
  getDecisionHeadline,
  type ScanDecision,
} from '../../services/scanDecision';
import { fontSizes, fonts, radius, spacing, typography, type Palette } from '../../theme';

type ScanDecisionPanelProps = {
  decision: ScanDecision;
  canScanNext: boolean;
  onScanNext: () => void;
};

/** The gate decision: ADMIT or DO NOT ADMIT first, then one reason, then small print. */
export function ScanDecisionPanel({ decision, canScanNext, onScanNext }: ScanDecisionPanelProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const admit = decision.verdict === 'admit';
  const color = admit ? palette.success : palette.danger;
  const VerdictIcon = admit ? CircleCheckBig : CircleX;
  const note = getConfirmationNote(decision);
  const NoteIcon = decision.confirmation === 'server' ? CloudCheck : Smartphone;

  return (
    <View style={[styles.panel, admit ? styles.admit : styles.deny]}>
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        accessibilityLabel={getDecisionAnnouncement(decision)}
        style={styles.decision}
      >
        <View style={styles.headlineRow}>
          <VerdictIcon color={color} size={52} strokeWidth={2.6} />
          <Text style={[styles.headline, { color }]} adjustsFontSizeToFit numberOfLines={1}>
            {getDecisionHeadline(decision.verdict)}
          </Text>
        </View>
        <Text style={styles.reason}>{decision.reason}</Text>
        {decision.studentNumber ? (
          <View style={styles.studentRow}>
            <IdCard color={palette.muted} size={18} />
            <Text style={styles.studentLabel}>Student no.</Text>
            <Text style={styles.studentNumber} selectable={false}>{decision.studentNumber}</Text>
          </View>
        ) : null}
        {note ? (
          <View style={styles.noteRow}>
            <NoteIcon color={palette.text} size={16} />
            <Text style={styles.note}>{note}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.detail}>{decision.detail}</Text>
      {canScanNext ? <View style={styles.actions}><Button label="Scan next ticket" onPress={onScanNext} /></View> : null}
    </View>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    panel: { flex: 1, marginTop: spacing.sm + 2, padding: spacing.lg - 4, borderRadius: radius.lg, borderWidth: 2 },
    admit: { backgroundColor: palette.successSurface, borderColor: palette.success },
    deny: { backgroundColor: palette.dangerSurface, borderColor: palette.danger },
    decision: { gap: spacing.sm },
    headlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 3 },
    headline: { flex: 1, fontFamily: fonts.headingStrong, fontSize: 44, lineHeight: 50, letterSpacing: 0.5 },
    reason: { ...typography.sectionTitle, color: palette.text },
    studentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md - 3,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: palette.background,
    },
    studentLabel: { ...typography.label, color: palette.muted },
    studentNumber: { fontFamily: fonts.headingStrong, fontSize: 22, lineHeight: 26, color: palette.text, letterSpacing: 0.8 },
    noteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
    note: { ...typography.bodyStrong, flex: 1, color: palette.text },
    detail: { ...typography.caption, color: palette.muted, marginTop: spacing.md - 3, fontSize: fontSizes.caption },
    actions: { marginTop: 'auto', paddingTop: spacing.md },
  });
}
