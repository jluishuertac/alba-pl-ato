import { X } from "lucide-react";
import type { ReactNode } from "react";

export function AlbaModal({
  open, onClose, title, subtitle, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-card shadow-pop sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-border bg-gradient-to-br from-accent/10 to-transparent p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground font-display font-bold">A</div>
          <div className="flex-1">
            <div className="font-display text-lg font-semibold">{title}</div>
            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-border bg-secondary/50 p-4">{footer}</div>}
      </div>
    </div>
  );
}
