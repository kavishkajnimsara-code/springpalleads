import { LeadFunnel } from "@/components/LeadFunnel";
import { OfferBanner } from "@/components/OfferBanner";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-slate-50/70 to-slate-100/70">
      <OfferBanner />
      <LeadFunnel />
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-5 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-2xl px-4">
          <p className="font-semibold text-slate-700">Spring Pal Sri Lanka</p>
          <p className="mt-1">
            246 A, Nawala Rd, Sri Jayawardenepura Kotte • Island-Wide Delivery
          </p>
        </div>
      </footer>
    </div>
  );
}
