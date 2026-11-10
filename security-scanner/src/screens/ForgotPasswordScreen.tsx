import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { IconLabelButton } from '../components/ui/IconLabelButton';
import { StatusBanner } from '../components/ui/StatusBanner';
import { TextField } from '../components/ui/TextField';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { requestPasswordResetToken } from '../services/passwordRecovery';
import { colors, fonts, spacing, typography } from '../theme';

export function ForgotPasswordScreen() {
  const { serverUrl } = useSecuritySession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(): Promise<void> {
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const response = await requestPasswordResetToken(email, serverUrl);
      setNotice(response.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request a reset token. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <IconLabelButton icon={ArrowLeft} label="Back to sign in" tone="text" onPress={() => router.back()} style={styles.backButton} />

          <View style={styles.heroIcon}><Mail color={colors.gold} size={27} /></View>
          <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={styles.title} accessibilityRole="header">Forgot your password?</Text>
          <Text style={styles.intro}>Enter the email address on your student or security staff account. We’ll send a one-time reset token if the account is eligible.</Text>

          <View style={styles.card}>
            <TextField
              label="Account email"
              icon={Mail}
              value={email}
              onChangeText={setEmail}
              placeholder="name@school.edu.ph"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              maxLength={255}
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
            />
            {error ? <StatusBanner tone="error" message={error} style={styles.banner} /> : null}
            {notice ? <StatusBanner tone="info" message={notice} style={styles.banner} /> : null}
            <Button
              label="Send reset token"
              loadingLabel="Sending…"
              onPress={() => void submit()}
              loading={isSubmitting}
              disabled={!email.trim()}
              accessibilityHint={email.trim() ? undefined : 'Enter your account email first'}
              style={styles.primaryButton}
            />
            <Button label="I have a reset token" variant="secondary" onPress={() => router.push('/reset-password')} style={styles.secondaryButton} />
          </View>

          <Text style={styles.footer}>Reset email delivery depends on the event server’s mail configuration. If nothing arrives, check junk mail or contact an administrator.</Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  backButton: { alignSelf: 'flex-start', marginLeft: -spacing.sm, marginBottom: 42 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, marginBottom: 22 },
  eyebrow: { ...typography.eyebrow, color: colors.gold, marginBottom: 7 },
  title: { ...typography.display, color: colors.text },
  intro: { ...typography.body, color: colors.muted, marginTop: 10, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 18 },
  banner: { marginTop: 12 },
  primaryButton: { marginTop: 18 },
  secondaryButton: { marginTop: 10 },
  footer: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 22 },
});
