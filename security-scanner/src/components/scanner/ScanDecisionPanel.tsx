import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleCheckBig, CircleX, CloudCheck, IdCard, Pause, Smartphone } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { IconLabelButton } from '../ui/IconLabelButton';
import { usePalette } from '../../hooks/usePalette';
import {
  getConfirmationNote,
  getDecisionAnnouncement,
  getDecisionHeadline,
  type ScanDecision,
} from '../../services/scanDecision';
import { ADMIT_AUTO_RESUME_MS } from '../../services/scanFeedback';
import { fontSizes, fonts, radius, spacing, typography, type Palette } from '../../theme';

type ScanDecisionPanelProps = {
  decision: ScanDecision;
  canScanNext: boolean;
  onScanNext: () => void;
  /** True while an ADMIT counts down to scanning again; tapping the panel holds it. */
  isAutoResuming: boolean;
  onHold: () => void;
};

const AUTO_RESUME_SECONDS = ADMIT_AUTO_RESUME_MS / 1000;

/** The gate decision: ADMIT or DO NOT ADMIT first, then one reason, then small print. */
export function ScanDecisionPanel({ decision, canScanNext, onScanNext, isAutoResuming, onHold }: ScanDecisionPanelProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const admit = decision.verdict === 'admit';
  const color = admit ? palette.success : palette.danger;
  const VerdictIcon = admit ? CircleCheckBig : CircleX;
  const note = getConfirmationNote(decision);
  const NoteIcon = decision.confirmation === 'server' ? CloudCheck : Smartphone;

  return (
    // accessible={false} keeps the decision announcement and buttons reachable inside the tap-to-hold area.
    <Pressable
      accessible={false}
      onPress={isAutoResuming ? onHold : undefined}
      style={[styles.panel, admit ? styles.admit : styles.deny]}
    >
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
      {canScanNext ? (
        <View style={styles.actions}>
          {isAutoResuming ? (
            <View style={styles.resumeRow}>
              <Text style={styles.resumeText}>Scanning resumes in {AUTO_RESUME_SECONDS} seconds.</Text>
              <IconLabelButton icon={Pause} label="Hold" tone="text" onPress={onHold} accessibilityLabel="Hold this result on screen" />
            </View>
          ) : null}
          <Button label="Scan next ticket" onPress={onScanNext} />
        </View>
      ) : null}
    </Pressable>
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
    actions: { marginTop: 'auto', paddingTop: spacing.md, gap: spacing.sm },
    resumeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    resumeText: { ...typography.bodyStrong, flex: 1, color: palette.text },
  });
}
