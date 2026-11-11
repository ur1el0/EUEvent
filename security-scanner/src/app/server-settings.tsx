import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Server } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { IconLabelButton } from '../components/ui/IconLabelButton';
import { StatusBanner } from '../components/ui/StatusBanner';
import { TextField } from '../components/ui/TextField';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { testApiConnection } from '../services/apiClient';
import { colors, spacing, typography } from '../theme';

export default function ServerSettingsScreen() {
  const session = useSecuritySession();
  const [url, setUrl] = useState(session.serverUrl);
  const [result, setResult] = useState<{ text: string; success: boolean } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function checkConnection() {
    setIsChecking(true);
    setResult(null);
    try {
      setResult({ text: await testApiConnection(url), success: true });
    } catch (error) {
      setResult({ text: error instanceof Error ? error.message : 'Connection check failed.', success: false });
    } finally {
      setIsChecking(false);
    }
  }

  async function save() {
    setIsSaving(true);
    try {
      const changed = await session.updateServerUrl(url);
      if (changed) router.replace('/');
      else router.back();
    } catch (error) {
      setResult({ text: error instanceof Error ? error.message : 'Could not save this server address.', success: false });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.screen}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <IconLabelButton icon={ArrowLeft} label="Back" tone="text" onPress={() => router.back()} style={styles.backButton} />
          <View style={styles.heroIcon}><Server size={24} color={colors.gold} /></View>
          <Text style={styles.eyebrow}>CONNECTION</Text>
          <Text style={styles.title} accessibilityRole="header">Event server</Text>
          <Text style={styles.intro}>Enter the event server address from your event organizer. Test the connection, then save it.</Text>

          <View style={styles.card}>
            <TextField
              label="Server address"
              accessibilityLabel="Event server address"
              value={url}
              onChangeText={(value) => { setUrl(value); setResult(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
              placeholder="http://192.168.1.10:8000/api/v1"
              helperText="The address ends in /api/v1."
            />
            {result ? (
              <StatusBanner tone={result.success ? 'info' : 'error'} message={result.text} style={styles.result} />
            ) : null}
            <Button label="Test connection" loadingLabel="Testing…" variant="secondary" onPress={() => void checkConnection()} loading={isChecking} style={styles.testButton} />
            <Button label="Save server address" loadingLabel="Saving…" onPress={() => void save()} loading={isSaving} style={styles.saveButton} />
          </View>
          <Text style={styles.signOutNote}>Saving a different server signs you out of this phone.</Text>

          <View style={styles.organizerNote}>
            <Text style={styles.organizerTitle}>For organizers</Text>
            <Text style={styles.organizerText}>
              Include the full /api/v1 suffix. On a physical phone, use the server computer’s Wi-Fi (LAN) IP address, not localhost, and keep the phone on the same network. Plain HTTP is only for a trusted local demo network. Each server issues its own session token, which is why switching signs the phone out.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  backButton: { alignSelf: 'flex-start', marginLeft: -spacing.sm, marginBottom: spacing.lg },
  heroIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, marginBottom: 20 },
  eyebrow: { ...typography.eyebrow, color: colors.gold, marginBottom: 5 },
  title: { ...typography.display, color: colors.text },
  intro: { ...typography.body, color: colors.muted, marginTop: 8, marginBottom: 19 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 17 },
  result: { marginTop: 13 },
  testButton: { marginTop: 16 },
  saveButton: { marginTop: 9 },
  signOutNote: { ...typography.caption, color: colors.muted, textAlign: 'center', marginTop: 17 },
  organizerNote: { gap: 4, marginTop: spacing.lg, padding: spacing.md - 2, borderRadius: 14, backgroundColor: colors.surfaceRaised },
  organizerTitle: { ...typography.label, color: colors.text },
  organizerText: { ...typography.caption, color: colors.muted },
});
