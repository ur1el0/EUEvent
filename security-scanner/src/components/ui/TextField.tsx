import { useMemo, useState, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { CircleAlert, Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { usePalette } from '../../hooks/usePalette';
import { fontSizes, fonts, radius, spacing, touchTarget, typography, type Palette } from '../../theme';

type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry' | 'placeholderTextColor'> & {
  label: string;
  helperText?: string;
  errorText?: string;
  /** Hides the value and shows a show/hide toggle. */
  secure?: boolean;
  icon?: LucideIcon;
  ref?: Ref<TextInputInstance>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  helperText,
  errorText,
  secure = false,
  icon: Icon,
  ref,
  containerStyle,
  accessibilityLabel,
  ...inputProps
}: TextFieldProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [isValueVisible, setIsValueVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hint = errorText ?? helperText;

  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, isFocused && styles.inputRowFocused, errorText ? styles.inputRowError : null]}>
        {Icon ? <Icon color={palette.muted} size={18} /> : null}
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={secure && !isValueVisible}
          placeholderTextColor={palette.muted}
          onFocus={(event) => { setIsFocused(true); inputProps.onFocus?.(event); }}
          onBlur={(event) => { setIsFocused(false); inputProps.onBlur?.(event); }}
          style={styles.input}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={hint}
        />
        {secure ? (
          <Pressable
            onPress={() => setIsValueVisible((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={isValueVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            style={styles.toggle}
          >
            {isValueVisible ? <EyeOff color={palette.muted} size={20} /> : <Eye color={palette.muted} size={20} />}
            <Text style={styles.toggleText}>{isValueVisible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      {errorText ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <CircleAlert color={palette.danger} size={15} />
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    label: { ...typography.label, color: palette.text, marginBottom: spacing.sm },
    inputRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      paddingLeft: spacing.md - 1,
      borderWidth: 1,
      borderColor: palette.controlBorder,
      borderRadius: radius.md - 1,
      backgroundColor: palette.background,
    },
    inputRowFocused: { borderColor: palette.focus, borderWidth: 2 },
    inputRowError: { borderColor: palette.danger, borderWidth: 2 },
    input: {
      flex: 1,
      minHeight: 50,
      paddingVertical: spacing.sm,
      paddingRight: spacing.md - 1,
      color: palette.text,
      fontFamily: fonts.body,
      fontSize: fontSizes.status,
    },
    toggle: {
      minWidth: touchTarget.icon + 16,
      minHeight: touchTarget.icon,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.sm,
    },
    toggleText: { ...typography.caption, fontFamily: fonts.bodyBold, color: palette.muted },
    messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs + 2, marginTop: spacing.sm },
    errorText: { ...typography.bodyStrong, flex: 1, color: palette.danger },
    helperText: { ...typography.caption, color: palette.muted, marginTop: spacing.sm },
  });
}
