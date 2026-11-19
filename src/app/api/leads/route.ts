import { NextResponse } from "next/server";
import { createLeadUpdateToken } from "@/lib/lead-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  normalizeSriLankanPhone,
  sanitizeUtmParams,
  validateCustomerName,
  validateProductType,
} from "@/lib/validation";
import type {
  ApiErrorResponse,
  CreateLeadRequest,
  CreateLeadResponse,
} from "@/types/lead";

export const runtime = "nodejs";

const CREATE_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 10 * 60 * 1000, // 10 minutes
};

const DEDUPE_WINDOW_MS = 60 * 1000; // 60 seconds

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`create-lead:${clientIp}`, CREATE_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error:
            "Too many requests. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    let body: CreateLeadRequest;
    try {
      body = (await request.json()) as CreateLeadRequest;
    } catch {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid request payload.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    // Basic spam honeypot check
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Unable to process request.", code: "SPAM_DETECTED" },
        { status: 400 }
      );
    }

    const fieldErrors: Record<string, string> = {};

    const nameResult = validateCustomerName(body.customerName);
    if (!nameResult.valid && nameResult.error) {
      fieldErrors.customerName = nameResult.error;
    }

    const phoneResult = normalizeSriLankanPhone(body.phoneNumber);
    if (!phoneResult.valid && phoneResult.error) {
      fieldErrors.phoneNumber = phoneResult.error;
    }

    const productResult = validateProductType(body.productType);
    if (!productResult.valid && productResult.error) {
      fieldErrors.productType = productResult.error;
    }

    if (Object.keys(fieldErrors).length > 0 || !productResult.value) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Please check the highlighted fields and try again.",
          code: "VALIDATION_ERROR",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const utm = sanitizeUtmParams(body.utm);
    const supabase = getSupabaseAdmin();

    // Prevent accidental duplicate rows from repeated clicks or flaky retries
    // within a short 60-second window for the same phone number & product type.
    const dedupeCutoffIso = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: recentLead, error: lookupError } = await supabase
      .from("leads")
      .select("id, product_type, lead_status")
      .eq("phone_number", phoneResult.normalized)
      .eq("product_type", productResult.value)
      .eq("lead_status", "pending_size")
      .gte("created_at", dedupeCutoffIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("[POST /api/leads] Dedupe lookup failed:", lookupError.message);
    }

    if (recentLead?.id) {
      const { token, expiresAt } = createLeadUpdateToken(recentLead.id);
      return NextResponse.json<CreateLeadResponse>(
        {
          leadId: recentLead.id,
          updateToken: token,
          expiresAt,
          normalizedPhone: phoneResult.normalized,
          productType: productResult.value,
          leadStatus: "pending_size",
          deduplicated: true,
        },
        { status: 200 }
      );
    }

    const { data: insertedLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        customer_name: nameResult.value,
        phone_number: phoneResult.normalized,
        product_type: productResult.value,
        lead_status: "pending_size",
        source: utm.source,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
      })
      .select("id, product_type, lead_status")
      .single();

    if (insertError || !insertedLead) {
      console.error(
        "[POST /api/leads] Supabase insert error:",
        insertError?.message ?? "No row returned"
      );
      return NextResponse.json<ApiErrorResponse>(
        {
          error:
            "We could not save your details right now. Please try again in a moment.",
          code: "DATABASE_ERROR",
        },
        { status: 503 }
      );
    }

    const { token, expiresAt } = createLeadUpdateToken(insertedLead.id);

    return NextResponse.json<CreateLeadResponse>(
      {
        leadId: insertedLead.id,
        updateToken: token,
        expiresAt,
        normalizedPhone: phoneResult.normalized,
        productType: productResult.value,
        leadStatus: "pending_size",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/leads] Unexpected error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        error:
          "Something went wrong while connecting to our server. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
