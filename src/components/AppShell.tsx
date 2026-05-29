import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, CalendarDays, ShoppingBasket, User, Crown } from "lucide-react";
import type { ReactNode } from "react";

const TABS = [
  { to: "/dashboard", label: "Inicio", icon: Home },
  { to: "/recipes", label: "Recetas", icon: BookOpen },
  { to: "/planner", label: "Plan", icon: CalendarDays },
  { to: "/shopping", label: "Compras", icon: ShoppingBasket },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pl-64">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border bg-secondary p-6 md:flex">
        <Link to="/dashboard" className="mb-10 flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-cream"}`}>
                <t.icon className="h-4 w-4" />
                <span className="font-medium">{t.label}</span>
              </Link>
            );
          })}
          <Link to="/subscription"
            className={`mt-4 flex items-center gap-3 rounded-lg border border-dashed border-accent/40 px-3 py-2.5 text-sm transition-colors ${
              pathname.startsWith("/subscription") ? "bg-accent text-accent-foreground" : "text-accent hover:bg-accent/10"
            }`}>
            <Crown className="h-4 w-4" />
            <span className="font-medium">Pla.to Pro</span>
          </Link>
        </nav>
        <div className="mt-auto text-xs text-muted-foreground">Pla.to · impulsado por Alba</div>
      </aside>

      <main>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${active ? "text-accent" : "text-muted-foreground"}`}>
                <t.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`grid place-items-center rounded-xl bg-primary text-primary-foreground ${small ? "h-7 w-7" : "h-9 w-9"}`}>
        <span className="font-display font-bold leading-none">P</span>
      </div>
      <span className={`font-display font-bold tracking-tight ${small ? "text-lg" : "text-xl"}`}>
        Pla<span className="text-accent">.</span>to
      </span>
    </div>
  );
}
