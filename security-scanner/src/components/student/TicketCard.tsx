import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { TicketCheck } from 'lucide-react-native';
import { useTotpTicket } from '../../hooks/useTotpTicket';
import type { StudentTicket } from '../../services/studentTickets';
import { canShowTicketPass } from '../../services/ticketStatus';
import { colors, fonts } from '../../theme';

export function TicketCard({ ticket }: { ticket: StudentTicket }) {
  const canDisplayPass = canShowTicketPass(ticket);
  const { rotatingCode, qrPayload, codeError, secondsRemaining } = useTotpTicket(ticket, canDisplayPass);
  const eventDate = new Date(ticket.event.starts_at);
  const eventSchedule = Number.isNaN(eventDate.getTime())
    ? 'Schedule unavailable'
    : new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(eventDate);
  const statusText = ticket.status === 'claimed'
    ? 'Used'
    : ticket.status === 'revoked'
      ? 'Revoked'
      : ticket.event.status.replace('_', ' ');

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketAccent} />
      <View style={styles.ticketHeader}>
        <View style={styles.ticketTitleGroup}>
          <Text style={styles.ticketEyebrow}>{ticket.event.venue_name}</Text>
          <Text style={styles.ticketEventName}>{ticket.event.name}</Text>
          <Text style={styles.ticketSchedule}>{eventSchedule}</Text>
        </View>
        <View style={[styles.ticketStatus, canDisplayPass ? styles.ticketStatusReady : styles.ticketStatusWaiting]}>
          <Text style={[styles.ticketStatusText, canDisplayPass ? styles.ticketStatusTextReady : styles.ticketStatusTextWaiting]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.ticketDetails}>
        <View style={styles.ticketDetail}>
          <Text style={styles.ticketDetailLabel}>GATE</Text>
          <Text style={styles.ticketDetailValue}>{ticket.gate.code} · {ticket.gate.name}</Text>
        </View>
        <View style={styles.ticketDetail}>
          <Text style={styles.ticketDetailLabel}>TICKET</Text>
          <Text style={styles.ticketDetailValue}>#{ticket.id.toString().padStart(6, '0')}</Text>
        </View>
      </View>

      {canDisplayPass ? (
        <View style={styles.qrArea}>
          {rotatingCode && qrPayload ? (
            <>
              <View style={styles.qrFrame}>
                <QRCode value={qrPayload} size={202} color={colors.background} backgroundColor="#FFFFFF" />
              </View>
              <Text style={styles.qrHelp}>Show this code to event security</Text>
              <Text style={styles.rotatingCode}>{rotatingCode.code}</Text>
              <View style={styles.timerRow}>
                <View style={styles.timerTrack}>
                  <View style={[styles.timerFill, { width: ((secondsRemaining / 30) * 100).toFixed(2) + '%' as `${number}%` }]} />
                </View>
                <Text style={styles.timerText}>Refreshes in {secondsRemaining}s</Text>
              </View>
            </>
          ) : (
            <View style={styles.qrLoading}>
              <ActivityIndicator color={colors.goldDeep} />
              <Text style={styles.qrHelp}>{codeError || 'Preparing your secure ticket…'}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.passUnavailable}>
          <TicketCheck size={19} color={colors.gold} />
          <Text style={styles.passUnavailableTitle}>
            {ticket.status === 'revoked'
              ? 'This ticket is no longer valid'
              : ticket.status === 'claimed'
                ? 'This ticket has already been used'
                : ticket.event.status === 'cancelled'
                ? 'This event was cancelled'
                : ticket.event.status === 'completed'
                  ? 'This event has ended'
                  : 'Pass available when event is scheduled'}
          </Text>
          <Text style={styles.passUnavailableCopy}>
            {ticket.status === 'claimed'
              ? 'This entry has been recorded. Contact event staff if you believe this is a mistake.'
              : ticket.event.status === 'draft' || ticket.event.status === 'postponed'
              ? 'Your ticket stays on this account. Check again after the administrator updates the event.'
              : 'Contact the event administrator if you think this status is incorrect.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ticketCard: { overflow: 'hidden', borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  ticketAccent: { height: 4, backgroundColor: colors.gold },
  ticketHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9, paddingHorizontal: 16, paddingTop: 16 },
  ticketTitleGroup: { flex: 1, gap: 4 },
  ticketEyebrow: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase' },
  ticketEventName: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 22, lineHeight: 25 },
  ticketSchedule: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10 },
  ticketStatus: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  ticketStatusReady: { backgroundColor: '#123D32' },
  ticketStatusWaiting: { backgroundColor: '#49340E' },
  ticketStatusText: { fontFamily: fonts.bodyBold, fontSize: 8, textTransform: 'uppercase' },
  ticketStatusTextReady: { color: colors.green },
  ticketStatusTextWaiting: { color: colors.gold },
  ticketDetails: { flexDirection: 'row', gap: 24, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  ticketDetail: { gap: 3 },
  ticketDetailLabel: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 1 },
  ticketDetailValue: { color: colors.text, fontFamily: fonts.bodyStrong, fontSize: 11 },
  qrArea: { alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, padding: 17 },
  qrFrame: { minWidth: 236, minHeight: 236, alignItems: 'center', justifyContent: 'center', borderRadius: 21, padding: 16, backgroundColor: '#FFFFFF' },
  qrHelp: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10, marginTop: 9 },
  rotatingCode: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 28, letterSpacing: 5, marginTop: 6 },
  timerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  timerTrack: { height: 6, flex: 1, overflow: 'hidden', borderRadius: 999, backgroundColor: colors.surfaceRaised },
  timerFill: { height: '100%', borderRadius: 999, backgroundColor: colors.gold },
  timerText: { width: 86, color: colors.muted, fontFamily: fonts.bodyStrong, fontSize: 9, textAlign: 'right' },
  qrLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 5 },
  passUnavailable: { alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 18, paddingVertical: 22 },
  passUnavailableTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center', marginTop: 8 },
  passUnavailableCopy: { maxWidth: 270, color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 5 },
});
