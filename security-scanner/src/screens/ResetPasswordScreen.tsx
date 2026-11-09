import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, KeyRound } from 'lucide-react-native';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { resetPassword } from '../services/passwordRecovery';
import { colors, fonts } from '../theme';

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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
            <ArrowLeft color={colors.text} size={19} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.heroIcon}><KeyRound color={colors.gold} size={27} /></View>
          <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.intro}>Use the email address and one-time token from the reset email. Tokens expire after 60 minutes.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Account email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="name@school.edu.ph" placeholderTextColor={colors.muted}
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" maxLength={255}
              style={styles.input} accessibilityLabel="Account email" />

            <Text style={[styles.label, styles.fieldSpacing]}>Reset token</Text>
            <TextInput value={token} onChangeText={setToken} placeholder="Paste the token from your email" placeholderTextColor={colors.muted}
              autoCapitalize="none" autoCorrect={false} autoComplete="off" maxLength={255} style={styles.input}
              accessibilityLabel="One-time reset token" />

            <Text style={[styles.label, styles.fieldSpacing]}>New password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password"
              placeholder="At least 12 characters" placeholderTextColor={colors.muted} style={styles.input}
              accessibilityLabel="New password" />

            <Text style={[styles.label, styles.fieldSpacing]}>Confirm new password</Text>
            <TextInput value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry autoComplete="new-password"
              placeholder="Enter the password again" placeholderTextColor={colors.muted} onSubmitEditing={() => void submit()}
              returnKeyType="done" style={styles.input} accessibilityLabel="Confirm new password" />

            <Text style={styles.helper}>Choose at least 12 characters. Resetting your password signs out existing sessions.</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {notice ? <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
            <Pressable onPress={() => void submit()} disabled={isSubmitting || !email.trim() || !token.trim() || password.length < 12 || !passwordConfirmation}
              accessibilityRole="button" style={[styles.primaryButton, (isSubmitting || !email.trim() || !token.trim() || password.length < 12 || !passwordConfirmation) && styles.disabledButton]}>
              {isSubmitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>Update password</Text>}
            </Pressable>
            {notice ? (
              <Pressable onPress={() => router.replace('/')} accessibilityRole="button" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Return to sign in</Text>
              </Pressable>
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
  backButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 30 },
  backText: { color: colors.text, fontFamily: fonts.bodyStrong, fontSize: 14 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, marginBottom: 20 },
  eyebrow: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.8, marginBottom: 7 },
  title: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 36, lineHeight: 40 },
  intro: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 18 },
  label: { color: colors.text, fontFamily: fonts.bodyStrong, fontSize: 13, marginBottom: 8 },
  fieldSpacing: { marginTop: 15 },
  input: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.background, color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  helper: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, marginTop: 13 },
  error: { marginTop: 12, color: colors.red, fontFamily: fonts.bodyStrong, fontSize: 12, lineHeight: 18 },
  notice: { marginTop: 12, color: colors.green, fontFamily: fonts.bodyStrong, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderRadius: 16, backgroundColor: colors.gold },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 15 },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryButtonText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 13 },
});
