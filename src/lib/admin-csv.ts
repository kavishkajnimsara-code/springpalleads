import {
  CALL_STATUS_LABELS,
  PRODUCT_LABELS,
  type AdminLeadRecord,
} from "@/types/lead";

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Escapes a single CSV cell safely and neutralizes spreadsheet formula injection.
 */
export function escapeCsvCell(value: unknown, neutralizeFormula = true): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);
  if (neutralizeFormula && FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Serializes leads into an Excel-friendly UTF-8 CSV string (with BOM).
 */
export function buildLeadsCsv(leads: AdminLeadRecord[]): string {
  const headers = [
    "Lead ID",
    "Created At",
    "Coupon Code",
    "Customer Name",
    "Phone Number",
    "Product",
    "Size",
    "Length (in)",
    "Width (in)",
    "Funnel Status",
    "Call Status",
    "Admin Notes",
    "Source",
    "UTM Source",
    "UTM Medium",
    "UTM Campaign",
    "UTM Content",
    "UTM Term",
    "Completed At",
  ];

  const rows = leads.map((lead) => [
    escapeCsvCell(lead.id, false),
    escapeCsvCell(lead.created_at, false),
    escapeCsvCell(lead.coupon_code ?? "", false),
    escapeCsvCell(lead.customer_name),
    // Prefix phone with single quote so Excel preserves leading +94 instead of formatting as number
    escapeCsvCell(lead.phone_number, true),
    escapeCsvCell(PRODUCT_LABELS[lead.product_type] ?? lead.product_type, false),
    escapeCsvCell(lead.size_label ?? "Not selected yet"),
    escapeCsvCell(lead.mattress_length ?? "", false),
    escapeCsvCell(lead.mattress_width ?? "", false),
    escapeCsvCell(
      lead.lead_status === "completed" ? "Completed" : "Pending Size",
      false
    ),
    escapeCsvCell(
      CALL_STATUS_LABELS[lead.call_status] ?? lead.call_status ?? "New",
      false
    ),
    escapeCsvCell(lead.admin_notes ?? ""),
    escapeCsvCell(lead.source ?? ""),
    escapeCsvCell(lead.utm_source ?? ""),
    escapeCsvCell(lead.utm_medium ?? ""),
    escapeCsvCell(lead.utm_campaign ?? ""),
    escapeCsvCell(lead.utm_content ?? ""),
    escapeCsvCell(lead.utm_term ?? ""),
    escapeCsvCell(lead.completed_at ?? "", false),
  ]);

  const lines = [headers.join(","), ...rows.map((row) => row.join(","))];
  return `\uFEFF${lines.join("\r\n")}`;
}
