import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  AdminLeadRecord,
  AdminLeadSummary,
  CallStatus,
  LeadStatus,
  ProductType,
} from "@/types/lead";

export interface AdminLeadFilters {
  search?: string;
  leadStatus?: LeadStatus | "all";
  callStatus?: CallStatus | "all";
  productType?: ProductType | "all";
  utmCampaign?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

const VALID_CALL_STATUSES: ReadonlySet<string> = new Set<CallStatus>([
  "new",
  "called",
  "no_answer",
  "converted",
  "closed",
]);

export function isValidCallStatus(value: unknown): value is CallStatus {
  return typeof value === "string" && VALID_CALL_STATUSES.has(value);
}

/**
 * Sanitizes free-text search so PostgREST .or() filter syntax cannot be broken.
 */
function sanitizeSearchPattern(raw: string): string {
  return raw.replace(/[%_,()]/g, " ").trim().slice(0, 80);
}

function normalizeLeadRow(row: Record<string, unknown>): AdminLeadRecord {
  const rawCallStatus = row.call_status;
  const callStatus: CallStatus = isValidCallStatus(rawCallStatus)
    ? rawCallStatus
    : "new";

  return {
    id: String(row.id),
    customer_name: String(row.customer_name ?? ""),
    phone_number: String(row.phone_number ?? ""),
    product_type:
      row.product_type === "divan_bed_mattress"
        ? "divan_bed_mattress"
        : "mattress_only",
    coupon_code: typeof row.coupon_code === "string" ? row.coupon_code : null,
    mattress_length:
      row.mattress_length === null || row.mattress_length === undefined
        ? null
        : Number(row.mattress_length),
    mattress_width:
      row.mattress_width === null || row.mattress_width === undefined
        ? null
        : Number(row.mattress_width),
    size_label: typeof row.size_label === "string" ? row.size_label : null,
    lead_status: row.lead_status === "completed" ? "completed" : "pending_size",
    call_status: callStatus,
    admin_notes: typeof row.admin_notes === "string" ? row.admin_notes : null,
    source: typeof row.source === "string" ? row.source : null,
    utm_source: typeof row.utm_source === "string" ? row.utm_source : null,
    utm_medium: typeof row.utm_medium === "string" ? row.utm_medium : null,
    utm_campaign: typeof row.utm_campaign === "string" ? row.utm_campaign : null,
    utm_content: typeof row.utm_content === "string" ? row.utm_content : null,
    utm_term: typeof row.utm_term === "string" ? row.utm_term : null,
    created_at: String(row.created_at),
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export function parseAdminLeadFilters(searchParams: URLSearchParams): AdminLeadFilters {
  const search = searchParams.get("search")?.trim() || undefined;
  const rawLeadStatus = searchParams.get("leadStatus");
  const rawCallStatus = searchParams.get("callStatus");
  const rawProductType = searchParams.get("productType");
  const utmCampaign = searchParams.get("utmCampaign")?.trim() || undefined;
  const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;
  const dateTo = searchParams.get("dateTo")?.trim() || undefined;

  const leadStatus: LeadStatus | "all" =
    rawLeadStatus === "completed" || rawLeadStatus === "pending_size"
      ? rawLeadStatus
      : "all";

  const callStatus: CallStatus | "all" = isValidCallStatus(rawCallStatus)
    ? rawCallStatus
    : "all";

  const productType: ProductType | "all" =
    rawProductType === "mattress_only" || rawProductType === "divan_bed_mattress"
      ? rawProductType
      : "all";

  return {
    search,
    leadStatus,
    callStatus,
    productType,
    utmCampaign: utmCampaign === "all" ? undefined : utmCampaign,
    dateFrom,
    dateTo,
  };
}

export async function fetchAdminLeads(
  filters: AdminLeadFilters
): Promise<AdminLeadRecord[]> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(filters.limit ?? 500, 1), 5000);

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.leadStatus && filters.leadStatus !== "all") {
    query = query.eq("lead_status", filters.leadStatus);
  }

  if (filters.callStatus && filters.callStatus !== "all") {
    query = query.eq("call_status", filters.callStatus);
  }

  if (filters.productType && filters.productType !== "all") {
    query = query.eq("product_type", filters.productType);
  }

  if (filters.utmCampaign) {
    query = query.eq("utm_campaign", filters.utmCampaign);
  }

  if (filters.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  if (filters.search) {
    const cleaned = sanitizeSearchPattern(filters.search);
    if (cleaned) {
      query = query.or(
        `customer_name.ilike.%${cleaned}%,phone_number.ilike.%${cleaned}%,coupon_code.ilike.%${cleaned}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    normalizeLeadRow(row as Record<string, unknown>)
  );
}

export function computeLeadSummary(leads: AdminLeadRecord[]): AdminLeadSummary {
  // Sri Lanka (UTC+05:30) start of today
  const now = new Date();
  const slOffsetMs = 5.5 * 60 * 60 * 1000;
  const slNow = new Date(now.getTime() + slOffsetMs);
  const slTodayStr = slNow.toISOString().slice(0, 10);

  let completed = 0;
  let pendingSize = 0;
  let today = 0;
  let newCalls = 0;

  for (const lead of leads) {
    if (lead.lead_status === "completed") {
      completed += 1;
    } else {
      pendingSize += 1;
    }

    if (lead.call_status === "new") {
      newCalls += 1;
    }

    const createdMs = Date.parse(lead.created_at);
    if (Number.isFinite(createdMs)) {
      const leadSlDate = new Date(createdMs + slOffsetMs)
        .toISOString()
        .slice(0, 10);
      if (leadSlDate === slTodayStr) {
        today += 1;
      }
    }
  }

  return {
    total: leads.length,
    completed,
    pendingSize,
    today,
    newCalls,
  };
}

export function extractDistinctCampaigns(leads: AdminLeadRecord[]): string[] {
  const set = new Set<string>();
  for (const lead of leads) {
    if (lead.utm_campaign) {
      set.add(lead.utm_campaign);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
