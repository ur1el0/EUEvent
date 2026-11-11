import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloudOff, LogOut, RefreshCw, TicketCheck } from 'lucide-react-native';
import { ChangePasswordButton } from '../components/ChangePasswordButton';
import { TicketCard } from '../components/student/TicketCard';
import { useStudentTickets } from '../hooks/useStudentTickets';
import { colors, fonts } from '../theme';

export function StudentTicketsScreen() {
  const { firstName, tickets, message, isOffline, isLoading, isRefreshing, isSigningOut, refresh, signOut } = useStudentTickets();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.gold} colors={[colors.gold]} />}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require('../../assets/euevent-192.png')} style={styles.logo} accessibilityLabel="EUEvent logo" />
          <View>
            <Text style={styles.wordmark}>EU<Text style={styles.wordmarkGold}>EVENT</Text></Text>
            <Text style={styles.brandCaption}>STUDENT TICKETS</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh tickets" style={styles.iconButton}>
            <RefreshCw size={18} color={colors.muted} />
          </Pressable>
          <ChangePasswordButton />
          <Pressable onPress={signOut} disabled={isSigningOut} accessibilityRole="button" accessibilityLabel="Sign out" style={styles.iconButton}>
            {isSigningOut ? <ActivityIndicator color={colors.muted} /> : <LogOut size={18} color={colors.muted} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>STUDENT ACCESS</Text>
        <Text style={styles.title}>Hi, {firstName}.</Text>
        <Text style={styles.subtitle}>Your event tickets stay ready, even when the connection does not.</Text>
      </View>

      <View style={[styles.connectionPill, isOffline && styles.connectionPillOffline]}>
        {isOffline ? <CloudOff size={13} color={colors.gold} /> : <View style={styles.connectionDot} />}
        <Text style={[styles.connectionText, isOffline && styles.connectionTextOffline]}>
          {isOffline ? 'Secure offline tickets' : 'Ticket account connected'}
        </Text>
      </View>

      {message ? (
        <View style={[styles.messageCard, isOffline && styles.offlineMessage]}>
          <Text style={[styles.messageText, isOffline && styles.offlineMessageText]}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>My tickets</Text>
          <Text style={styles.sectionHint}>{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} on this account</Text>
        </View>
        <View style={styles.ticketCount}><TicketCheck size={14} color={colors.background} /><Text style={styles.ticketCountText}>{tickets.length}</Text></View>
      </View>

      {isLoading && tickets.length === 0 ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.emptyText}>Loading your tickets…</Text>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><TicketCheck size={23} color={colors.gold} /></View>
          <Text style={styles.emptyTitle}>{message ? 'Tickets could not be loaded' : 'No tickets yet'}</Text>
          <Text style={styles.emptyText}>
            {message
              ? 'Connect to the event server and pull down to try again.'
              : 'When an administrator issues a ticket to your student number, it will appear here.'}
          </Text>
        </View>
      ) : (
        tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
      )}

      <View style={styles.securityNote}>
        <View style={styles.securityNoteIcon}><TicketCheck size={16} color={colors.gold} /></View>
        <View style={styles.securityNoteCopy}>
          <Text style={styles.securityNoteTitle}>Your pass refreshes every 30 seconds</Text>
          <Text style={styles.securityNoteBody}>The rotating QR is generated on this phone from a secret saved in secure device storage. Keep your screen brightness up at the gate.</Text>
        </View>
      </View>
      <Text style={styles.footer}>EUEvent · Student entry pass</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 13 },
  wordmark: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 17, letterSpacing: 0.3 },
  wordmarkGold: { color: colors.gold },
  brandCaption: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 1.45 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  greeting: { marginBottom: 15 },
  eyebrow: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.7, marginBottom: 5 },
  title: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 34, lineHeight: 39 },
  subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 310 },
  connectionPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, borderWidth: 1, borderColor: '#286A58', backgroundColor: '#123D32', paddingHorizontal: 11, paddingVertical: 7, marginBottom: 17 },
  connectionPillOffline: { borderColor: '#7B5418', backgroundColor: '#33250D' },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  connectionText: { color: colors.green, fontFamily: fonts.bodyStrong, fontSize: 10 },
  connectionTextOffline: { color: colors.gold },
  messageCard: { backgroundColor: '#49201E', borderRadius: 15, borderWidth: 1, borderColor: '#7B3631', padding: 12, marginBottom: 14 },
  offlineMessage: { backgroundColor: '#33250D', borderColor: '#6B5018' },
  messageText: { color: colors.red, fontFamily: fonts.bodyStrong, fontSize: 11, lineHeight: 17 },
  offlineMessageText: { color: '#E6D5AA' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 23 },
  sectionHint: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 10, marginTop: 2 },
  ticketCount: { minWidth: 37, height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 9, backgroundColor: colors.gold },
  ticketCountText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 11 },
  loadingCard: { minHeight: 110, justifyContent: 'center', alignItems: 'center', gap: 9, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyCard: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 26, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.surfaceRaised, marginBottom: 11 },
  emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19 },
  emptyText: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 19, backgroundColor: '#33250D', borderWidth: 1, borderColor: '#6B5018', marginTop: 4 },
  securityNoteIcon: { width: 30, height: 30, borderRadius: 11, backgroundColor: '#49340E', alignItems: 'center', justifyContent: 'center' },
  securityNoteCopy: { flex: 1, gap: 4 },
  securityNoteTitle: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 11 },
  securityNoteBody: { color: '#E6D5AA', fontFamily: fonts.bodyRegular, fontSize: 9, lineHeight: 14 },
  footer: { color: colors.muted, fontFamily: fonts.bodyRegular, textAlign: 'center', fontSize: 10, marginTop: 22 },
});
