import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CircleCheck } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { usePalette } from '../../hooks/usePalette';
import type { StudentTicket } from '../../services/studentTickets';
import { radius, spacing, typography } from '../../theme';

/** Full-screen "Ticket scanned" shown in place of the QR once security has scanned the pass. */
export function TicketScannedScreen({ ticket, onDone }: { ticket: StudentTicket; onDone: () => void }) {
  const palette = usePalette();

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, []);

  return (
    <Modal visible animationType="fade" onRequestClose={onDone} presentationStyle="fullScreen">
      <SafeAreaProvider>
        <SafeAreaView style={[styles.screen, { backgroundColor: palette.successSurface }]}>
          <View style={styles.body} accessible accessibilityLiveRegion="polite">
            <View style={[styles.iconCircle, { backgroundColor: palette.success }]}>
              <CircleCheck size={88} color={palette.successSurface} strokeWidth={2.5} />
            </View>
            <Text style={[styles.title, { color: palette.success }]} accessibilityRole="header">Ticket scanned</Text>
            <Text style={[styles.copy, { color: palette.text }]}>
              You&apos;re checked in to {ticket.event.name} at Gate {ticket.gate.code}
            </Text>
          </View>
          <Button label="Done" onPress={onDone} style={styles.done} />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingBottom: spacing.md },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  iconCircle: { width: 144, height: 144, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  title: { ...typography.display, textAlign: 'center' },
  copy: { ...typography.sectionTitle, textAlign: 'center', maxWidth: 320 },
  done: { alignSelf: 'stretch' },
});
