import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { categorize, formatForWhatsApp } from "@/lib/ingredients";
import { AlbaShoppingOptimizer } from "@/components/alba/AlbaFlows";
import { AlbaButton } from "@/components/alba/AlbaButton";
import { Check, Plus, Share2, Trash2, X } from "lucide-react";


export const Route = createFileRoute("/_authenticated/shopping")({
  head: () => ({ meta: [{ title: "Compras · Pla.to" }] }),
  component: Shopping,
});

function Shopping() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [albaOpen, setAlbaOpen] = useState(false);


  const { data: items = [] } = useQuery({
    queryKey: ["shop", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("shopping_list_items").select("*").eq("user_id", user!.id).order("category");
      return data ?? [];
    },
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      await supabase.from("shopping_list_items").update({ checked }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("shopping_list_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });

  const clearChecked = useMutation({
    mutationFn: async () => { await supabase.from("shopping_list_items").delete().eq("user_id", user!.id).eq("checked", true); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shop"] }); toast.success("Tachados eliminados"); },
  });

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("shopping_list_items").insert({
      user_id: user!.id, name: newName.trim(), category: categorize(newName), source: "manual",
    });
    if (error) return toast.error(error.message);
    setNewName("");
    qc.invalidateQueries({ queryKey: ["shop"] });
  };

  const shareWhatsApp = () => {
    const text = formatForWhatsApp(items);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const grouped = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Lista de compras</h1>
        <p className="mt-1 text-muted-foreground">{items.filter((i) => !i.checked).length} pendientes</p>
      </header>

      <div className="mb-6 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Añadir artículo..." className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-accent" />
        <button onClick={add} className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-5 w-5" /></button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <AlbaButton onClick={() => setAlbaOpen(true)}>Optimizar con Alba</AlbaButton>
        <button onClick={shareWhatsApp} disabled={items.length === 0}

          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50">
          <Share2 className="h-4 w-4" /> Compartir en WhatsApp
        </button>
        <button onClick={() => clearChecked.mutate()} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">
          <Trash2 className="h-4 w-4" /> Limpiar tachados
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card-soft p-12 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-cream-deep">🛒</div>
          <h3 className="font-display text-2xl font-semibold">Lista vacía</h3>
          <p className="mt-2 text-muted-foreground">Genera una desde el planificador o añade artículos arriba.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <section key={cat}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</h2>
              <div className="card-soft divide-y divide-border">
                {list.map((it) => (
                  <div key={it.id} className="group flex items-center gap-3 px-4 py-3">
                    <button onClick={() => toggle.mutate({ id: it.id, checked: !it.checked })}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${
                        it.checked ? "border-accent bg-accent text-accent-foreground" : "border-border"
                      }`}>
                      {it.checked && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className={`flex-1 text-sm ${it.checked ? "text-muted-foreground line-through" : ""}`}>
                      {it.name}
                      {it.quantity != null && <span className="ml-2 text-xs text-muted-foreground">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</span>}
                    </div>
                    <button onClick={() => remove.mutate(it.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <AlbaShoppingOptimizer open={albaOpen} onClose={() => setAlbaOpen(false)} userId={user!.id} items={items} onApplied={() => qc.invalidateQueries({ queryKey: ["shop"] })} />
    </div>

  );
}
