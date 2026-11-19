"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  RefreshCw,
  Ruler,
} from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import {
  CUSTOM_SIZE_ID,
  DIMENSION_LIMITS,
  MATTRESS_SIZE_OPTIONS,
} from "@/config/sizes";
import { validateMattressDimensions } from "@/lib/validation";
import {
  PRODUCT_LABELS,
  type ApiErrorResponse,
  type StoredLeadSession,
  type UpdateLeadSizeResponse,
} from "@/types/lead";

interface SizeSelectorProps {
  session: StoredLeadSession;
  onSizeConfirmed: (data: UpdateLeadSizeResponse) => void;
  onRestartSession: () => void;
}

export function SizeSelector({
  session,
  onSizeConfirmed,
  onRestartSession,
}: SizeSelectorProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const [customLength, setCustomLength] = useState("");
  const [customWidth, setCustomWidth] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLockRef = useRef(false);

  const isCustomSelected = selectedSizeId === CUSTOM_SIZE_ID;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLockRef.current || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setFieldErrors({});

    if (!selectedSizeId) {
      setErrorMessage("Please choose a mattress size or select Custom Size.");
      return;
    }

    // Proactively detect expired token before making network call
    if (Date.now() > new Date(session.expiresAt).getTime()) {
      setIsSessionExpired(true);
      setErrorMessage(
        "Your size selection session has expired. Your contact details are already saved — you can start a fresh session below to pick a size."
      );
      return;
    }

    let lengthValue: number;
    let widthValue: number;

    if (isCustomSelected) {
      const check = validateMattressDimensions({
        isCustom: true,
        mattressLength: customLength,
        mattressWidth: customWidth,
      });

      if (!check.valid || check.length === undefined || check.width === undefined) {
        setFieldErrors(check.fieldErrors ?? {});
        setErrorMessage(
          check.error ?? "Please enter valid length and width in inches."
        );
        return;
      }

      lengthValue = check.length;
      widthValue = check.width;
    } else {
      const preset = MATTRESS_SIZE_OPTIONS.find((s) => s.id === selectedSizeId);
      if (!preset) {
        setErrorMessage("Please select a valid mattress dimension.");
        return;
      }
      lengthValue = preset.length;
      widthValue = preset.width;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/leads/${session.leadId}/size`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.updateToken}`,
        },
        body: JSON.stringify({
          isCustom: isCustomSelected,
          sizeId: isCustomSelected ? undefined : selectedSizeId,
          mattressLength: lengthValue,
          mattressWidth: widthValue,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | UpdateLeadSizeResponse
        | ApiErrorResponse
        | null;

      if (!response.ok || !payload || !("sizeLabel" in payload)) {
        const errPayload = payload as ApiErrorResponse | null;
        if (
          response.status === 401 &&
          (errPayload?.code === "TOKEN_EXPIRED" ||
            errPayload?.code === "UNAUTHORIZED")
        ) {
          setIsSessionExpired(true);
        }
        if (errPayload?.fieldErrors) {
          setFieldErrors(errPayload.fieldErrors);
        }
        setErrorMessage(
          errPayload?.error ??
            "Could not save your selected size right now. Please tap Confirm Size to try again."
        );
        return;
      }

      onSizeConfirmed(payload);
    } catch {
      setErrorMessage(
        "Network error while saving your size. Your contact details are already saved — please try again."
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Progress & Confirmation Pill */}
      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/80">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Details saved for{" "}
          <strong className="font-semibold">{session.customerName}</strong>
        </span>
        <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-emerald-700">
          Step 2 of 2
        </span>
      </div>

      {/* Heading */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600">
          <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{PRODUCT_LABELS[session.productType]}</span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          Select Your Mattress Size
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose the exact dimensions in inches (Length × Width), or enter a
          custom size.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Preset Dimensions Grid */}
        <div
          role="radiogroup"
          aria-label="Mattress dimensions in inches"
          className="grid grid-cols-2 gap-2.5 sm:gap-3"
        >
          {MATTRESS_SIZE_OPTIONS.map((option) => {
            const isSelected = selectedSizeId === option.id;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isSubmitting || isSessionExpired}
                onClick={() => {
                  setSelectedSizeId(option.id);
                  setErrorMessage(null);
                  setFieldErrors({});
                }}
                className={`relative flex min-h-[64px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-red-600 bg-red-50/60 text-red-950 shadow-xs ring-1 ring-red-600/20"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                }`}
              >
                <span className="text-base font-bold tracking-tight">
                  {option.length} × {option.width}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  inches
                </span>

                {isSelected && (
                  <span
                    className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom Size Option (Full Width) */}
          <button
            type="button"
            role="radio"
            aria-checked={isCustomSelected}
            disabled={isSubmitting || isSessionExpired}
            onClick={() => {
              setSelectedSizeId(CUSTOM_SIZE_ID);
              setErrorMessage(null);
            }}
            className={`relative col-span-2 flex min-h-[58px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60 ${
              isCustomSelected
                ? "border-red-600 bg-red-50/60 text-red-950 shadow-xs ring-1 ring-red-600/20"
                : "border-dashed border-slate-300 bg-slate-50/70 text-slate-800 hover:border-slate-400"
            }`}
          >
            <Ruler className="h-4 w-4 text-red-600" aria-hidden="true" />
            <span className="text-sm font-bold sm:text-base">
              Custom Size (Enter Length &amp; Width)
            </span>
            {isCustomSelected && (
              <span
                className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-white"
                aria-hidden="true"
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </button>
        </div>

        {/* Custom Dimension Inputs */}
        {isCustomSelected && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Enter Custom Dimensions (inches)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="customLength"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Length (in)
                </label>
                <input
                  id="customLength"
                  name="customLength"
                  type="number"
                  inputMode="decimal"
                  min={DIMENSION_LIMITS.minInches}
                  max={DIMENSION_LIMITS.maxInches}
                  step="0.5"
                  placeholder="e.g. 78"
                  value={customLength}
                  disabled={isSubmitting || isSessionExpired}
                  onChange={(e) => {
                    setCustomLength(e.target.value);
                    if (fieldErrors.mattressLength) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        mattressLength: "",
                      }));
                    }
                  }}
                  className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:outline-none ${
                    fieldErrors.mattressLength
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-slate-900 focus:ring-slate-900/10"
                  }`}
                />
                {fieldErrors.mattressLength && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {fieldErrors.mattressLength}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="customWidth"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Width (in)
                </label>
                <input
                  id="customWidth"
                  name="customWidth"
                  type="number"
                  inputMode="decimal"
                  min={DIMENSION_LIMITS.minInches}
                  max={DIMENSION_LIMITS.maxInches}
                  step="0.5"
                  placeholder="e.g. 60"
                  value={customWidth}
                  disabled={isSubmitting || isSessionExpired}
                  onChange={(e) => {
                    setCustomWidth(e.target.value);
                    if (fieldErrors.mattressWidth) {
                      setFieldErrors((prev) => ({ ...prev, mattressWidth: "" }));
                    }
                  }}
                  className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:outline-none ${
                    fieldErrors.mattressWidth
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-slate-900 focus:ring-slate-900/10"
                  }`}
                />
                {fieldErrors.mattressWidth && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {fieldErrors.mattressWidth}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="space-y-2">
              <p>{errorMessage}</p>
              {isSessionExpired && (
                <button
                  type="button"
                  onClick={onRestartSession}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Start a Fresh Session
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirm CTA */}
        {!isSessionExpired && (
          <button
            type="submit"
            disabled={isSubmitting || !selectedSizeId}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 text-base font-extrabold tracking-wide text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <LoadingState compact label="CONFIRMING SIZE..." />
            ) : (
              <span>CONFIRM SIZE</span>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
