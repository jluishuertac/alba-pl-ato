import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alba, type AlbaMeal, type AlbaRecipe, type WeeklyPlanEntry, type OptimizeShoppingResult } from "@/lib/alba/alba-service";
import { AlbaModal } from "./AlbaModal";

const MEALS: { v: AlbaMeal; label: string }[] = [
  { v: "breakfast", label: "Desayuno" },
  { v: "lunch", label: "Comida" },
  { v: "dinner", label: "Cena" },
  { v: "snack", label: "Snack" },
];

// =================== Recipe Creator ===================
export function AlbaRecipeCreator({
  open, onClose, userId, onCreated,
}: { open: boolean; onClose: () => void; userId: string; onCreated: () => void }) {
  const [ingredients, setIngredients] = useState("");
  const [servings, setServings] = useState(4);
  const [meal, setMeal] = useState<AlbaMeal>("lunch");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<AlbaRecipe | null>(null);

  const reset = () => { setDraft(null); setIngredients(""); };

  const run = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const recipe = await Alba.generateRecipe({
        ingredients: ingredients.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        servings, meal, profile: profile ?? undefined,
      });
      setDraft(recipe);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    const { error } = await supabase.from("recipes").insert({
      user_id: userId,
      title: draft.title,
      description: draft.description,
      category: draft.category,
      servings: draft.servings,
      prep_minutes: draft.prep_minutes,
      ingredients: draft.ingredients as never,
      steps: draft.steps.map((s) => s.text) as never,
    });
    if (error) return toast.error(error.message);
    toast.success("Receta guardada por Alba");
    onCreated();
    onClose();
    reset();
  };

  return (
    <AlbaModal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Crear receta con Alba"
      subtitle="Cuéntame qué tienes en la nevera"
      footer={
        draft ? (
          <div className="flex gap-2">
            <button onClick={() => setDraft(null)} className="flex-1 rounded-full border border-border py-2.5 text-sm">Regenerar</button>
            <button onClick={save} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">Guardar receta</button>
          </div>
        ) : (
          <button onClick={run} disabled={loading || !ingredients.trim()} className="w-full rounded-full bg-gradient-to-r from-accent to-[oklch(0.65_0.2_310)] py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 inline h-4 w-4" />Pedir a Alba</>}
          </button>
        )
      }
    >
      {!draft ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Ingredientes</label>
            <textarea
              rows={3}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="tomate, pollo, arroz, cebolla..."
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Porciones</label>
              <input type="number" min={1} value={servings} onChange={(e) => setServings(Number(e.target.value) || 1)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Comida</label>
              <select value={meal} onChange={(e) => setMeal(e.target.value as AlbaMeal)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent">
                {MEALS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-xl font-bold">{draft.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{draft.description}</p>
            <div className="mt-2 text-xs text-muted-foreground">{draft.servings} porc · {draft.prep_minutes} min</div>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Ingredientes</div>
            <ul className="space-y-1 text-sm">
              {draft.ingredients.map((i, idx) => (
                <li key={idx} className="flex justify-between border-b border-border/40 py-1">
                  <span>{i.name}</span>
                  <span className="text-muted-foreground">{i.quantity ?? ""} {i.unit ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Pasos</div>
            <ol className="space-y-2 text-sm">
              {draft.steps.map((s, idx) => (
                <li key={idx} className="flex gap-2"><span className="font-bold text-accent">{idx + 1}.</span><span>{s.text}</span></li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </AlbaModal>
  );
}

// =================== Weekly Planner ===================
export function AlbaPlannerGenerator({
  open, onClose, userId, weekStart, onGenerated,
}: { open: boolean; onClose: () => void; userId: string; weekStart: Date; onGenerated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<WeeklyPlanEntry[] | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const { data: recipes = [] } = await supabase.from("recipes").select("id, title, category").eq("user_id", userId);
      if (!recipes || recipes.length === 0) {
        toast.error("Necesitas al menos una receta guardada");
        setLoading(false);
        return;
      }
      const plan = await Alba.generateWeeklyPlan({
        weekStartISO: weekStart.toISOString(),
        recipes,
        profile: profile ?? undefined,
      });
      setPreview(plan);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!preview) return;
    setLoading(true);
    const startISO = weekStart.toISOString().slice(0, 10);
    const endDate = new Date(weekStart); endDate.setDate(endDate.getDate() + 7);
    const endISO = endDate.toISOString().slice(0, 10);
    await supabase.from("meal_plans").delete().eq("user_id", userId).gte("plan_date", startISO).lt("plan_date", endISO);
    const { error } = await supabase.from("meal_plans").insert(
      preview.map((p) => ({ user_id: userId, recipe_id: p.recipeId, plan_date: p.date, meal_type: p.meal })),
    );
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Semana planeada por Alba");
    onGenerated();
    onClose();
    setPreview(null);
  };

  return (
    <AlbaModal
      open={open}
      onClose={() => { onClose(); setPreview(null); }}
      title="Planear semana con Alba"
      subtitle="Usaré tus recetas, gustos y restricciones"
      footer={
        preview ? (
          <div className="flex gap-2">
            <button onClick={() => setPreview(null)} className="flex-1 rounded-full border border-border py-2.5 text-sm">Regenerar</button>
            <button onClick={apply} disabled={loading} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {loading ? "Aplicando..." : "Aplicar al planner"}
            </button>
          </div>
        ) : (
          <button onClick={run} disabled={loading} className="w-full rounded-full bg-gradient-to-r from-accent to-[oklch(0.65_0.2_310)] py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 inline h-4 w-4" />Generar plan</>}
          </button>
        )
      }
    >
      {!preview ? (
        <p className="text-sm text-muted-foreground">
          Alba combinará tus recetas en un plan equilibrado de 7 días. Reemplazará el plan actual de esta semana.
        </p>
      ) : (
        <div className="space-y-2 text-xs">
          {preview.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-1.5">
              <span className="font-mono text-muted-foreground">{p.date.slice(5)}</span>
              <span className="text-muted-foreground">{p.meal}</span>
              <span className="font-medium truncate ml-2">{p.recipeId.slice(0, 6)}…</span>
            </div>
          ))}
        </div>
      )}
    </AlbaModal>
  );
}

// =================== Shopping Optimizer ===================
type ShopItem = { id: string; name: string; quantity: number | null; unit: string | null; category: string };

export function AlbaShoppingOptimizer({
  open, onClose, userId, items, onApplied,
}: { open: boolean; onClose: () => void; userId: string; items: ShopItem[]; onApplied: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeShoppingResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await Alba.optimizeShoppingList({ items });
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!result) return;
    setLoading(true);
    if (result.removed.length) {
      await supabase.from("shopping_list_items").delete().in("id", result.removed);
    }
    for (const m of result.merged) {
      await supabase.from("shopping_list_items").update({
        quantity: m.quantity, unit: m.unit,
      }).eq("user_id", userId).eq("name", m.name);
    }
    setLoading(false);
    toast.success("Lista optimizada por Alba");
    onApplied();
    onClose();
    setResult(null);
  };

  return (
    <AlbaModal
      open={open}
      onClose={() => { onClose(); setResult(null); }}
      title="Optimizar lista con Alba"
      subtitle="Consolido, agrupo y sugiero mejoras"
      footer={
        result ? (
          <button onClick={apply} disabled={loading} className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {loading ? "Aplicando..." : "Aplicar cambios"}
          </button>
        ) : (
          <button onClick={run} disabled={loading || items.length === 0} className="w-full rounded-full bg-gradient-to-r from-accent to-[oklch(0.65_0.2_310)] py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 inline h-4 w-4" />Analizar lista</>}
          </button>
        )
      }
    >
      {!result ? (
        <p className="text-sm text-muted-foreground">
          Alba revisará tu lista, fusionará duplicados, agrupará por categoría y propondrá sustituciones más sanas o económicas.
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <Section title={`${result.merged.length} duplicados encontrados`}>
            {result.merged.length === 0 ? <Empty /> : result.merged.map((m, i) => (
              <div key={i} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> {m.name}</div>
            ))}
          </Section>
          <Section title={`${result.substitutions.length} sugerencias`}>
            {result.substitutions.length === 0 ? <Empty /> : result.substitutions.map((s, i) => (
              <div key={i} className="rounded-lg bg-secondary p-2 text-xs">
                <div><span className="line-through text-muted-foreground">{s.original}</span> → <span className="font-medium">{s.suggestion}</span></div>
                <div className="mt-1 text-muted-foreground">{s.reason}</div>
              </div>
            ))}
          </Section>
        </div>
      )}
    </AlbaModal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Empty() { return <div className="text-xs text-muted-foreground">Todo en orden ✨</div>; }
