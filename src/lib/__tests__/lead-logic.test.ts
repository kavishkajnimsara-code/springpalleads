import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createLeadUpdateToken,
  verifyLeadUpdateToken,
} from "../lead-token";
import { checkRateLimit } from "../rate-limit";
import {
  normalizeSriLankanPhone,
  sanitizeUtmParams,
  validateCustomerName,
  validateMattressDimensions,
  validateProductType,
} from "../validation";

describe("Sri Lankan phone validation & normalization", () => {
  it("normalizes local 07XXXXXXXX numbers to +947XXXXXXXX", () => {
    const res = normalizeSriLankanPhone("077 123 4567");
    assert.equal(res.valid, true);
    assert.equal(res.normalized, "+94771234567");
  });

  it("normalizes +947XXXXXXXX numbers consistently", () => {
    const res = normalizeSriLankanPhone("+94 71-987-6543");
    assert.equal(res.valid, true);
    assert.equal(res.normalized, "+94719876543");
  });

  it("supports 947XXXXXXXX and 00947XXXXXXXX formats", () => {
    assert.equal(normalizeSriLankanPhone("94761112222").normalized, "+94761112222");
    assert.equal(normalizeSriLankanPhone("0094701112222").normalized, "+94701112222");
  });

  it("rejects invalid prefixes, landlines, and malformed inputs", () => {
    assert.equal(normalizeSriLankanPhone("0112345678").valid, false);
    assert.equal(normalizeSriLankanPhone("0731234567").valid, false);
    assert.equal(normalizeSriLankanPhone("07712345").valid, false);
    assert.equal(normalizeSriLankanPhone("abc").valid, false);
    assert.equal(normalizeSriLankanPhone("").valid, false);
  });
});

describe("Customer name, product, UTM, and dimension validation", () => {
  it("validates and sanitizes customer name", () => {
    const res = validateCustomerName("  Kasun   Perera  ");
    assert.equal(res.valid, true);
    assert.equal(res.value, "Kasun Perera");
    assert.equal(validateCustomerName("A").valid, false);
  });

  it("validates product type strictly", () => {
    assert.equal(validateProductType("mattress_only").valid, true);
    assert.equal(validateProductType("divan_bed_mattress").valid, true);
    assert.equal(validateProductType("sofa").valid, false);
  });

  it("sanitizes UTM tracking parameters", () => {
    const utm = sanitizeUtmParams({
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "november_sale",
      utm_content: "  video_ad_1  ",
    });
    assert.equal(utm.source, "facebook");
    assert.equal(utm.utm_source, "facebook");
    assert.equal(utm.utm_medium, "paid");
    assert.equal(utm.utm_campaign, "november_sale");
    assert.equal(utm.utm_content, "video_ad_1");
    assert.equal(utm.utm_term, null);
  });

  it("validates preset and custom mattress dimensions", () => {
    const preset = validateMattressDimensions({
      isCustom: false,
      sizeId: "75x60",
      mattressLength: 75,
      mattressWidth: 60,
    });
    assert.equal(preset.valid, true);
    assert.equal(preset.sizeLabel, "75 × 60 inches");

    const custom = validateMattressDimensions({
      isCustom: true,
      mattressLength: 78,
      mattressWidth: 64,
    });
    assert.equal(custom.valid, true);
    assert.equal(custom.sizeLabel, "Custom: 78 × 64 inches");

    const invalid = validateMattressDimensions({
      isCustom: true,
      mattressLength: 10,
      mattressWidth: 200,
    });
    assert.equal(invalid.valid, false);
  });
});

describe("Short-lived lead update token security", () => {
  const leadId = "11111111-2222-4333-8444-555555555555";

  it("signs and verifies a valid token for the matching lead", () => {
    const { token } = createLeadUpdateToken(leadId, 60_000);
    const verification = verifyLeadUpdateToken(token, leadId);
    assert.equal(verification.valid, true);
  });

  it("rejects token used against a different lead ID", () => {
    const { token } = createLeadUpdateToken(leadId, 60_000);
    const verification = verifyLeadUpdateToken(
      token,
      "99999999-2222-4333-8444-555555555555"
    );
    assert.equal(verification.valid, false);
    if (!verification.valid) {
      assert.equal(verification.reason, "LEAD_MISMATCH");
    }
  });

  it("rejects tampered tokens", () => {
    const { token } = createLeadUpdateToken(leadId, 60_000);
    const tampered = `${token}x`;
    const verification = verifyLeadUpdateToken(tampered, leadId);
    assert.equal(verification.valid, false);
    if (!verification.valid) {
      assert.equal(verification.reason, "INVALID_SIGNATURE");
    }
  });

  it("rejects expired tokens with EXPIRED reason", () => {
    const { token } = createLeadUpdateToken(leadId, -1000);
    const verification = verifyLeadUpdateToken(token, leadId);
    assert.equal(verification.valid, false);
    if (!verification.valid) {
      assert.equal(verification.reason, "EXPIRED");
    }
  });
});

describe("Rate limiter", () => {
  it("blocks requests exceeding the configured window limit", () => {
    const key = `test-rate-limit-${Date.now()}`;
    const opts = { maxRequests: 2, windowMs: 60_000 };

    assert.equal(checkRateLimit(key, opts).allowed, true);
    assert.equal(checkRateLimit(key, opts).allowed, true);

    const third = checkRateLimit(key, opts);
    assert.equal(third.allowed, false);
    assert.ok(third.retryAfterSeconds >= 1);
  });
});
