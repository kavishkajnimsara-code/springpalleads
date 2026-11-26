import { NextResponse } from "next/server";
import {
  computeLeadSummary,
  extractDistinctCampaigns,
  fetchAdminLeads,
  parseAdminLeadFilters,
} from "@/lib/admin-leads";
import { getAuthenticatedAdmin } from "@/lib/supabase-auth";
import type { ApiErrorResponse } from "@/types/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Unauthorized. Please sign in.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const filters = parseAdminLeadFilters(url.searchParams);

    const [leads, allRecentLeads] = await Promise.all([
      fetchAdminLeads(filters),
      fetchAdminLeads({ limit: 1000 }),
    ]);

    return NextResponse.json(
      {
        leads,
        summary: computeLeadSummary(allRecentLeads),
        campaigns: extractDistinctCampaigns(allRecentLeads),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/leads] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        error: "Could not load leads from Supabase. Please try again.",
        code: "DATABASE_ERROR",
      },
      { status: 500 }
    );
  }
}
