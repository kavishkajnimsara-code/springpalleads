"use client";

import { CheckCircle2 } from "lucide-react";
import type { ProductType } from "@/types/lead";

interface ProductOption {
  id: ProductType;
  title: string;
  badge: string;
  imageSrc: string;
  imageAlt: string;
  isPlaceholder?: boolean;
}

const PRODUCT_OPTIONS: readonly ProductOption[] = [
  {
    id: "mattress_only",
    title: "Mattress Only",
    badge: "50% OFF",
    imageSrc: "/images/mattress-only.jpg",
    imageAlt: "Spring Pal premium spring mattress",
  },
  {
    id: "divan_bed_mattress",
    title: "Divan Bed + Mattress",
    badge: "40% OFF",
    imageSrc: "/images/divan-bed-bundle.jpg",
    imageAlt: "Spring Pal divan bed and mattress bundle",
  },
];

interface ProductSelectorProps {
  value: ProductType;
  onChange: (value: ProductType) => void;
  disabled?: boolean;
}

export function ProductSelector({
  value,
  onChange,
  disabled = false,
}: ProductSelectorProps) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-semibold text-slate-900">
        1. Choose what you&apos;re interested in
      </legend>

      <div
        role="radiogroup"
        aria-label="Product category"
        className="grid grid-cols-2 gap-3"
      >
        {PRODUCT_OPTIONS.map((option) => {
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.id)}
              disabled={disabled}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                isSelected
                  ? "border-red-600 bg-red-50/40 shadow-sm ring-1 ring-red-600/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              {/* Product Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.imageSrc}
                  alt={option.imageAlt}
                  loading="eager"
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span
                  className={`absolute top-2 left-2 rounded-full tracking-wide uppercase shadow-sm ${
                    option.id === "mattress_only"
                      ? "bg-red-600 px-3 py-1 text-xs font-extrabold text-white sm:px-3.5 sm:py-1.5 sm:text-sm"
                      : "bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white sm:px-3 sm:text-xs"
                  }`}
                >
                  {option.badge}
                </span>

                {isSelected && (
                  <span
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-xs"
                    aria-hidden="true"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
              </div>

              {/* Card Text */}
              <div className="flex flex-1 items-center justify-center p-3 text-center">
                <p className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                  {option.title}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
