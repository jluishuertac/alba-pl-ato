import { Sparkles } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function AlbaButton({ children, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-[oklch(0.65_0.2_310)] px-4 py-2.5 text-sm font-medium text-accent-foreground shadow-pop transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 ${className}`}
    >
      <Sparkles className="h-4 w-4" />
      {children}
    </button>
  );
}
