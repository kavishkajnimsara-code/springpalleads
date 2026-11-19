import crypto from "crypto";

interface LeadTokenPayload {
  leadId: string;
  exp: number; // Unix timestamp in milliseconds
}

export type TokenVerifyResult =
  | { valid: true; payload: LeadTokenPayload }
  | { valid: false; reason: "MISSING_SECRET" | "MALFORMED" | "INVALID_SIGNATURE" | "EXPIRED" | "LEAD_MISMATCH" };

function getSigningSecret(): string | null {
  const secret = process.env.LEAD_TOKEN_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }

  // Fallback for local development only if LEAD_TOKEN_SECRET is unset
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-spring-pal-lead-token-secret-change-me";
  }

  return null;
}

function getTokenTtlMs(): number {
  const rawMinutes = Number(process.env.LEAD_TOKEN_TTL_MINUTES);
  const minutes =
    Number.isFinite(rawMinutes) && rawMinutes >= 5 && rawMinutes <= 180
      ? rawMinutes
      : 30;
  return minutes * 60 * 1000;
}

function sign(encodedPayload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

/**
 * Creates a short-lived, lead-specific HMAC-SHA256 signed token.
 * Used exclusively to authorize updating the dimensions of a single pending lead.
 */
export function createLeadUpdateToken(
  leadId: string,
  ttlMs?: number
): { token: string; expiresAt: string } {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error(
      "LEAD_TOKEN_SECRET environment variable must be configured (minimum 16 characters)."
    );
  }

  const exp = Date.now() + (ttlMs ?? getTokenTtlMs());
  const payload: LeadTokenPayload = { leadId, exp };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = sign(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

/**
 * Verifies a lead update token against the expected lead ID and expiration time.
 */
export function verifyLeadUpdateToken(
  token: string,
  expectedLeadId: string
): TokenVerifyResult {
  const secret = getSigningSecret();
  if (!secret) {
    return { valid: false, reason: "MISSING_SECRET" };
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "MALFORMED" };
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = sign(encodedPayload, secret);

  const providedBuf = Buffer.from(providedSignature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as LeadTokenPayload).leadId !== "string" ||
    typeof (parsed as LeadTokenPayload).exp !== "number"
  ) {
    return { valid: false, reason: "MALFORMED" };
  }

  const payload = parsed as LeadTokenPayload;

  if (payload.leadId !== expectedLeadId) {
    return { valid: false, reason: "LEAD_MISMATCH" };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, reason: "EXPIRED" };
  }

  return { valid: true, payload };
}
