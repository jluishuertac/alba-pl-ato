import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Alba, type AlbaMeal } from "@/lib/alba/alba-service";
import { AlbaChip } from "@/components/alba/PremiumBadge";
import { AlbaRecipeCreator, AlbaPlannerGenerator, AlbaShoppingOptimizer } from "@/components/alba/AlbaFlows";
import { ArrowRight, BookOpen, CalendarDays, Plus, ShoppingBasket, Sparkles, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Inicio · Pla.to" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [albaRecipe, setAlbaRecipe] = useState(false);
  const [albaPlan, setAlbaPlan] = useState(false);
  const [albaShop, setAlbaShop] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: recipes } = useQuery({
    queryKey: ["recipes-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("recipes").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: shopping } = useQuery({
    queryKey: ["shop-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("shopping_list_items").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("checked", false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["shop", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("shopping_list_items").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: weekPlans = [] } = useQuery({
    queryKey: ["week-plans", user?.id, weekStart.toISOString()],
    queryFn: async () => {
      const end = addDays(weekStart, 7);
      const { data } = await supabase
        .from("meal_plans")
        .select("*, recipes(title, image_url, ingredients)")
        .eq("user_id", user!.id)
        .gte("plan_date", format(weekStart, "yyyy-MM-dd"))
        .lt("plan_date", format(end, "yyyy-MM-dd"))
        .order("plan_date");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["alba-sugg", profile?.goal, profile?.time_available],
    queryFn: () => Alba.suggestRecipes(profile ?? undefined),
    enabled: !!profile,
  });

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  useEffect(() => { if (profile && !profile.onboarded) setNeedsOnboarding(true); }, [profile]);

  const todayPlans = weekPlans.filter((p) => p.plan_date === today);
  const nextPlan = weekPlans.find((p) => p.plan_date >= today);

  // Ingredientes faltantes: ingredientes de hoy que NO están en lista de compras
  const todayIngredients = todayPlans.flatMap((p) => {
    const r = p.recipes as { ingredients?: { name: string }[] } | null;
    return (r?.ingredients ?? []).map((i) => i.name);
  });
  const shoppingNames = new Set(items.map((i) => i.name.toLowerCase()));
  const missing = Array.from(new Set(todayIngredients.filter((n) => !shoppingNames.has(n.toLowerCase())))).slice(0, 5);

  const hello = profile?.display_name ?? user?.email?.split("@")[0] ?? "";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{greet},</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {hello}<span className="text-accent">.</span>
          </h1>
        </div>
        {profile?.plan_tier === "pro" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase text-accent">
            <Crown className="h-3.5 w-3.5" /> Pro
          </span>
        ) : (
          <Link to="/subscription" className="text-xs text-muted-foreground underline">Subir a Pro</Link>
        )}
      </header>

      {needsOnboarding && (
        <Link to="/onboarding" className="card-brutal mb-6 flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground"><Sparkles className="h-5 w-5" /></div>
            <div>
              <div className="font-medium">Completa tu perfil</div>
              <div className="text-sm text-muted-foreground">Para que Alba personalice tus comidas.</div>
            </div>
          </div>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      {/* Today + Next */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Hoy cocinas" empty="Nada planeado para hoy" link="/planner">
          {todayPlans.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-sm">
              {todayPlans.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span className="font-medium">{(p.recipes as { title?: string } | null)?.title ?? "—"}</span>
                  <span className="text-xs uppercase text-muted-foreground">{p.meal_type}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Siguiente comida" empty="Sin próximas" link="/planner">
          {nextPlan && (
            <div className="mt-2">
              <div className="font-medium">{(nextPlan.recipes as { title?: string } | null)?.title ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(nextPlan.plan_date), "EEEE d", { locale: es })} · {nextPlan.meal_type}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Missing ingredients */}
      {missing.length > 0 && (
        <div className="card-soft mt-3 flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Te faltan</div>
            <div className="mt-1 truncate text-sm">{missing.join(" · ")}</div>
          </div>
          <Link to="/shopping" className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">Ir a compras</Link>
        </div>
      )}

      {/* Alba quick actions */}
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-2xl font-semibold">Alba a tu servicio</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <AlbaQuick onClick={() => setAlbaRecipe(true)} title="Crear receta" sub="Dime qué tienes" />
          <AlbaQuick onClick={() => setAlbaPlan(true)} title="Planear semana" sub="En segundos" />
          <AlbaQuick onClick={() => setAlbaShop(true)} title="Optimizar compras" sub="Sin duplicados" />
        </div>
      </section>

      {/* Alba recomienda */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Alba recomienda</h2>
          <AlbaChip>según tu perfil</AlbaChip>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {suggestions.map((s, idx) => (
            <SuggCard key={idx} title={s.title} reason={s.reason} meal={s.category} />
          ))}
        </div>
      </section>

      {/* Stats */}
      <h2 className="mt-12 mb-4 font-display text-2xl font-semibold">Atajos</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Action to="/recipes" icon={<BookOpen className="h-5 w-5" />} title="Mis recetas" sub={`${recipes ?? 0} guardadas`} />
        <Action to="/planner" icon={<CalendarDays className="h-5 w-5" />} title="Plan semanal" sub={`${weekPlans.length} comidas`} />
        <Action to="/shopping" icon={<ShoppingBasket className="h-5 w-5" />} title="Compras" sub={`${shopping ?? 0} pendientes`} />
      </div>

      <div className="h-24" />
      <Link to="/recipes" className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop md:bottom-8 md:right-8">
        <Plus className="h-6 w-6" />
      </Link>

      {user && (
        <>
          <AlbaRecipeCreator open={albaRecipe} onClose={() => setAlbaRecipe(false)} userId={user.id} onCreated={() => {}} />
          <AlbaPlannerGenerator open={albaPlan} onClose={() => setAlbaPlan(false)} userId={user.id} weekStart={weekStart} onGenerated={() => {}} />
          <AlbaShoppingOptimizer open={albaShop} onClose={() => setAlbaShop(false)} userId={user.id} items={items} onApplied={() => {}} />
        </>
      )}
    </div>
  );
}

function Card({ title, children, empty, link }: { title: string; children?: React.ReactNode; empty: string; link: string }) {
  const hasContent = !!children && (Array.isArray(children) ? children.length > 0 : true);
  return (
    <Link to={link} className="card-soft block p-5 transition-transform hover:-translate-y-0.5">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      {hasContent ? children : <div className="mt-2 text-sm text-muted-foreground">{empty}</div>}
    </Link>
  );
}

function AlbaQuick({ onClick, title, sub }: { onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className="card-soft group flex items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-[oklch(0.65_0.2_310)] text-accent-foreground">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
    </button>
  );
}

function SuggCard({ title, reason, meal }: { title: string; reason: string; meal: AlbaMeal }) {
  return (
    <article className="card-soft p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{meal}</div>
      <h3 className="mt-1 font-display text-lg font-semibold leading-tight">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
      <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
        Guardar
      </button>
    </article>
  );
}

function Action({ to, icon, title, sub }: { to: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className="card-soft group flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{sub}</div>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
