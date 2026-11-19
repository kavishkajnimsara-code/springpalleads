"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export function Header() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="w-full border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {!logoFailed ? (
            /* Official Spring Pal logo from springpal.lk */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/spring-pal-logo.png"
              alt="Spring Pal"
              width={132}
              height={59}
              onError={() => setLogoFailed(true)}
              className="h-10 w-auto object-contain sm:h-11"
            />
          ) : (
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              SPRING <span className="text-red-600">PAL</span>
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          <span>10-Year Warranty</span>
        </div>
      </div>
    </header>
  );
}
