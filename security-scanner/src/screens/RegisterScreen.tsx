import { useMemo } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, IdCard, KeyRound, Mail, UserPlus, UserRound } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { IconLabelButton } from '../components/ui/IconLabelButton';
import { StatusBanner } from '../components/ui/StatusBanner';
import { TextField } from '../components/ui/TextField';
import { useFocusChain } from '../hooks/useFocusChain';
import { usePalette } from '../hooks/usePalette';
import { useRegistration } from '../hooks/useRegistration';
import { ALLOWED_EMAIL_DOMAINS, MIN_PASSWORD_LENGTH, STUDENT_NUMBER_EXAMPLE } from '../services/registrationConstants';
import type { RegistrationField } from '../services/registrationValidation';
import { radius, spacing, typography, type Palette } from '../theme';

const FIELD_ORDER: RegistrationField[] = ['studentNumber', 'name', 'email', 'password', 'confirmation'];

export function RegisterScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const form = useRegistration();
  const chain = useFocusChain(FIELD_ORDER);
  const focusAfter = chain.focusNext;
  const bind = (field: RegistrationField) => ({
    ref: chain.register(field),
    value: form.values[field],
    onChangeText: (value: string) => form.setField(field, value),
    onBlur: () => form.markTouched(field),
    errorText: form.errorFor(field),
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <IconLabelButton icon={ArrowLeft} label="Back to sign in" tone="text" onPress={() => router.back()} style={styles.back} />

          <View style={styles.heroIcon}><UserPlus color={palette.brand} size={28} strokeWidth={2.2} /></View>
          <Text style={styles.eyebrow}>NEW STUDENT</Text>
          <Text style={styles.title} accessibilityRole="header">Create your account</Text>
          <Text style={styles.intro}>Use your own student number and school email. We’ll send a 6-digit code to confirm the email.</Text>

          <View style={styles.formCard}>
            <TextField
              {...bind('studentNumber')}
              label="Student number"
              icon={IdCard}
              helperText={`Format ${STUDENT_NUMBER_EXAMPLE}`}
              placeholder={STUDENT_NUMBER_EXAMPLE}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={32}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={focusAfter('studentNumber')}
            />
            <TextField
              {...bind('name')}
              label="Full name"
              icon={UserRound}
              placeholder="Your full name"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={255}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={focusAfter('name')}
              containerStyle={styles.field}
            />
            <TextField
              {...bind('email')}
              label="School email"
              icon={Mail}
              helperText={`Ends in @${ALLOWED_EMAIL_DOMAINS.join(' or @')}`}
              placeholder="name@student.mseuf.edu.ph"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              textContentType="emailAddress"
              maxLength={255}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={focusAfter('email')}
              containerStyle={styles.field}
            />
            <TextField
              {...bind('password')}
              label="Password"
              icon={KeyRound}
              secure
              helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
              placeholder="Choose a password"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={focusAfter('password')}
              containerStyle={styles.field}
            />
            <TextField
              {...bind('confirmation')}
              label="Confirm password"
              icon={KeyRound}
              secure
              placeholder="Enter the password again"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={form.submit}
              containerStyle={styles.field}
            />

            {form.error ? (
              <StatusBanner tone="error" message={form.error.message} accessibilityLabel={form.error.spokenMessage} style={styles.banner} />
            ) : null}
            <Button
              label="Send verification code"
              loadingLabel="Sending code…"
              onPress={form.submit}
              loading={form.isSubmitting}
              accessibilityHint="Checks your details, then emails a 6-digit code"
              style={styles.submit}
            />
          </View>

          <Text style={styles.footer}>Your password is only used to create the account and is not kept on this phone.</Text>
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
    field: { marginTop: spacing.md + 2 },
    banner: { marginTop: spacing.md },
    submit: { marginTop: spacing.md },
    footer: { ...typography.caption, color: palette.muted, textAlign: 'center', marginTop: spacing.lg },
  });
}
