import {
  CheckCircle2,
  Globe,
  MessageCircle,
  Phone,
  PhoneCall,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PRODUCT_LABELS, type StoredLeadSession } from "@/types/lead";

interface ThankYouScreenProps {
  session: StoredLeadSession;
}

const SPRING_PAL_PHONE_DISPLAY = "077 444 8293";
const SPRING_PAL_PHONE_E164 = "+94774448293";
const SPRING_PAL_WHATSAPP_DIGITS = "94774448293";

export function ThankYouScreen({ session }: ThankYouScreenProps) {
  const isBundle = session.productType === "divan_bed_mattress";
  const offerPercentage = isBundle ? "40%" : "50%";
  const itemName = isBundle ? "Bundle Pack" : "Mattress";

  const whatsappMessage = encodeURIComponent(
    [
      `Hi Spring Pal, I just claimed my ${offerPercentage} OFF offer for ${PRODUCT_LABELS[session.productType]}.`,
      session.sizeLabel ? `Size: ${session.sizeLabel}` : null,
      session.couponCode ? `Coupon: ${session.couponCode}` : null,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const whatsappUrl = `https://wa.me/${SPRING_PAL_WHATSAPP_DIGITS}?text=${whatsappMessage}`;

  return (
    <div className="py-4 text-center">
      {/* Animated Success Icon */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/70">
        <CheckCircle2
          className="h-12 w-12 animate-bounce text-emerald-600 [animation-iteration-count:1]"
          aria-hidden="true"
        />
      </div>

      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        You Received{" "}
        <span className="text-brand">{offerPercentage} OFF</span> for your{" "}
        {itemName}
      </h1>

      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-700">
        Thank You! Your request has been received. Our Spring Pal team will
        contact you shortly with more details.
      </p>

      {/* Submitted Request Summary (No Prices / No Payment) */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Your Request Summary
        </p>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-2">
            <dt className="text-slate-600">Name</dt>
            <dd className="font-semibold text-slate-900">
              {session.customerName}
            </dd>
          </div>
          {session.couponCode && (
            <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-2">
              <dt className="text-slate-600">Discount Coupon</dt>
              <dd className="rounded-lg bg-brand-soft px-2.5 py-0.5 font-mono text-sm font-extrabold tracking-wider text-brand-darker">
                {session.couponCode}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-2">
            <dt className="text-slate-600">Product</dt>
            <dd className="font-semibold text-slate-900">
              {PRODUCT_LABELS[session.productType]}
            </dd>
          </div>
          {session.sizeLabel && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Selected Size</dt>
              <dd className="font-semibold text-brand">
                {session.sizeLabel}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Verified Spring Pal Trust Highlights */}
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-3 ring-1 ring-brand-border/60">
          <PhoneCall className="mx-auto h-4 w-4 text-brand" aria-hidden="true" />
          <p className="mt-1.5 text-[11px] font-semibold text-slate-700">
            Quick Callback
          </p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-brand-border/60">
          <ShieldCheck
            className="mx-auto h-4 w-4 text-brand"
            aria-hidden="true"
          />
          <p className="mt-1.5 text-[11px] font-semibold text-slate-700">
            10-Year Warranty
          </p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-brand-border/60">
          <Truck className="mx-auto h-4 w-4 text-brand" aria-hidden="true" />
          <p className="mt-1.5 text-[11px] font-semibold text-slate-700">
            Island-Wide Delivery
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <a
          href="https://springpal.lk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-bold text-brand-darker transition-colors hover:bg-brand-soft"
        >
          <Globe className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <span>Visit Our Website</span>
        </a>

        <a
          href={`tel:${SPRING_PAL_PHONE_E164}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-dark"
          title={`Call ${SPRING_PAL_PHONE_DISPLAY}`}
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Call Us Now</span>
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
          title={`WhatsApp ${SPRING_PAL_PHONE_DISPLAY}`}
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
