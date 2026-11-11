import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleCheck, Info, OctagonX, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { usePalette } from '../../hooks/usePalette';
import type { ManifestFreshness } from '../../services/manifestFreshness';
import { radius, spacing, touchTarget, typography, type Palette } from '../../theme';

type ScannerStatusLineProps = {
  gateCode: string;
  downloadedAt: string;
  freshness: ManifestFreshness;
};

const freshnessLabels: Record<ManifestFreshness['decision'], { label: string; icon: LucideIcon }> = {
  fresh: { label: 'Fresh', icon: CircleCheck },
  warn: { label: 'May be outdated', icon: TriangleAlert },
  refuse: { label: 'Scanning paused', icon: OctagonX },
};

/** One compact line above the camera; the long offline explanation sits behind the info button. */
export function ScannerStatusLine({ gateCode, downloadedAt, freshness }: ScannerStatusLineProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [showInfo, setShowInfo] = useState(false);
  const { label, icon: FreshnessIcon } = freshnessLabels[freshness.decision];
  const freshnessColor = freshness.decision === 'fresh' ? palette.success : freshness.decision === 'warn' ? palette.warning : palette.danger;
  const listTime = formatListTime(downloadedAt);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text
          style={styles.text}
          numberOfLines={1}
          accessibilityLabel={`Gate ${gateCode}. Ticket list saved ${listTime}. Ticket list ${label}.`}
        >
          {gateCode} · List {listTime}
        </Text>
        <View style={styles.freshness}>
          <FreshnessIcon color={freshnessColor} size={15} />
          <Text style={[styles.freshnessText, { color: freshnessColor }]}>{label}</Text>
        </View>
        <Pressable
          onPress={() => setShowInfo((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={showInfo ? 'Hide offline scanning details' : 'Show offline scanning details'}
          accessibilityState={{ expanded: showInfo }}
          style={styles.infoButton}
        >
          <Info color={showInfo ? palette.link : palette.muted} size={20} />
        </Pressable>
      </View>
      {showInfo ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoText}>
            This phone checks the rotating QR code against the gate’s ticket list saved {listTime}. The check works without network access.
          </Text>
          <Text style={styles.infoText}>
            Offline scans cannot receive later ticket revocations, event changes, or other gates’ scans. An offline admission stays provisional until the scan is sent to the server.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function formatListTime(downloadedAt: string): string {
  const date = new Date(downloadedAt);
  return Number.isNaN(date.getTime())
    ? 'at an unknown time'
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.sm + 2 },
    row: {
      minHeight: touchTarget.icon,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingLeft: spacing.md - 3,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    text: { ...typography.caption, flex: 1, color: palette.text },
    freshness: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    freshnessText: { ...typography.caption, fontFamily: typography.eyebrow.fontFamily },
    infoButton: { width: touchTarget.icon, height: touchTarget.icon, alignItems: 'center', justifyContent: 'center' },
    infoPanel: { gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md - 3, borderRadius: radius.sm, backgroundColor: palette.surfaceRaised },
    infoText: { ...typography.caption, color: palette.muted },
  });
}
