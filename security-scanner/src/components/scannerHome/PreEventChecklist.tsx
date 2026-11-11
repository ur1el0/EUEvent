import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CloudOff, ShieldCheck, TicketCheck } from 'lucide-react-native';
import { colors, fonts } from '../../theme';

type PreEventChecklistProps = {
  staffName: string;
  assignmentCount: number;
  preparedGateCount: number;
};

export function PreEventChecklist({ staffName, assignmentCount, preparedGateCount }: PreEventChecklistProps) {
  return (
    <>
      <View style={styles.checklistCard}>
        <Text style={styles.checklistHeading}>Before doors open</Text>
        <ChecklistRow icon={<ShieldCheck size={17} color={colors.green} />} title="Signed in as security staff" detail={staffName} done />
        <ChecklistRow icon={<TicketCheck size={17} color={assignmentCount ? colors.green : colors.muted} />} title="Gate assignments loaded" detail={`${assignmentCount} assigned ${assignmentCount === 1 ? 'gate' : 'gates'}`} done={assignmentCount > 0} />
        <ChecklistRow
          icon={<CloudOff size={17} color={preparedGateCount ? colors.green : colors.gold} />}
          title="Encrypted offline manifests"
          detail={`${preparedGateCount} ${preparedGateCount === 1 ? 'gate' : 'gates'} prepared on this device`}
          done={preparedGateCount > 0}
          last
        />
      </View>

      <View style={styles.offlineNotice}>
        <View style={styles.noticeIcon}><CloudOff size={17} color={colors.gold} /></View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>Prepare each gate before doors open</Text>
          <Text style={styles.noticeBody}>Download the current ticket manifest while online. QR codes are checked on this phone; encrypted scan records sync when the event server is reachable.</Text>
        </View>
      </View>
    </>
  );
}

function ChecklistRow({ icon, title, detail, done, last = false }: { icon: ReactNode; title: string; detail: string; done: boolean; last?: boolean }) {
  return (
    <View style={[styles.checklistRow, !last && styles.checklistBorder]}>
      <View style={styles.checkIcon}>{icon}</View>
      <View style={styles.checkCopy}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkDetail}>{detail}</Text>
      </View>
      <View style={[styles.checkBadge, done ? styles.checkBadgeDone : styles.checkBadgePending]}>
        <Text style={[styles.checkBadgeText, done ? styles.checkBadgeTextDone : styles.checkBadgeTextPending]}>{done ? 'READY' : 'NEXT'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  checklistCard: { padding: 16, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 3, marginBottom: 14 },
  checklistHeading: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, marginBottom: 8 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', minHeight: 61, gap: 10 },
  checklistBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  checkIcon: { width: 31, alignItems: 'center' },
  checkCopy: { flex: 1, gap: 3 },
  checkTitle: { color: colors.text, fontFamily: fonts.bodyStrong, fontSize: 12 },
  checkDetail: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10, lineHeight: 14 },
  checkBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  checkBadgeDone: { backgroundColor: '#123D32' },
  checkBadgePending: { backgroundColor: colors.surfaceRaised },
  checkBadgeText: { fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 0.7 },
  checkBadgeTextDone: { color: colors.green },
  checkBadgeTextPending: { color: colors.gold },
  offlineNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#33250D', borderWidth: 1, borderColor: '#6B5018' },
  noticeIcon: { width: 30, height: 30, borderRadius: 11, backgroundColor: '#49340E', alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1, gap: 4 },
  noticeTitle: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12 },
  noticeBody: { color: '#E6D5AA', fontFamily: fonts.bodyRegular, fontSize: 10, lineHeight: 15 },
});
