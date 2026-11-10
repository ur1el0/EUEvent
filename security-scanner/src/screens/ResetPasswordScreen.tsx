import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, KeyRound } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { IconLabelButton } from '../components/ui/IconLabelButton';
import { StatusBanner } from '../components/ui/StatusBanner';
import { TextField } from '../components/ui/TextField';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { resetPassword } from '../services/passwordRecovery';
import { colors, spacing, typography } from '../theme';

export function ResetPasswordScreen() {
  const { serverUrl } = useSecuritySession();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(): Promise<void> {
    setError('');
    setNotice('');

    if (password !== passwordConfirmation) {
      setError('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword({
        email,
        token: token.trim(),
        password,
        password_confirmation: passwordConfirmation,
      }, serverUrl);
      setNotice(response.message);
      setToken('');
      setPassword('');
      setPasswordConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset the password. Request a new token and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isIncomplete = !email.trim() || !token.trim() || password.length < 12 || !passwordConfirmation;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <IconLabelButton icon={ArrowLeft} label="Back" tone="text" onPress={() => router.back()} style={styles.backButton} />

          <View style={styles.heroIcon}><KeyRound color={colors.gold} size={27} /></View>
          <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={styles.title} accessibilityRole="header">Set a new password</Text>
          <Text style={styles.intro}>Use the email address and one-time token from the reset email. Tokens expire after 60 minutes.</Text>

          <View style={styles.card}>
            <TextField label="Account email" value={email} onChangeText={setEmail} placeholder="name@school.edu.ph"
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" maxLength={255} />

            <TextField label="Reset token" accessibilityLabel="One-time reset token" value={token} onChangeText={setToken}
              placeholder="Paste the token from your email" autoCapitalize="none" autoCorrect={false} autoComplete="off"
              maxLength={255} containerStyle={styles.fieldSpacing} />

            <TextField label="New password" secure value={password} onChangeText={setPassword} autoComplete="new-password"
              autoCapitalize="none" placeholder="At least 12 characters" containerStyle={styles.fieldSpacing} />

            <TextField label="Confirm new password" secure value={passwordConfirmation} onChangeText={setPasswordConfirmation}
              autoComplete="new-password" autoCapitalize="none" placeholder="Enter the password again"
              onSubmitEditing={() => void submit()} returnKeyType="done" containerStyle={styles.fieldSpacing} />

            <Text style={styles.helper}>Choose at least 12 characters. Resetting your password signs out existing sessions.</Text>
            {error ? <StatusBanner tone="error" message={error} style={styles.banner} /> : null}
            {notice ? <StatusBanner tone="info" message={notice} style={styles.banner} /> : null}
            <Button
              label="Update password"
              loadingLabel="Updating…"
              onPress={() => void submit()}
              loading={isSubmitting}
              disabled={isIncomplete}
              accessibilityHint={isIncomplete ? 'Fill in every field; the new password needs at least 12 characters' : undefined}
              style={styles.primaryButton}
            />
            {notice ? (
              <Button label="Return to sign in" variant="secondary" onPress={() => router.replace('/')} style={styles.secondaryButton} />
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  backButton: { alignSelf: 'flex-start', marginLeft: -spacing.sm, marginBottom: 30 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, marginBottom: 20 },
  eyebrow: { ...typography.eyebrow, color: colors.gold, marginBottom: 7 },
  title: { ...typography.display, color: colors.text },
  intro: { ...typography.body, color: colors.muted, marginTop: 10, marginBottom: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 18 },
  fieldSpacing: { marginTop: 15 },
  helper: { ...typography.caption, color: colors.muted, marginTop: 13 },
  banner: { marginTop: 12 },
  primaryButton: { marginTop: 18 },
  secondaryButton: { marginTop: 10 },
});
