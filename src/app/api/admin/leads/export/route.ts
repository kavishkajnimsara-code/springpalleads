import { NextResponse } from "next/server";
import { buildLeadsCsv } from "@/lib/admin-csv";
import { fetchAdminLeads, parseAdminLeadFilters } from "@/lib/admin-leads";
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
    const leads = await fetchAdminLeads({ ...filters, limit: 5000 });
    const csv = buildLeadsCsv(leads);
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="spring-pal-leads-${today}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/leads/export] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      { error: "Failed to export CSV.", code: "EXPORT_ERROR" },
      { status: 500 }
    );
  }
}
