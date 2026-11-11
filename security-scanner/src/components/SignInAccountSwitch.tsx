import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, TicketCheck, type LucideIcon } from 'lucide-react-native';
import { usePalette } from '../hooks/usePalette';
import type { SignInAccountType } from '../services/signInCopy';
import { radius, spacing, touchTarget, typography, type Palette } from '../theme';

const options: { type: SignInAccountType; label: string; icon: LucideIcon }[] = [
  { type: 'student', label: 'Student', icon: TicketCheck },
  { type: 'security_staff', label: 'Security staff', icon: ShieldCheck },
];

type SignInAccountSwitchProps = {
  value: SignInAccountType;
  onChange: (accountType: SignInAccountType) => void;
};

export function SignInAccountSwitch({ value, onChange }: SignInAccountSwitchProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.switch} accessibilityRole="tablist" accessibilityLabel="Account type">
      {options.map(({ type, label, icon: Icon }) => {
        const selected = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => onChange(type)}
            accessibilityRole="tab"
            accessibilityLabel={`${label} account`}
            accessibilityState={{ selected }}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Icon color={selected ? palette.link : palette.muted} size={17} />
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    switch: {
      flexDirection: 'row',
      gap: spacing.xs + 2,
      padding: spacing.xs + 1,
      borderRadius: radius.md + 1,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    option: {
      flex: 1,
      minHeight: touchTarget.button,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    optionSelected: { backgroundColor: palette.surfaceRaised, borderColor: palette.link },
    optionText: { ...typography.bodyStrong, color: palette.muted },
    optionTextSelected: { color: palette.link, fontFamily: typography.button.fontFamily },
  });
}
