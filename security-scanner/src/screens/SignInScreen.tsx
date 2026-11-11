import { useMemo } from 'react';
import { router } from 'expo-router';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircleHelp, KeyRound, Mail, Server, ShieldCheck, TicketCheck, UserRound } from 'lucide-react-native';
import { SignInAccountSwitch } from '../components/SignInAccountSwitch';
import { Button } from '../components/ui/Button';
import { IconLabelButton } from '../components/ui/IconLabelButton';
import { StatusBanner } from '../components/ui/StatusBanner';
import { TextField } from '../components/ui/TextField';
import { usePalette } from '../hooks/usePalette';
import { useSignInForm } from '../hooks/useSignInForm';
import { radius, spacing, typography, type Palette } from '../theme';

export function SignInScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { setPasswordInput, ...form } = useSignInForm();
  const { isStudent } = form;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={require('../../assets/euevent-192.png')} style={styles.logo} accessibilityLabel="EUEvent logo" />
            <View>
              <Text style={styles.wordmark}>EU<Text style={styles.wordmarkBrand}>EVENT</Text></Text>
              <Text style={styles.brandCaption}>{isStudent ? 'MOBILE TICKETS' : 'SECURITY SCANNER'}</Text>
            </View>
          </View>

          <View style={styles.heroIcon}>
            {isStudent
              ? <TicketCheck color={palette.brand} size={28} strokeWidth={2.2} />
              : <ShieldCheck color={palette.brand} size={28} strokeWidth={2.2} />}
          </View>
          <Text style={styles.eyebrow}>{isStudent ? 'STUDENT ACCESS' : 'STAFF ACCESS'}</Text>
          <Text style={styles.title} accessibilityRole="header">{isStudent ? 'Your ticket, ready.' : 'Welcome back.'}</Text>
          <Text style={styles.intro}>
            {isStudent
              ? 'Sign in with your student account to securely view your event tickets.'
              : 'Sign in with your staff account to view your assigned event gates.'}
          </Text>

          <SignInAccountSwitch value={form.accountType} onChange={form.selectAccountType} />

          <View style={styles.formCard}>
            <TextField
              label={isStudent ? 'Student number' : 'Staff email'}
              icon={isStudent ? UserRound : Mail}
              value={form.identifier}
              onChangeText={form.setIdentifier}
              placeholder={isStudent ? 'e.g. 2026-00001' : 'name@school.edu.ph'}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isStudent ? 'username' : 'email'}
              keyboardType={isStudent ? 'default' : 'email-address'}
              inputMode={isStudent ? 'text' : 'email'}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={form.focusPassword}
            />
            <TextField
              ref={setPasswordInput}
              label="Password"
              icon={KeyRound}
              secure
              value={form.password}
              onChangeText={form.setPassword}
              placeholder="Enter your password"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={form.submit}
              containerStyle={styles.fieldSpacing}
            />
            <IconLabelButton
              icon={CircleHelp}
              label="Forgot password?"
              onPress={() => router.push('/forgot-password')}
              style={styles.forgotPassword}
            />
            {form.error ? (
              <StatusBanner
                tone="error"
                message={form.error.message}
                accessibilityLabel={form.error.spokenMessage}
                style={styles.banner}
              />
            ) : null}
            <Button
              label="Sign in securely"
              loadingLabel="Signing in…"
              onPress={form.submit}
              loading={form.isSubmitting}
              disabled={form.missingHint !== null}
              accessibilityHint={form.missingHint ?? undefined}
              style={styles.submit}
            />
            {form.missingHint ? (
              <Text style={styles.hint} accessibilityLiveRegion="polite">{form.missingHint}</Text>
            ) : null}
            <Text style={styles.secureNote}>Your session is stored in the device secure store.</Text>
          </View>

          <Text style={styles.footer}>
            {isStudent ? 'Digital tickets are for the assigned student account only' : 'For authorized event security staff only'}
          </Text>
          <View style={styles.connection}>
            <IconLabelButton
              icon={Server}
              label="Connection settings"
              tone="muted"
              onPress={() => router.push('/server-settings')}
              accessibilityHint="Opens the event server address settings"
            />
            {isStudent ? null : (
              <Text style={styles.serverUrl} numberOfLines={1} accessibilityLabel={`Current server ${form.serverUrl}`}>
                {form.serverUrl}
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: palette.background },
    page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg + 2, paddingTop: spacing.xl, paddingBottom: spacing.lg },
    brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginBottom: spacing.xl + 8 },
    logo: { width: 48, height: 48, borderRadius: radius.md - 1 },
    wordmark: { ...typography.sectionTitle, fontFamily: typography.display.fontFamily, color: palette.text, letterSpacing: 0.4 },
    wordmarkBrand: { color: palette.brand },
    brandCaption: { ...typography.eyebrow, color: palette.muted },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceRaised,
      marginBottom: spacing.lg,
    },
    eyebrow: { ...typography.eyebrow, color: palette.brand, marginBottom: spacing.sm },
    title: { ...typography.display, color: palette.text },
    intro: { ...typography.body, color: palette.muted, marginTop: spacing.sm + 2, marginBottom: spacing.lg, maxWidth: 340 },
    formCard: {
      marginTop: spacing.md,
      padding: spacing.lg - 4,
      borderRadius: radius.lg + 4,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    fieldSpacing: { marginTop: spacing.md + 2 },
    forgotPassword: { alignSelf: 'flex-end', marginTop: spacing.xs },
    banner: { marginTop: spacing.sm },
    submit: { marginTop: spacing.md },
    hint: { ...typography.caption, color: palette.muted, textAlign: 'center', marginTop: spacing.sm + 2 },
    secureNote: { ...typography.caption, color: palette.muted, textAlign: 'center', marginTop: spacing.sm + 2 },
    footer: { ...typography.caption, color: palette.muted, textAlign: 'center', marginTop: spacing.lg + 2 },
    connection: { alignItems: 'center', marginTop: spacing.md },
    serverUrl: { ...typography.caption, color: palette.muted, maxWidth: '100%' },
  });
}
