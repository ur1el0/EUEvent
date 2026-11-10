// Existing screens read `colors` directly. New components and the sign-in screen
// read a full palette through `usePalette()` so a later change can switch palettes.
export const colors = {
  background: '#1C0808',
  surface: '#2A1010',
  surfaceRaised: '#351717',
  border: '#512A27',
  text: '#FFF8EF',
  muted: '#BBAAA3',
  gold: '#FFCB2F',
  goldDeep: '#F2AE1D',
  green: '#53C9A3',
  red: '#FF7770',
} as const;

export type Palette = {
  background: string;
  surface: string;
  surfaceRaised: string;
  /** Decorative card and divider borders. */
  border: string;
  /** Input and secondary-button borders; at least 3:1 against `surface`. */
  controlBorder: string;
  text: string;
  muted: string;
  /** Brand highlight such as the wordmark; readable as text. */
  brand: string;
  /** Primary action fill and the text drawn on it. */
  accent: string;
  onAccent: string;
  /** Text links and selected tabs. */
  link: string;
  focus: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  successSurface: string;
  warningSurface: string;
  dangerSurface: string;
  infoSurface: string;
  /** Destructive button fill and the text drawn on it. */
  dangerFill: string;
  onDanger: string;
};

// Contrast ratios below are against the matching surface (WCAG AA needs 4.5:1 for text).
export const darkPalette: Palette = {
  background: colors.background,
  surface: colors.surface,
  surfaceRaised: colors.surfaceRaised,
  border: colors.border,
  controlBorder: '#8A6560', // 3.5:1 on surface
  text: colors.text,
  muted: colors.muted, // 8.0:1 on surface
  brand: colors.gold,
  accent: colors.gold,
  onAccent: colors.background, // 12.7:1
  link: colors.gold, // 11.7:1 on surface
  focus: colors.gold,
  success: colors.green, // 6.7:1 on successSurface
  warning: '#F2B84B', // 7.7:1 on warningSurface
  danger: colors.red, // 6.2:1 on dangerSurface
  info: colors.text,
  successSurface: '#123326',
  warningSurface: '#3A2A0E',
  dangerSurface: '#3D1414',
  infoSurface: colors.surfaceRaised,
  dangerFill: colors.red,
  onDanger: colors.background,
};

/** High-contrast light palette for bright outdoor gates. Not yet used by existing screens. */
export const daylightPalette: Palette = {
  background: '#F4F1EF',
  surface: '#FFFFFF',
  surfaceRaised: '#F2EAE7',
  border: '#EADFDD',
  controlBorder: '#8E7A75', // 4.1:1 on surface
  text: '#2A1010', // 15.8:1 on background
  muted: '#6B5752', // 6.0:1 on background
  brand: '#8A5A00', // 5.3:1 on background
  accent: '#481C1C',
  onAccent: '#FFFFFF', // 14.4:1
  link: '#481C1C', // 12.8:1 on background
  focus: '#E3A91C',
  success: '#177545', // 5.1:1 on successSurface
  warning: '#8B5B0B', // 5.3:1 on warningSurface
  danger: '#9F2F23', // 6.5:1 on dangerSurface
  info: '#2A1010',
  successSurface: '#E6F5EB',
  warningSurface: '#FFF2D5',
  dangerSurface: '#FFF0ED',
  infoSurface: '#F2EAE7',
  dangerFill: '#9F2F23',
  onDanger: '#FFFFFF', // 7.2:1
};

export const palettes = { dark: darkPalette, daylight: daylightPalette } as const;
export type PaletteName = keyof typeof palettes;

export const fonts = {
  body: 'Quicksand_500Medium',
  bodyRegular: 'Quicksand_400Regular',
  bodyStrong: 'Quicksand_600SemiBold',
  bodyBold: 'Quicksand_700Bold',
  heading: 'Barlow_700Bold',
  headingStrong: 'Barlow_800ExtraBold',
} as const;

/** Named font sizes. Nothing is smaller than 12; status and decision text is 14 or larger. */
export const fontSizes = {
  caption: 12,
  label: 13,
  body: 14,
  status: 15,
  button: 16,
  sectionTitle: 18,
  title: 28,
  display: 36,
} as const;

export const typography = {
  display: { fontFamily: fonts.headingStrong, fontSize: fontSizes.display, lineHeight: 40 },
  title: { fontFamily: fonts.headingStrong, fontSize: fontSizes.title, lineHeight: 32 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: fontSizes.sectionTitle, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: fontSizes.body, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodyStrong, fontSize: fontSizes.body, lineHeight: 21 },
  label: { fontFamily: fonts.bodyStrong, fontSize: fontSizes.label, lineHeight: 18 },
  caption: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.caption, lineHeight: 17 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: fontSizes.caption, lineHeight: 16, letterSpacing: 1.6 },
  status: { fontFamily: fonts.bodyBold, fontSize: fontSizes.status, lineHeight: 21 },
  button: { fontFamily: fonts.bodyBold, fontSize: fontSizes.button, lineHeight: 20 },
} as const;

/** Spacing from DESIGN.md (sm 8, md 15, lg 22), plus xs and xl for tight and roomy gaps. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 15,
  lg: 22,
  xl: 32,
} as const;

/** Corner radii from DESIGN.md. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
} as const;

/** Minimum touch targets. */
export const touchTarget = {
  button: 48,
  icon: 44,
} as const;
