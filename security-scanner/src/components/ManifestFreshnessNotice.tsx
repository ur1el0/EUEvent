import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, OctagonX } from 'lucide-react-native';
import {
  evaluateManifestFreshness,
  getManifestFreshnessCopy,
  type ManifestFreshnessSnapshot,
} from '../services/manifestFreshness';
import { colors, fonts } from '../theme';

const RECHECK_INTERVAL_MS = 60_000;

export function ManifestFreshnessNotice({ snapshot }: { snapshot: ManifestFreshnessSnapshot }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), RECHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const freshness = evaluateManifestFreshness(snapshot, nowMs);
  if (freshness.decision === 'fresh') return null;

  const copy = getManifestFreshnessCopy(freshness);
  const refused = freshness.decision === 'refuse';

  return (
    <View style={[styles.notice, refused ? styles.refused : styles.warning]} accessibilityRole="alert">
      {refused ? <OctagonX size={16} color={colors.red} /> : <AlertTriangle size={16} color={colors.gold} />}
      <View style={styles.copy}>
        <Text style={[styles.title, refused && styles.titleRefused]}>{copy.title}</Text>
        <Text style={styles.detail}>{copy.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 14, borderWidth: 1, padding: 11, marginBottom: 12 },
  warning: { borderColor: '#7B5418', backgroundColor: '#33250D' },
  refused: { borderColor: '#7B3631', backgroundColor: '#49201E' },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12 },
  titleRefused: { color: colors.red },
  detail: { color: colors.text, fontFamily: fonts.bodyRegular, fontSize: 10, lineHeight: 15 },
});
