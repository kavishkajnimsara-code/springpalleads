import { NextResponse } from "next/server";
import { isValidCallStatus } from "@/lib/admin-leads";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedAdmin } from "@/lib/supabase-auth";
import { isValidUuid, sanitizeText } from "@/lib/validation";
import type { ApiErrorResponse } from "@/types/lead";

export const runtime = "nodejs";

interface UpdateAdminLeadBody {
  callStatus?: unknown;
  adminNotes?: unknown;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Unauthorized. Please sign in.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const { id: leadId } = await context.params;
    if (!leadId || !isValidUuid(leadId)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid lead ID.", code: "INVALID_LEAD_ID" },
        { status: 400 }
      );
    }

    let body: UpdateAdminLeadBody;
    try {
      body = (await request.json()) as UpdateAdminLeadBody;
    } catch {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid request payload.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.callStatus !== undefined) {
      if (!isValidCallStatus(body.callStatus)) {
        return NextResponse.json<ApiErrorResponse>(
          { error: "Invalid call status value.", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }
      updates.call_status = body.callStatus;
    }

    if (body.adminNotes !== undefined) {
      if (body.adminNotes === null) {
        updates.admin_notes = null;
      } else if (typeof body.adminNotes === "string") {
        const cleaned = sanitizeText(body.adminNotes, 2000);
        updates.admin_notes = cleaned.length > 0 ? cleaned : null;
      } else {
        return NextResponse.json<ApiErrorResponse>(
          { error: "Notes must be text.", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", leadId)
      .select("id, call_status, admin_notes, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[PATCH /api/admin/leads/:id] Supabase error:", error.message);
      const needsMigration =
        error.message.includes("call_status") ||
        error.message.includes("admin_notes");

      return NextResponse.json<ApiErrorResponse>(
        {
          error: needsMigration
            ? "Follow-up columns are missing in Supabase. Please run supabase/migrations/202611260001_add_lead_followup_fields.sql in Supabase SQL Editor."
            : "Could not update lead right now. Please try again.",
          code: needsMigration ? "MIGRATION_REQUIRED" : "DATABASE_ERROR",
        },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Lead not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: updated.id,
        call_status: updated.call_status,
        admin_notes: updated.admin_notes,
        updated_at: updated.updated_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/admin/leads/:id] Unexpected error:", error);
    return NextResponse.json<ApiErrorResponse>(
      { error: "Unexpected error updating lead.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
