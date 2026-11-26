import crypto from "crypto";
import type { ProductType } from "@/types/lead";

// Unambiguous uppercase alphanumeric characters (excludes 0, O, 1, I)
const COUPON_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

/**
 * Generates a unique, human-readable custom discount coupon code for each lead.
 * - Mattress Only:        SP50-XXXXXX (50% OFF)
 * - Divan Bed + Mattress: SP40-XXXXXX (40% OFF)
 */
export function generateCouponCode(productType: ProductType): string {
  const prefix = productType === "divan_bed_mattress" ? "SP40" : "SP50";
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let suffix = "";

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    suffix += COUPON_ALPHABET[bytes[i] % COUPON_ALPHABET.length];
  }

  return `${prefix}-${suffix}`;
}
