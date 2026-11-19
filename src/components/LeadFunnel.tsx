"use client";

import { useEffect, useState } from "react";
import { MapPin, ShieldCheck, Truck } from "lucide-react";
import { LeadForm } from "@/components/LeadForm";
import { SizeSelector } from "@/components/SizeSelector";
import { ThankYouScreen } from "@/components/ThankYouScreen";
import type {
  CreateLeadResponse,
  StoredLeadSession,
  UpdateLeadSizeResponse,
  UtmParams,
} from "@/types/lead";

const LEAD_SESSION_KEY = "spring_pal_lead_session_v1";
const UTM_STORAGE_KEY = "spring_pal_utm_params_v1";

function readUtmFromUrl(): UtmParams | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);

  const utm_source = params.get("utm_source");
  const utm_medium = params.get("utm_medium");
  const utm_campaign = params.get("utm_campaign");
  const utm_content = params.get("utm_content");
  const utm_term = params.get("utm_term");
  const source = params.get("source") ?? utm_source;

  if (
    !source &&
    !utm_source &&
    !utm_medium &&
    !utm_campaign &&
    !utm_content &&
    !utm_term
  ) {
    return null;
  }

  return {
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  };
}

export function LeadFunnel() {
  const [utm, setUtm] = useState<UtmParams>({});
  const [session, setSession] = useState<StoredLeadSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore UTM params and active lead session safely on client mount
  useEffect(() => {
    try {
      const urlUtm = readUtmFromUrl();
      if (urlUtm) {
        setUtm(urlUtm);
        window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(urlUtm));
      } else {
        const savedUtm = window.sessionStorage.getItem(UTM_STORAGE_KEY);
        if (savedUtm) {
          setUtm(JSON.parse(savedUtm) as UtmParams);
        }
      }

      const savedSession = window.sessionStorage.getItem(LEAD_SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as StoredLeadSession;
        if (parsed && parsed.leadId && parsed.step) {
          setSession(parsed);
        }
      }
    } catch {
      // Ignore storage access errors (e.g., strict private browsing)
    } finally {
      setHydrated(true);
    }
  }, []);

  function persistSession(next: StoredLeadSession | null) {
    setSession(next);
    try {
      if (next) {
        window.sessionStorage.setItem(LEAD_SESSION_KEY, JSON.stringify(next));
      } else {
        window.sessionStorage.removeItem(LEAD_SESSION_KEY);
      }
    } catch {
      // Ignore storage write errors
    }
  }

  function handleLeadCreated(data: CreateLeadResponse, customerName: string) {
    const nextSession: StoredLeadSession = {
      leadId: data.leadId,
      updateToken: data.updateToken,
      expiresAt: data.expiresAt,
      customerName,
      normalizedPhone: data.normalizedPhone,
      productType: data.productType,
      step: "select_size",
    };

    persistSession(nextSession);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSizeConfirmed(data: UpdateLeadSizeResponse) {
    if (!session) return;

    const completedSession: StoredLeadSession = {
      ...session,
      step: "thank_you",
      sizeLabel: data.sizeLabel,
    };

    persistSession(completedSession);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleRestartSession() {
    persistSession(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-10 sm:px-6 sm:pt-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8">
        {!hydrated ? (
          <div className="space-y-4 py-4">
            <div className="h-7 w-3/4 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : session?.step === "thank_you" ? (
          <ThankYouScreen session={session} />
        ) : session?.step === "select_size" ? (
          <SizeSelector
            session={session}
            onSizeConfirmed={handleSizeConfirmed}
            onRestartSession={handleRestartSession}
          />
        ) : (
          <div className="space-y-5">
            {/* High-Converting Hero Copy */}
            <div className="space-y-2 text-center">
              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-bold tracking-wide text-red-700 uppercase ring-1 ring-red-200/70">
                Sri Lanka Exclusive Offer
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Get <span className="text-red-600">50% OFF</span> Premium Spring
                Pal Mattresses
              </h1>
              <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
                Choose your product and enter your details below to select your
                size and receive your exclusive offer.
              </p>
            </div>

            {/* Lead Capture Form (Step 1) */}
            <LeadForm utm={utm} onLeadCreated={handleLeadCreated} />
          </div>
        )}
      </section>

      {/* Verified Spring Pal Trust Strip (shown on landing & size steps) */}
      {session?.step !== "thank_you" && (
        <aside
          aria-label="Spring Pal trust highlights"
          className="mt-5 grid grid-cols-3 gap-2 text-center sm:gap-3"
        >
          <div className="flex flex-col items-center rounded-2xl border border-slate-200/70 bg-white px-2.5 py-3 shadow-xs">
            <ShieldCheck
              className="h-5 w-5 text-emerald-600"
              aria-hidden="true"
            />
            <p className="mt-1.5 text-xs font-bold text-slate-900">
              10-Year Warranty
            </p>
            <p className="text-[11px] text-slate-500">On spring mattresses</p>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-slate-200/70 bg-white px-2.5 py-3 shadow-xs">
            <Truck className="h-5 w-5 text-slate-800" aria-hidden="true" />
            <p className="mt-1.5 text-xs font-bold text-slate-900">
              Island-Wide
            </p>
            <p className="text-[11px] text-slate-500">Delivery across SL</p>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-slate-200/70 bg-white px-2.5 py-3 shadow-xs">
            <MapPin className="h-5 w-5 text-red-600" aria-hidden="true" />
            <p className="mt-1.5 text-xs font-bold text-slate-900">
              Nawala Showroom
            </p>
            <p className="text-[11px] text-slate-500">Sri Lanka brand</p>
          </div>
        </aside>
      )}
    </main>
  );
}
