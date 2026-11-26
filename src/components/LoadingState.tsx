import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  label?: string;
  compact?: boolean;
}

export function LoadingState({
  label = "Saving your request...",
  compact = false,
}: LoadingStateProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-10 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
