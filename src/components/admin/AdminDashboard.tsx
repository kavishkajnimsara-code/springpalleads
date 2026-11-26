"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  LogOut,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  StickyNote,
  Users,
  X,
} from "lucide-react";
import {
  CALL_STATUS_LABELS,
  PRODUCT_LABELS,
  type AdminLeadRecord,
  type AdminLeadSummary,
  type ApiErrorResponse,
  type CallStatus,
  type LeadStatus,
  type ProductType,
} from "@/types/lead";

interface AdminDashboardProps {
  adminEmail: string;
  initialLeads: AdminLeadRecord[];
  initialSummary: AdminLeadSummary;
  initialCampaigns: string[];
  initialError?: string | null;
}

const CALL_STATUS_STYLES: Record<CallStatus, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-800",
  called: "border-amber-200 bg-amber-50 text-amber-800",
  no_answer: "border-orange-200 bg-orange-50 text-orange-800",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
};

function formatSlDateTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("en-LK", {
      timeZone: "Asia/Colombo",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function getWhatsAppUrl(
  phoneNumber: string,
  customerName: string,
  couponCode?: string | null
): string {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  const couponNote = couponCode ? ` (Coupon: ${couponCode})` : "";
  const message = encodeURIComponent(
    `Hi ${customerName}, thank you for your interest in Spring Pal's exclusive mattress offer${couponNote}! How can we assist you today?`
  );
  return `https://wa.me/${digits}?text=${message}`;
}

export function AdminDashboard({
  adminEmail,
  initialLeads,
  initialSummary,
  initialCampaigns,
  initialError = null,
}: AdminDashboardProps) {
  const router = useRouter();

  const [leads, setLeads] = useState<AdminLeadRecord[]>(initialLeads);
  const [summary, setSummary] = useState<AdminLeadSummary>(initialSummary);
  const [campaigns, setCampaigns] = useState<string[]>(initialCampaigns);

  const [search, setSearch] = useState("");
  const [leadStatus, setLeadStatus] = useState<LeadStatus | "all">("all");
  const [callStatus, setCallStatus] = useState<CallStatus | "all">("all");
  const [productType, setProductType] = useState<ProductType | "all">("all");
  const [utmCampaign, setUtmCampaign] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(initialError);
  const [savingLeadIds, setSavingLeadIds] = useState<Record<string, boolean>>({});
  const [savedLeadIds, setSavedLeadIds] = useState<Record<string, boolean>>({});

  // Notes modal / inline editor state
  const [editingNotesLead, setEditingNotesLead] = useState<AdminLeadRecord | null>(
    null
  );
  const [notesDraft, setNotesDraft] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const isFirstRender = useRef(true);

  const buildFilterQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (leadStatus !== "all") params.set("leadStatus", leadStatus);
    if (callStatus !== "all") params.set("callStatus", callStatus);
    if (productType !== "all") params.set("productType", productType);
    if (utmCampaign !== "all") params.set("utmCampaign", utmCampaign);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  }, [search, leadStatus, callStatus, productType, utmCampaign, dateFrom, dateTo]);

  const fetchFilteredLeads = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);

    try {
      const qs = buildFilterQueryString();
      const response = await fetch(`/api/admin/leads${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            leads: AdminLeadRecord[];
            summary: AdminLeadSummary;
            campaigns: string[];
          }
        | ApiErrorResponse
        | null;

      if (!response.ok || !payload || !("leads" in payload)) {
        const err = payload as ApiErrorResponse | null;
        setErrorBanner(err?.error ?? "Failed to load leads.");
        return;
      }

      setLeads(payload.leads);
      setSummary(payload.summary);
      setCampaigns(payload.campaigns);
    } catch {
      setErrorBanner("Network error while loading leads. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [buildFilterQueryString, router]);

  // Debounced auto-fetch when filters change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void fetchFilteredLeads();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchFilteredLeads]);

  async function handleCallStatusChange(leadId: string, nextStatus: CallStatus) {
    setErrorBanner(null);
    setSavingLeadIds((prev) => ({ ...prev, [leadId]: true }));

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callStatus: nextStatus }),
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { id: string; call_status: CallStatus; updated_at: string }
        | ApiErrorResponse
        | null;

      if (!response.ok || !payload || !("call_status" in payload)) {
        const err = payload as ApiErrorResponse | null;
        setErrorBanner(err?.error ?? "Could not update call status.");
        return;
      }

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                call_status: payload.call_status,
                updated_at: payload.updated_at,
              }
            : lead
        )
      );
      setSavedLeadIds((prev) => ({ ...prev, [leadId]: true }));
      setTimeout(() => {
        setSavedLeadIds((prev) => ({ ...prev, [leadId]: false }));
      }, 1500);
    } catch {
      setErrorBanner("Network error while saving call status.");
    } finally {
      setSavingLeadIds((prev) => ({ ...prev, [leadId]: false }));
    }
  }

  async function handleSaveNotes() {
    if (!editingNotesLead || isSavingNotes) return;
    setIsSavingNotes(true);
    setErrorBanner(null);

    try {
      const response = await fetch(`/api/admin/leads/${editingNotesLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notesDraft }),
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { id: string; admin_notes: string | null; updated_at: string }
        | ApiErrorResponse
        | null;

      if (!response.ok || !payload || !("id" in payload)) {
        const err = payload as ApiErrorResponse | null;
        setErrorBanner(err?.error ?? "Could not save notes.");
        return;
      }

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === editingNotesLead.id
            ? {
                ...lead,
                admin_notes: payload.admin_notes,
                updated_at: payload.updated_at,
              }
            : lead
        )
      );
      setEditingNotesLead(null);
    } catch {
      setErrorBanner("Network error while saving notes.");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  function handleClearFilters() {
    setSearch("");
    setLeadStatus("all");
    setCallStatus("all");
    setProductType("all");
    setUtmCampaign("all");
    setDateFrom("");
    setDateTo("");
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    leadStatus !== "all" ||
    callStatus !== "all" ||
    productType !== "all" ||
    utmCampaign !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const exportUrl = `/api/admin/leads/export${
    buildFilterQueryString() ? `?${buildFilterQueryString()}` : ""
  }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/spring-pal-logo.png"
              alt="Spring Pal"
              width={110}
              height={49}
              className="h-8 w-auto object-contain"
            />
            <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                Leads Admin
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                {adminEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchFilteredLeads()}
              disabled={isLoading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <a
              href={exportUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>

            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {/* Error Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p>{errorBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              aria-label="Dismiss error"
              className="cursor-pointer text-red-500 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Summary KPI Cards */}
        <section
          aria-label="Lead summary metrics"
          className="grid grid-cols-2 gap-3 sm:grid-cols-5"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Total Leads</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Today (SL)</span>
              <Clock className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {summary.today}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>Completed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-emerald-900">
              {summary.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
              <span>Pending Size</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-amber-950">
              {summary.pendingSize}
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-xs sm:col-span-1">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
              <span>Uncalled (New)</span>
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-blue-950">
              {summary.newCalls}
            </p>
          </div>
        </section>

        {/* Filters Panel */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, or coupon..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>

            {/* Funnel Status */}
            <select
              aria-label="Filter by funnel status"
              value={leadStatus}
              onChange={(e) =>
                setLeadStatus(e.target.value as LeadStatus | "all")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Funnel Statuses</option>
              <option value="completed">Completed (Size Picked)</option>
              <option value="pending_size">Pending Size (Drop-off)</option>
            </select>

            {/* Call Status */}
            <select
              aria-label="Filter by call status"
              value={callStatus}
              onChange={(e) =>
                setCallStatus(e.target.value as CallStatus | "all")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Call Statuses</option>
              <option value="new">New</option>
              <option value="called">Called</option>
              <option value="no_answer">No Answer</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>

            {/* Product */}
            <select
              aria-label="Filter by product"
              value={productType}
              onChange={(e) =>
                setProductType(e.target.value as ProductType | "all")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Products</option>
              <option value="mattress_only">Mattress Only</option>
              <option value="divan_bed_mattress">Divan Bed + Mattress</option>
            </select>

            {/* Campaign */}
            <select
              aria-label="Filter by UTM campaign"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign} value={campaign}>
                  {campaign}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <label className="flex items-center gap-1.5">
                <span>From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-800"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span>To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-800"
                />
              </label>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-900">{leads.length}</strong>{" "}
                {leads.length === 1 ? "lead" : "leads"}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="cursor-pointer font-semibold text-red-600 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Leads List */}
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-900">
              No leads match your current filters
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try clearing your filters or waiting for new campaign submissions.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Phone &amp; Actions</th>
                      <th className="px-4 py-3">Product &amp; Size</th>
                      <th className="px-4 py-3">Funnel</th>
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3">Call Status</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3.5 align-top">
                          <p className="font-bold text-slate-900">
                            {lead.customer_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatSlDateTime(lead.created_at)}
                          </p>
                          {lead.coupon_code && (
                            <span className="mt-1 inline-block rounded-md bg-brand-soft px-2 py-0.5 font-mono text-[11px] font-bold text-brand-darker">
                              {lead.coupon_code}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <p className="font-mono text-xs font-semibold text-slate-800">
                            {lead.phone_number}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <a
                              href={`tel:${lead.phone_number}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Phone className="h-3 w-3 text-slate-500" />
                              Call
                            </a>
                            <a
                              href={getWhatsAppUrl(
                                lead.phone_number,
                                lead.customer_name,
                                lead.coupon_code
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </a>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <p className="text-xs font-semibold text-slate-900">
                            {PRODUCT_LABELS[lead.product_type]}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {lead.size_label ?? "No size selected yet"}
                          </p>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              lead.lead_status === "completed"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                            }`}
                          >
                            {lead.lead_status === "completed"
                              ? "Completed"
                              : "Pending Size"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                          <p className="font-medium text-slate-800">
                            {lead.utm_campaign ?? "—"}
                          </p>
                          {(lead.utm_source || lead.source) && (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {[lead.utm_source ?? lead.source, lead.utm_medium]
                                .filter(Boolean)
                                .join(" / ")}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="flex items-center gap-1.5">
                            <select
                              aria-label={`Call status for ${lead.customer_name}`}
                              disabled={Boolean(savingLeadIds[lead.id])}
                              value={lead.call_status}
                              onChange={(e) =>
                                void handleCallStatusChange(
                                  lead.id,
                                  e.target.value as CallStatus
                                )
                              }
                              className={`cursor-pointer rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none disabled:opacity-60 ${
                                CALL_STATUS_STYLES[lead.call_status]
                              }`}
                            >
                              {(
                                Object.keys(CALL_STATUS_LABELS) as CallStatus[]
                              ).map((statusKey) => (
                                <option key={statusKey} value={statusKey}>
                                  {CALL_STATUS_LABELS[statusKey]}
                                </option>
                              ))}
                            </select>
                            {savedLeadIds[lead.id] && (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesLead(lead);
                              setNotesDraft(lead.admin_notes ?? "");
                            }}
                            className="inline-flex max-w-[180px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <StickyNote className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {lead.admin_notes ? lead.admin_notes : "Add note"}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 lg:hidden">
              {leads.map((lead) => (
                <article
                  key={lead.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {lead.customer_name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {formatSlDateTime(lead.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        lead.lead_status === "completed"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                      }`}
                    >
                      {lead.lead_status === "completed"
                        ? "Completed"
                        : "Pending Size"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                    {lead.coupon_code && (
                      <p>
                        <span className="text-slate-500">Coupon:</span>{" "}
                        <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono font-bold text-brand-darker">
                          {lead.coupon_code}
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500">Product:</span>{" "}
                      <strong>{PRODUCT_LABELS[lead.product_type]}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Size:</span>{" "}
                      <strong>{lead.size_label ?? "Not selected yet"}</strong>
                    </p>
                    {(lead.utm_campaign || lead.utm_source || lead.source) && (
                      <p>
                        <span className="text-slate-500">Campaign:</span>{" "}
                        {[
                          lead.utm_campaign,
                          lead.utm_source ?? lead.source,
                          lead.utm_medium,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={`tel:${lead.phone_number}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone_number}
                    </a>
                    <a
                      href={getWhatsAppUrl(
                        lead.phone_number,
                        lead.customer_name,
                        lead.coupon_code
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <select
                      aria-label={`Call status for ${lead.customer_name}`}
                      disabled={Boolean(savingLeadIds[lead.id])}
                      value={lead.call_status}
                      onChange={(e) =>
                        void handleCallStatusChange(
                          lead.id,
                          e.target.value as CallStatus
                        )
                      }
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        CALL_STATUS_STYLES[lead.call_status]
                      }`}
                    >
                      {(Object.keys(CALL_STATUS_LABELS) as CallStatus[]).map(
                        (statusKey) => (
                          <option key={statusKey} value={statusKey}>
                            {CALL_STATUS_LABELS[statusKey]}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotesLead(lead);
                        setNotesDraft(lead.admin_notes ?? "");
                      }}
                      className="inline-flex max-w-[60%] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <StickyNote className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {lead.admin_notes ? lead.admin_notes : "Add note"}
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Notes Modal */}
      {editingNotesLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notes-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="notes-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  Notes — {editingNotesLead.customer_name}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingNotesLead.phone_number} •{" "}
                  {PRODUCT_LABELS[editingNotesLead.product_type]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingNotesLead(null)}
                aria-label="Close modal"
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              rows={4}
              maxLength={2000}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="e.g., Called at 3 PM, requested callback tomorrow morning, interested in 75x60..."
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNotesLead(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingNotes}
                onClick={() => void handleSaveNotes()}
                className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isSavingNotes ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
