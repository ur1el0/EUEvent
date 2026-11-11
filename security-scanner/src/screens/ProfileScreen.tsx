import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserRound } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAccountProfile } from '../hooks/useAccountProfile';
import { usePalette } from '../hooks/usePalette';
import { radius, spacing, touchTarget, typography, type Palette } from '../theme';

/** Account profile shared by students and security staff; the signed-in role decides the details. */
export function ProfileScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const profile = useAccountProfile();
  const { signOutDialog } = profile;

  // A deep link or restored session may have nothing to go back to, so fall back to the home screen.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
          <ArrowLeft color={palette.text} size={19} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.avatar}><UserRound color={palette.brand} size={28} strokeWidth={2.2} /></View>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.title} accessibilityRole="header">Profile</Text>

        <View style={styles.card}>
          {profile.fields.map((field, index) => (
            <ProfileRow
              key={field.label}
              styles={styles}
              label={field.label}
              value={field.value}
              isLast={index === profile.fields.length - 1}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button label="Change password" variant="secondary" onPress={() => router.push('/change-password')} />
          <Button
            label="Sign out"
            loadingLabel="Signing out…"
            variant="destructive"
            loading={profile.isSigningOut}
            onPress={profile.requestSignOut}
          />
        </View>
        <Text style={styles.note}>{profile.signOutNote}</Text>
      </ScrollView>
      {signOutDialog ? (
        <ConfirmDialog
          visible={signOutDialog.visible}
          title={signOutDialog.title}
          message={signOutDialog.message}
          warning={signOutDialog.warning}
          confirmLabel={signOutDialog.confirmLabel}
          destructive
          busy={signOutDialog.busy}
          onConfirm={signOutDialog.onConfirm}
          onCancel={signOutDialog.onCancel}
        />
      ) : null}
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function ProfileRow({ styles, label, value, isLast = false }: { styles: Styles; label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>{value}</Text>
    </View>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: spacing.xl },
    backButton: {
      minHeight: touchTarget.icon,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    backText: { ...typography.bodyStrong, color: palette.text },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceRaised,
      marginBottom: spacing.md,
    },
    eyebrow: { ...typography.eyebrow, color: palette.brand, marginBottom: spacing.xs },
    title: { ...typography.display, color: palette.text, marginBottom: spacing.md },
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: spacing.md,
    },
    row: { paddingVertical: spacing.md - 2, borderBottomWidth: 1, borderBottomColor: palette.border },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { ...typography.eyebrow, color: palette.muted, marginBottom: spacing.xs },
    rowValue: { ...typography.body, color: palette.text },
    actions: { gap: spacing.sm + 4, marginTop: spacing.md + 7 },
    note: { ...typography.caption, color: palette.muted, marginTop: spacing.md },
  });
}
