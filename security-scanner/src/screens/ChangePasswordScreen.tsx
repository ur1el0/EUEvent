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
import { ApiError } from '../services/apiClient';
import { changeAccountPassword, MIN_PASSWORD_LENGTH } from '../services/accountPassword';
import { colors, fonts } from '../theme';

export function ChangePasswordScreen() {
  const { token } = useSecuritySession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = !isSubmitting && Boolean(token) && currentPassword.length > 0
    && password.length >= MIN_PASSWORD_LENGTH && passwordConfirmation.length > 0;

  async function submit(): Promise<void> {
    if (!canSubmit || !token) return;
    setError('');
    setNotice('');

    if (password !== passwordConfirmation) {
      setError('The new passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await changeAccountPassword(token, {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setNotice(response.message);
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError('This session is no longer valid. Sign in again, then change your password.');
      } else if (cause instanceof ApiError && cause.status === 429) {
        setError('Too many attempts. Wait a minute, then try again.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not change the password. Try again.');
      }
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
          <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
          <Text style={styles.title}>Change password</Text>
          <Text style={styles.intro}>This phone stays signed in. Other phones and browsers using this account are signed out.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Current password</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password"
              placeholder="Your current password" placeholderTextColor={colors.muted} style={styles.input}
              accessibilityLabel="Current password" />

            <Text style={[styles.label, styles.fieldSpacing]}>New password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} placeholderTextColor={colors.muted} style={styles.input}
              accessibilityLabel="New password" />

            <Text style={[styles.label, styles.fieldSpacing]}>Confirm new password</Text>
            <TextInput value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry autoComplete="new-password"
              placeholder="Enter the new password again" placeholderTextColor={colors.muted} onSubmitEditing={() => void submit()}
              returnKeyType="done" style={styles.input} accessibilityLabel="Confirm new password" />

            <Text style={styles.helper}>Security staff: scans waiting to sync stay saved on this phone.</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {notice ? <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
            <Pressable onPress={() => void submit()} disabled={!canSubmit} accessibilityRole="button"
              style={[styles.primaryButton, !canSubmit && styles.disabledButton]}>
              {isSubmitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>Update password</Text>}
            </Pressable>
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
});
