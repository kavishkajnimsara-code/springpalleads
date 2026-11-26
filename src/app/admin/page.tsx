import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import {
  computeLeadSummary,
  extractDistinctCampaigns,
  fetchAdminLeads,
} from "@/lib/admin-leads";
import { getAuthenticatedAdmin } from "@/lib/supabase-auth";
import type { AdminLeadRecord, AdminLeadSummary } from "@/types/lead";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  let initialLeads: AdminLeadRecord[] = [];
  let initialSummary: AdminLeadSummary = {
    total: 0,
    completed: 0,
    pendingSize: 0,
    today: 0,
    newCalls: 0,
  };
  let initialCampaigns: string[] = [];
  let initialError: string | null = null;

  try {
    initialLeads = await fetchAdminLeads({ limit: 500 });
    initialSummary = computeLeadSummary(initialLeads);
    initialCampaigns = extractDistinctCampaigns(initialLeads);
  } catch (error) {
    console.error("[AdminPage] Failed to load initial leads:", error);
    initialError =
      "Could not load leads from Supabase. Please check your database connection and try refreshing.";
  }

  return (
    <AdminDashboard
      adminEmail={admin.email}
      initialLeads={initialLeads}
      initialSummary={initialSummary}
      initialCampaigns={initialCampaigns}
      initialError={initialError}
    />
  );
}
