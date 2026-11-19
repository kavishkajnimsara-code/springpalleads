import { DIMENSION_LIMITS, MATTRESS_SIZE_OPTIONS } from "@/config/sizes";
import type { ProductType, UtmParams } from "@/types/lead";

/**
 * Valid Sri Lankan mobile network prefixes (after +94):
 * 70 (Mobitel), 71 (Mobitel), 72 (Hutch), 74 (Dialog),
 * 75 (Airtel), 76 (Dialog), 77 (Dialog), 78 (Hutch)
 */
const SRI_LANKAN_MOBILE_REGEX = /^\+947[01245678]\d{7}$/;

const VALID_PRODUCT_TYPES: ReadonlySet<string> = new Set<ProductType>([
  "mattress_only",
  "divan_bed_mattress",
]);

/**
 * Strips control characters, collapses repeated whitespace, and trims a string.
 */
export function sanitizeText(value: unknown, maxLength = 120): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes an optional UTM or source string. Returns null when empty.
 */
export function sanitizeOptionalTracking(
  value: unknown,
  maxLength = 200
): string | null {
  const cleaned = sanitizeText(value, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Validates and sanitizes customer name.
 */
export function validateCustomerName(rawName: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  const cleaned = sanitizeText(rawName, 120);
  if (!cleaned) {
    return { valid: false, value: "", error: "Please enter your name." };
  }
  if (cleaned.length < 2) {
    return {
      valid: false,
      value: cleaned,
      error: "Name must be at least 2 characters.",
    };
  }
  return { valid: true, value: cleaned };
}

/**
 * Validates and normalizes a Sri Lankan mobile number into E.164 format (+947XXXXXXXX).
 *
 * Supported input formats (spaces, hyphens, and parentheses are tolerated):
 * - 07XXXXXXXX
 * - +947XXXXXXXX
 * - 947XXXXXXXX
 * - 00947XXXXXXXX
 * - 7XXXXXXXX (9-digit local mobile without leading zero)
 */
export function normalizeSriLankanPhone(rawPhone: unknown): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (typeof rawPhone !== "string") {
    return {
      valid: false,
      normalized: "",
      error: "Please enter your mobile number.",
    };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: "",
      error: "Please enter your mobile number.",
    };
  }

  // Strip spaces, dashes, dots, and parentheses
  const compact = trimmed.replace(/[\s\-().]/g, "");

  // Reject any unexpected characters (only optional leading + and digits allowed)
  if (!/^\+?\d+$/.test(compact)) {
    return {
      valid: false,
      normalized: "",
      error: "Enter a valid Sri Lankan mobile number (e.g., 077 123 4567).",
    };
  }

  let normalized = "";

  if (compact.startsWith("+94")) {
    normalized = compact;
  } else if (compact.startsWith("0094")) {
    normalized = `+${compact.slice(2)}`;
  } else if (compact.startsWith("94") && compact.length === 11) {
    normalized = `+${compact}`;
  } else if (compact.startsWith("0") && compact.length === 10) {
    normalized = `+94${compact.slice(1)}`;
  } else if (compact.startsWith("7") && compact.length === 9) {
    normalized = `+94${compact}`;
  } else {
    return {
      valid: false,
      normalized: "",
      error:
        "Enter a valid Sri Lankan mobile number (07XXXXXXXX or +947XXXXXXXX).",
    };
  }

  if (!SRI_LANKAN_MOBILE_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized: "",
      error:
        "Please enter a valid Sri Lankan mobile number starting with 070–078.",
    };
  }

  return { valid: true, normalized };
}

/**
 * Validates product category selection.
 */
export function validateProductType(rawType: unknown): {
  valid: boolean;
  value?: ProductType;
  error?: string;
} {
  if (typeof rawType !== "string" || !VALID_PRODUCT_TYPES.has(rawType)) {
    return {
      valid: false,
      error: "Please select Mattress Only or Divan Bed + Mattress.",
    };
  }
  return { valid: true, value: rawType as ProductType };
}

/**
 * Sanitizes UTM and source attribution parameters.
 */
export function sanitizeUtmParams(rawUtm: unknown): Required<UtmParams> {
  const input =
    rawUtm && typeof rawUtm === "object"
      ? (rawUtm as Record<string, unknown>)
      : {};

  const utm_source = sanitizeOptionalTracking(input.utm_source);
  const utm_medium = sanitizeOptionalTracking(input.utm_medium);
  const utm_campaign = sanitizeOptionalTracking(input.utm_campaign);
  const utm_content = sanitizeOptionalTracking(input.utm_content);
  const utm_term = sanitizeOptionalTracking(input.utm_term);
  const explicitSource = sanitizeOptionalTracking(input.source);

  return {
    source: explicitSource ?? utm_source ?? "direct",
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  };
}

/**
 * Validates mattress dimensions (preset or custom) and returns canonical values.
 */
export function validateMattressDimensions(input: {
  isCustom?: unknown;
  sizeId?: unknown;
  mattressLength?: unknown;
  mattressWidth?: unknown;
}): {
  valid: boolean;
  length?: number;
  width?: number;
  sizeLabel?: string;
  fieldErrors?: Record<string, string>;
  error?: string;
} {
  const isCustom = Boolean(input.isCustom);

  if (!isCustom && typeof input.sizeId === "string") {
    const preset = MATTRESS_SIZE_OPTIONS.find((opt) => opt.id === input.sizeId);
    if (preset) {
      return {
        valid: true,
        length: preset.length,
        width: preset.width,
        sizeLabel: preset.label,
      };
    }
  }

  const parsedLength = Number(input.mattressLength);
  const parsedWidth = Number(input.mattressWidth);
  const fieldErrors: Record<string, string> = {};

  if (
    !Number.isFinite(parsedLength) ||
    parsedLength < DIMENSION_LIMITS.minInches ||
    parsedLength > DIMENSION_LIMITS.maxInches
  ) {
    fieldErrors.mattressLength = `Length must be between ${DIMENSION_LIMITS.minInches} and ${DIMENSION_LIMITS.maxInches} inches.`;
  }

  if (
    !Number.isFinite(parsedWidth) ||
    parsedWidth < DIMENSION_LIMITS.minInches ||
    parsedWidth > DIMENSION_LIMITS.maxInches
  ) {
    fieldErrors.mattressWidth = `Width must be between ${DIMENSION_LIMITS.minInches} and ${DIMENSION_LIMITS.maxInches} inches.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors,
      error: "Please enter valid mattress dimensions in inches.",
    };
  }

  const roundedLength = Math.round(parsedLength * 100) / 100;
  const roundedWidth = Math.round(parsedWidth * 100) / 100;

  // Check if dimensions match a known preset when not explicitly custom
  const matchingPreset = !isCustom
    ? MATTRESS_SIZE_OPTIONS.find(
        (opt) => opt.length === roundedLength && opt.width === roundedWidth
      )
    : undefined;

  const sizeLabel = matchingPreset
    ? matchingPreset.label
    : `Custom: ${roundedLength} × ${roundedWidth} inches`;

  return {
    valid: true,
    length: roundedLength,
    width: roundedWidth,
    sizeLabel,
  };
}

/**
 * Validates UUID v4 / standard UUID format for route params.
 */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
