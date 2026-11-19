/**
 * Configurable mattress dimension options for the Size Selection screen.
 *
 * NOTE: These are initial configurable UI options for lead capture and should
 * NOT be treated as a verified Spring Pal product catalog. Update this list
 * whenever Spring Pal's preferred dimension presets change.
 */

export interface MattressSizeOption {
  id: string;
  length: number;
  width: number;
  label: string;
}

export const MATTRESS_SIZE_OPTIONS: readonly MattressSizeOption[] = [
  { id: "72x36", length: 72, width: 36, label: "72 × 36 inches" },
  { id: "72x48", length: 72, width: 48, label: "72 × 48 inches" },
  { id: "72x60", length: 72, width: 60, label: "72 × 60 inches" },
  { id: "72x72", length: 72, width: 72, label: "72 × 72 inches" },
  { id: "75x36", length: 75, width: 36, label: "75 × 36 inches" },
  { id: "75x48", length: 75, width: 48, label: "75 × 48 inches" },
  { id: "75x60", length: 75, width: 60, label: "75 × 60 inches" },
  { id: "75x72", length: 75, width: 72, label: "75 × 72 inches" },
] as const;

export const CUSTOM_SIZE_ID = "custom" as const;

export const DIMENSION_LIMITS = {
  minInches: 24,
  maxInches: 120,
} as const;
