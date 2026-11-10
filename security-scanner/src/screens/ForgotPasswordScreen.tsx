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
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useSecuritySession } from '../hooks/useSecuritySession';
import { requestPasswordResetToken } from '../services/passwordRecovery';
import { colors, fonts } from '../theme';

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
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to sign in" style={styles.backButton}>
            <ArrowLeft color={colors.text} size={19} />
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>

          <View style={styles.heroIcon}><Mail color={colors.gold} size={27} /></View>
          <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={styles.title}>Forgot your password?</Text>
          <Text style={styles.intro}>Enter the email address on your student or security staff account. We’ll send a one-time reset token if the account is eligible.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Account email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@school.edu.ph"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              maxLength={255}
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
              style={styles.input}
              accessibilityLabel="Account email"
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {notice ? <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
            <Pressable
              onPress={() => void submit()}
              disabled={isSubmitting || !email.trim()}
              accessibilityRole="button"
              style={[styles.primaryButton, (isSubmitting || !email.trim()) && styles.disabledButton]}
            >
              {isSubmitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>Send reset token</Text>}
            </Pressable>
            <Pressable onPress={() => router.push('/reset-password')} accessibilityRole="button" style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>I have a reset token</Text>
            </Pressable>
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
  backButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 42 },
  backText: { color: colors.text, fontFamily: fonts.bodyStrong, fontSize: 14 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, marginBottom: 22 },
  eyebrow: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.8, marginBottom: 7 },
  title: { color: colors.text, fontFamily: fonts.headingStrong, fontSize: 36, lineHeight: 40 },
  intro: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 18 },
  label: { color: colors.text, fontFamily: fonts.bodyStrong, fontSize: 13, marginBottom: 8 },
  input: { minHeight: 52, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.background, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  error: { marginTop: 12, color: colors.red, fontFamily: fonts.bodyStrong, fontSize: 12, lineHeight: 18 },
  notice: { marginTop: 12, color: colors.green, fontFamily: fonts.bodyStrong, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderRadius: 16, backgroundColor: colors.gold },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 15 },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryButtonText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 13 },
  footer: { color: colors.muted, fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 22 },
});
