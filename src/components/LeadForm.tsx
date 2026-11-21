"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Phone, User } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { ProductSelector } from "@/components/ProductSelector";
import {
  normalizeSriLankanPhone,
  validateCustomerName,
} from "@/lib/validation";
import type {
  ApiErrorResponse,
  CreateLeadResponse,
  ProductType,
  UtmParams,
} from "@/types/lead";

interface LeadFormProps {
  utm: UtmParams;
  onLeadCreated: (data: CreateLeadResponse, customerName: string) => void;
}

export function LeadForm({ utm, onLeadCreated }: LeadFormProps) {
  const [productType, setProductType] = useState<ProductType>("mattress_only");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot field

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronous ref guard to prevent double-tap duplicate submissions
  const submitLockRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLockRef.current || isSubmitting) {
      return;
    }

    setFormError(null);
    const nextErrors: Record<string, string> = {};

    const nameCheck = validateCustomerName(customerName);
    if (!nameCheck.valid && nameCheck.error) {
      nextErrors.customerName = nameCheck.error;
    }

    const phoneCheck = normalizeSriLankanPhone(phoneNumber);
    if (!phoneCheck.valid && phoneCheck.error) {
      nextErrors.phoneNumber = phoneCheck.error;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: nameCheck.value,
          phoneNumber: phoneCheck.normalized,
          productType,
          utm,
          website,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | CreateLeadResponse
        | ApiErrorResponse
        | null;

      if (!response.ok || !payload || !("leadId" in payload)) {
        const errPayload = payload as ApiErrorResponse | null;
        if (errPayload?.fieldErrors) {
          setFieldErrors(errPayload.fieldErrors);
        }
        setFormError(
          errPayload?.error ??
            "Could not save your details right now. Please check your connection and try again."
        );
        return;
      }

      onLeadCreated(payload, nameCheck.value);
    } catch {
      setFormError(
        "Network error. Please check your internet connection and tap SELECT SIZE again."
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Product Category Selection */}
      <ProductSelector
        value={productType}
        onChange={setProductType}
        disabled={isSubmitting}
      />

      {/* Customer Details */}
      <div className="space-y-3.5">
        <p className="text-sm font-semibold text-slate-900">
          2. Enter your contact details to unlock the 50% OFF offer
        </p>

        {/* Honeypot anti-spam field */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {/* Name Field */}
        <div>
          <label
            htmlFor="customerName"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Your Name
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="customerName"
              name="customerName"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Kasun Perera"
              value={customerName}
              disabled={isSubmitting}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (fieldErrors.customerName) {
                  setFieldErrors((prev) => ({ ...prev, customerName: "" }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.customerName)}
              aria-describedby={
                fieldErrors.customerName ? "customerName-error" : undefined
              }
              className={`w-full rounded-xl border bg-white py-3.5 pr-4 pl-11 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:ring-2 focus:outline-none disabled:bg-slate-50 ${
                fieldErrors.customerName
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-300 focus:border-slate-900 focus:ring-slate-900/10"
              }`}
            />
          </div>
          {fieldErrors.customerName && (
            <p
              id="customerName-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-600"
            >
              {fieldErrors.customerName}
            </p>
          )}
        </div>

        {/* Phone Number Field */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Mobile Number (Sri Lanka)
          </label>
          <div className="relative">
            <Phone
              className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="07X XXX XXXX or +947X XXX XXXX"
              value={phoneNumber}
              disabled={isSubmitting}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (fieldErrors.phoneNumber) {
                  setFieldErrors((prev) => ({ ...prev, phoneNumber: "" }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.phoneNumber)}
              aria-describedby={
                fieldErrors.phoneNumber ? "phoneNumber-error" : undefined
              }
              className={`w-full rounded-xl border bg-white py-3.5 pr-4 pl-11 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:ring-2 focus:outline-none disabled:bg-slate-50 ${
                fieldErrors.phoneNumber
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-300 focus:border-slate-900 focus:ring-slate-900/10"
              }`}
            />
          </div>
          {fieldErrors.phoneNumber && (
            <p
              id="phoneNumber-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-600"
            >
              {fieldErrors.phoneNumber}
            </p>
          )}
        </div>
      </div>

      {/* Form-level Error Alert */}
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p>{formError}</p>
        </div>
      )}

      {/* Primary CTA */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 text-base font-extrabold tracking-wide text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-75"
      >
        {isSubmitting ? (
          <LoadingState compact label="SAVING DETAILS..." />
        ) : (
          <>
            <span>SELECT SIZE</span>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
