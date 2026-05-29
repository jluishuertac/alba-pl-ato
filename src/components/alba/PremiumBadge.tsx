import { Sparkles } from "lucide-react";

export function PremiumBadge({ label = "Impulsado por Alba Pro" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-[oklch(0.7_0.18_300)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
      <Sparkles className="h-3 w-3" /> {label}
    </span>
  );
}

export function AlbaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
      <Sparkles className="h-3 w-3" /> {children}
    </span>
  );
}
