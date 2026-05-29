import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AlbaPlannerGenerator } from "@/components/alba/AlbaFlows";
import { AlbaButton } from "@/components/alba/AlbaButton";
import { ChevronLeft, ChevronRight, Plus, X, ShoppingBasket, GripVertical } from "lucide-react";
import { consolidate, type RawIngredient } from "@/lib/ingredients";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Planificador · Pla.to" }] }),
  component: Planner,
});

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: "Desayuno", lunch: "Comida", dinner: "Cena", snack: "Snack" };

type Plan = {
  id: string;
  plan_date: string;
  meal_type: string;
  recipe_id: string | null;
  recipes: { id: string; title: string; servings: number; ingredients: unknown } | null;
};

function Planner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [picker, setPicker] = useState<{ date: string; meal: string } | null>(null);
  const [albaOpen, setAlbaOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<Plan | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );


  const weekEnd = addDays(weekStart, 7);

  const { data: plans = [] } = useQuery({
    queryKey: ["plans", user?.id, weekStart.toISOString()],
    queryFn: async () => {
      const { data } = await supabase.from("meal_plans").select("*, recipes(id, title, servings, ingredients)")
        .eq("user_id", user!.id)
        .gte("plan_date", format(weekStart, "yyyy-MM-dd"))
        .lt("plan_date", format(weekEnd, "yyyy-MM-dd"));
      return (data ?? []) as unknown as Plan[];
    },
    enabled: !!user,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("recipes").select("*").eq("user_id", user!.id).order("title");
      return data ?? [];
    },
    enabled: !!user,
  });

  const assign = useMutation({
    mutationFn: async (recipeId: string) => {
      if (!picker) return;
      const { error } = await supabase.from("meal_plans").insert({
        user_id: user!.id, recipe_id: recipeId, plan_date: picker.date, meal_type: picker.meal,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); setPicker(null); toast.success("Comida asignada"); },
  });

  const move = useMutation({
    mutationFn: async ({ id, date, meal }: { id: string; date: string; meal: string }) => {
      const { error } = await supabase.from("meal_plans").update({ plan_date: date, meal_type: meal }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, date, meal }) => {
      await qc.cancelQueries({ queryKey: ["plans"] });
      const prev = qc.getQueryData<Plan[]>(["plans", user?.id, weekStart.toISOString()]);
      qc.setQueryData<Plan[]>(["plans", user?.id, weekStart.toISOString()], (old = []) =>
        old.map((p) => (p.id === id ? { ...p, plan_date: date, meal_type: meal } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["plans", user?.id, weekStart.toISOString()], ctx.prev);
      toast.error("No se pudo mover");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });

  const generateList = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("household_size").eq("id", user!.id).maybeSingle();
      const householdSize = profile?.household_size ?? 4;
      const raw: RawIngredient[] = [];
      for (const p of plans) {
        const r = p.recipes as { servings: number; ingredients: RawIngredient[] } | null;
        if (!r) continue;
        const scale = householdSize / Math.max(1, r.servings);
        for (const ing of r.ingredients ?? []) {
          raw.push({ ...ing, quantity: ing.quantity != null ? Number(ing.quantity) * scale : null });
        }
      }
      const items = consolidate(raw);
      if (items.length === 0) throw new Error("No hay recetas planeadas para esta semana");
      await supabase.from("shopping_list_items").delete().eq("user_id", user!.id).eq("source", "auto");
      const { error } = await supabase.from("shopping_list_items").insert(
        items.map((i) => ({ user_id: user!.id, name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, source: "auto" })),
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lista generada"); qc.invalidateQueries({ queryKey: ["shop"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveDrag(plans.find((p) => p.id === id) ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const [date, meal] = String(e.over.id).split("|");
    const plan = plans.find((p) => p.id === id);
    if (!plan || (plan.plan_date === date && plan.meal_type === meal)) return;
    move.mutate({ id, date, meal });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Plan semanal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semana del {format(weekStart, "d MMM", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-cream-deep">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="rounded-full border border-border px-3 py-2 text-xs font-medium hover:bg-cream-deep">Hoy</button>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-cream-deep">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <AlbaButton onClick={() => setAlbaOpen(true)}>Planear con Alba</AlbaButton>
        <button onClick={() => generateList.mutate()} disabled={generateList.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50">
          <ShoppingBasket className="h-4 w-4" />
          {generateList.isPending ? "Generando..." : "Generar lista de compras"}
        </button>
      </div>


      <p className="mb-3 hidden text-xs text-muted-foreground md:block">💡 Tip: arrastra las comidas entre días para reorganizar tu semana.</p>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(weekStart, i);
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
            return (
              <div key={i} className={`card-soft p-3 ${isToday ? "ring-2 ring-accent" : ""}`}>
                <div className="mb-2 border-b border-border pb-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{format(day, "EEEE", { locale: es })}</div>
                  <div className="font-display text-2xl font-bold">{format(day, "d")}</div>
                </div>
                <div className="space-y-2">
                  {MEALS.map((meal) => (
                    <MealSlot
                      key={meal}
                      date={dateStr}
                      meal={meal}
                      label={MEAL_LABELS[meal]}
                      plans={plans.filter((p) => p.plan_date === dateStr && p.meal_type === meal)}
                      onAdd={() => setPicker({ date: dateStr, meal })}
                      onRemove={(id) => remove.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeDrag ? (
            <div className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground shadow-pop">
              {activeDrag.recipes?.title ?? "—"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] sm:items-center" onClick={() => setPicker(null)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold">Elige receta</h3>
                <p className="text-xs text-muted-foreground">{MEAL_LABELS[picker.meal]} · {format(new Date(picker.date), "EEEE d 'de' MMM", { locale: es })}</p>
              </div>
              <button onClick={() => setPicker(null)}><X className="h-5 w-5" /></button>
            </div>
            {recipes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no tienes recetas. Crea una primero.</p>
            ) : (
              <div className="space-y-2">
                {recipes.map((r) => (
                  <button key={r.id} onClick={() => assign.mutate(r.id)} className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-3 text-left text-sm transition-colors hover:border-accent hover:bg-cream-deep/30">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.servings} porc.</span>
                  </button>
                ))}
              </div>
            )}
          </div>
      <AlbaPlannerGenerator open={albaOpen} onClose={() => setAlbaOpen(false)} userId={user!.id} weekStart={weekStart} onGenerated={() => qc.invalidateQueries({ queryKey: ["plans"] })} />
    </div>

      )}
    </div>
  );
}

function MealSlot({ date, meal, label, plans, onAdd, onRemove }: {
  date: string; meal: string; label: string; plans: Plan[];
  onAdd: () => void; onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}|${meal}` });
  return (
    <div ref={setNodeRef} className={`rounded-md transition-colors ${isOver ? "bg-accent/15 ring-1 ring-accent" : ""}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {plans.map((p) => (
        <DraggableItem key={p.id} plan={p} onRemove={() => onRemove(p.id)} />
      ))}
      <button onClick={onAdd} className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1 text-[10px] text-muted-foreground transition-colors hover:border-accent hover:text-accent">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function DraggableItem({ plan, onRemove }: { plan: Plan; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: plan.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.3 : 1 }
    : { opacity: isDragging ? 0.3 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group mt-1 flex items-center gap-1 rounded-md bg-cream-deep px-1.5 py-1 text-xs"
    >
      <button {...listeners} {...attributes} className="cursor-grab touch-none text-muted-foreground/60 active:cursor-grabbing" aria-label="Mover">
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="flex-1 truncate">{plan.recipes?.title ?? "—"}</span>
      <button onClick={onRemove} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Quitar">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
