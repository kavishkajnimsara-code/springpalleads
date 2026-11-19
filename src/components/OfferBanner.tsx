import { Sparkles } from "lucide-react";

export function OfferBanner() {
  return (
    <div
      role="banner"
      className="w-full bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-2.5 text-center">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
        <p className="text-sm font-bold tracking-wide sm:text-base">
          50% OFF MATTRESSES{" "}
          <span className="font-normal text-red-100">
            — Limited-Time Exclusive Offer
          </span>
        </p>
      </div>
    </div>
  );
}
