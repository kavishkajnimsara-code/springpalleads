import { NextResponse } from "next/server";
import { verifyLeadUpdateToken } from "@/lib/lead-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidUuid, validateMattressDimensions } from "@/lib/validation";
import type {
  ApiErrorResponse,
  UpdateLeadSizeRequest,
  UpdateLeadSizeResponse,
} from "@/types/lead";

export const runtime = "nodejs";

const UPDATE_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 10 * 60 * 1000, // 10 minutes
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(
      `update-lead-size:${clientIp}`,
      UPDATE_RATE_LIMIT
    );

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Too many attempts. Please wait a moment and try again.",
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

    const { id: leadId } = await context.params;
    if (!leadId || !isValidUuid(leadId)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid lead identifier.", code: "INVALID_LEAD_ID" },
        { status: 400 }
      );
    }

    // Verify short-lived, lead-specific authorization token
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error:
            "Your session authorization is missing. Please restart from Step 1.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const verification = verifyLeadUpdateToken(token, leadId);
    if (!verification.valid) {
      if (verification.reason === "EXPIRED") {
        return NextResponse.json<ApiErrorResponse>(
          {
            error:
              "Your size selection session has expired. Your contact details are already saved — please re-enter your details if you'd like to choose a size now.",
            code: "TOKEN_EXPIRED",
          },
          { status: 401 }
        );
      }

      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Invalid session authorization. Please start again.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    let body: UpdateLeadSizeRequest;
    try {
      body = (await request.json()) as UpdateLeadSizeRequest;
    } catch {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid request payload.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const dimensions = validateMattressDimensions({
      isCustom: body.isCustom,
      sizeId: body.sizeId,
      mattressLength: body.mattressLength,
      mattressWidth: body.mattressWidth,
    });

    if (
      !dimensions.valid ||
      dimensions.length === undefined ||
      dimensions.width === undefined ||
      !dimensions.sizeLabel
    ) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error:
            dimensions.error ??
            "Please select a mattress size or enter valid custom dimensions.",
          code: "VALIDATION_ERROR",
          fieldErrors: dimensions.fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const completedAt = new Date().toISOString();

    // Update the existing lead record ONLY (never insert a new lead)
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        mattress_length: dimensions.length,
        mattress_width: dimensions.width,
        size_label: dimensions.sizeLabel,
        lead_status: "completed",
        completed_at: completedAt,
      })
      .eq("id", leadId)
      .select("id, lead_status, mattress_length, mattress_width, size_label, completed_at")
      .maybeSingle();

    if (updateError) {
      console.error(
        "[PATCH /api/leads/:id/size] Supabase update error:",
        updateError.message
      );
      return NextResponse.json<ApiErrorResponse>(
        {
          error:
            "We could not save your mattress size right now. Please try again.",
          code: "DATABASE_ERROR",
        },
        { status: 503 }
      );
    }

    if (!updatedLead) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "We could not find your saved request. Please start again.",
          code: "LEAD_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<UpdateLeadSizeResponse>(
      {
        leadId: updatedLead.id,
        leadStatus: "completed",
        mattressLength: Number(updatedLead.mattress_length),
        mattressWidth: Number(updatedLead.mattress_width),
        sizeLabel: updatedLead.size_label,
        completedAt: updatedLead.completed_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/leads/:id/size] Unexpected error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        error: "Something went wrong while saving your size. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
