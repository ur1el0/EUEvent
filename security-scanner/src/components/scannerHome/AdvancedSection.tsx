import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Server, Trash2 } from 'lucide-react-native';
import { IconLabelButton } from '../ui/IconLabelButton';
import { colors, typography } from '../../theme';

/** Rarely needed tools, kept off the main screen. Each keeps its own confirmation step. */
export function AdvancedSection({ onClearTicketLists }: { onClearTicketLists: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <IconLabelButton
        icon={isOpen ? ChevronUp : ChevronDown}
        label="Advanced"
        tone="muted"
        onPress={() => setIsOpen((open) => !open)}
        accessibilityLabel={isOpen ? 'Hide advanced settings' : 'Show advanced settings'}
        style={styles.toggle}
      />
      {isOpen ? (
        <View style={styles.panel}>
          <IconLabelButton
            icon={Server}
            label="Server settings"
            tone="text"
            onPress={() => router.push('/server-settings')}
            accessibilityHint="Change the event server this phone connects to"
            style={styles.item}
          />
          <Text style={styles.help}>Changing the server signs you out of this phone.</Text>
          <IconLabelButton
            icon={Trash2}
            label="Clear saved ticket lists"
            tone="text"
            onPress={onClearTicketLists}
            accessibilityHint="Asks before removing the ticket lists saved on this phone"
            style={styles.item}
          />
          <Text style={styles.help}>For shared phones after the event. Only clear once every scan has been sent to the server.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  toggle: { alignSelf: 'center' },
  panel: { gap: 4, marginTop: 8, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  item: { alignSelf: 'flex-start', marginLeft: -8 },
  help: { ...typography.caption, color: colors.muted, marginBottom: 6 },
});
