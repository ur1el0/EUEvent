import { useMemo } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { IconLabelButton } from '../components/ui/IconLabelButton';
import { StatusBanner } from '../components/ui/StatusBanner';
import { TextField } from '../components/ui/TextField';
import { usePalette } from '../hooks/usePalette';
import { useVerifyRegistration } from '../hooks/useVerifyRegistration';
import { CODE_LIFETIME_MINUTES, RESEND_COOLDOWN_SECONDS, VERIFICATION_CODE_LENGTH } from '../services/registrationConstants';
import { getResendLabel } from '../services/registrationCopy';
import { radius, spacing, typography, type Palette } from '../theme';

type VerifyRegistrationScreenProps = {
  email: string;
  studentNumber: string;
};

export function VerifyRegistrationScreen({ email, studentNumber }: VerifyRegistrationScreenProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const form = useVerifyRegistration(email, studentNumber);
  const isCoolingDown = form.secondsLeft > 0;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <IconLabelButton icon={ArrowLeft} label="Back" tone="text" onPress={() => router.back()} style={styles.back} />

          <View style={styles.heroIcon}><MailCheck color={palette.brand} size={28} strokeWidth={2.2} /></View>
          <Text style={styles.eyebrow}>CHECK YOUR EMAIL</Text>
          <Text style={styles.title} accessibilityRole="header">Enter your code</Text>
          <Text style={styles.intro}>
            If this email can be used to register, we sent a {VERIFICATION_CODE_LENGTH}-digit code to {email}. Check your junk folder too.
          </Text>

          <View style={styles.formCard}>
            <TextField
              label="Verification code"
              icon={ShieldCheck}
              value={form.code}
              onChangeText={form.setCode}
              helperText={`The code expires in ${CODE_LIFETIME_MINUTES} minutes.`}
              placeholder="123456"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              autoCorrect={false}
              maxLength={VERIFICATION_CODE_LENGTH}
              returnKeyType="go"
              onSubmitEditing={form.verify}
            />

            {form.error ? (
              <StatusBanner tone="error" message={form.error.message} accessibilityLabel={form.error.spokenMessage} style={styles.banner} />
            ) : null}
            {form.notice ? <StatusBanner tone="info" message={form.notice} style={styles.banner} /> : null}

            <Button
              label="Verify and create account"
              loadingLabel="Checking…"
              onPress={form.verify}
              loading={form.isVerifying}
              disabled={!form.isComplete}
              accessibilityHint={form.isComplete ? undefined : `Enter all ${VERIFICATION_CODE_LENGTH} digits first`}
              style={styles.submit}
            />
            <Button
              label={getResendLabel(form.secondsLeft)}
              loadingLabel="Sending…"
              variant="secondary"
              onPress={form.resend}
              loading={form.isResending}
              disabled={isCoolingDown}
              accessibilityHint={isCoolingDown ? `You can ask for a new code every ${RESEND_COOLDOWN_SECONDS} seconds` : undefined}
              style={styles.resend}
            />
          </View>

          <Text style={styles.footer}>Wrong email or details? Go back and start again. A new request replaces this one.</Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: palette.background },
    page: { flexGrow: 1, paddingHorizontal: spacing.lg + 2, paddingTop: spacing.md, paddingBottom: spacing.xl },
    back: { alignSelf: 'flex-start', marginLeft: -spacing.sm, marginBottom: spacing.md },
    heroIcon: { width: 58, height: 58, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, marginBottom: spacing.md },
    eyebrow: { ...typography.eyebrow, color: palette.brand, marginBottom: spacing.sm },
    title: { ...typography.display, color: palette.text },
    intro: { ...typography.body, color: palette.muted, marginTop: spacing.sm + 2, marginBottom: spacing.md },
    formCard: { padding: spacing.lg - 4, borderRadius: radius.lg + 4, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    banner: { marginTop: spacing.md },
    submit: { marginTop: spacing.md },
    resend: { marginTop: spacing.sm + 2 },
    footer: { ...typography.caption, color: palette.muted, textAlign: 'center', marginTop: spacing.lg },
  });
}
