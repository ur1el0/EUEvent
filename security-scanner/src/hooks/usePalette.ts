import { palettes, type Palette } from '../theme';

/**
 * The one place that picks the active colour palette. Everything that reads
 * colours through this hook switches together when daylight mode is adopted.
 */
export function usePalette(): Palette {
  return palettes.dark;
}
