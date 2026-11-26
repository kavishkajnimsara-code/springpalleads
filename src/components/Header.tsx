"use client";

import { useState } from "react";

export function Header() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="mb-4 flex items-center justify-center">
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
    </header>
  );
}
