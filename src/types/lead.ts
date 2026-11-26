export type ProductType = "mattress_only" | "divan_bed_mattress";

export type LeadStatus = "pending_size" | "completed";

export type CallStatus =
  | "new"
  | "called"
  | "no_answer"
  | "converted"
  | "closed";

export interface AdminLeadRecord {
  id: string;
  customer_name: string;
  phone_number: string;
  product_type: ProductType;
  mattress_length: number | null;
  mattress_width: number | null;
  size_label: string | null;
  lead_status: LeadStatus;
  call_status: CallStatus;
  admin_notes: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string | null;
}

export interface AdminLeadSummary {
  total: number;
  completed: number;
  pendingSize: number;
  today: number;
  newCalls: number;
}

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  new: "New",
  called: "Called",
  no_answer: "No Answer",
  converted: "Converted",
  closed: "Closed",
};

export interface UtmParams {
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

export interface CreateLeadRequest {
  customerName: string;
  phoneNumber: string;
  productType: ProductType;
  utm?: UtmParams;
  /** Honeypot field: must remain empty for legitimate users */
  website?: string;
}

export interface CreateLeadResponse {
  leadId: string;
  updateToken: string;
  expiresAt: string;
  normalizedPhone: string;
  productType: ProductType;
  leadStatus: LeadStatus;
  deduplicated?: boolean;
}

export interface UpdateLeadSizeRequest {
  isCustom: boolean;
  sizeId?: string;
  mattressLength: number;
  mattressWidth: number;
}

export interface UpdateLeadSizeResponse {
  leadId: string;
  leadStatus: LeadStatus;
  mattressLength: number;
  mattressWidth: number;
  sizeLabel: string;
  completedAt: string;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export interface StoredLeadSession {
  leadId: string;
  updateToken: string;
  expiresAt: string;
  customerName: string;
  normalizedPhone: string;
  productType: ProductType;
  step: "select_size" | "thank_you";
  sizeLabel?: string;
}

export const PRODUCT_LABELS: Record<ProductType, string> = {
  mattress_only: "Mattress Only",
  divan_bed_mattress: "Divan Bed + Mattress",
};
