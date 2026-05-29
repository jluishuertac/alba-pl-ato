import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadRecipePhoto } from "@/lib/upload";
import { AlbaRecipeCreator } from "@/components/alba/AlbaFlows";
import { AlbaButton } from "@/components/alba/AlbaButton";
import { Heart, Plus, Trash2, X, Clock, Users, ImagePlus, Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes")({
  head: () => ({ meta: [{ title: "Recetas · Pla.to" }] }),
  component: RecipesPage,
});

type Ingredient = { name: string; quantity?: number; unit?: string };

function RecipesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [alba, setAlba] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "fav">("all");


  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const fav = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("recipes").update({ is_favorite: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receta eliminada");
    },
  });

  const filtered = recipes.filter((r) => {
    if (filter === "fav" && !r.is_favorite) return false;
    if (!search.trim()) return true;
    return r.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Recetas</h1>
          <p className="mt-1 text-muted-foreground">{recipes.length} guardadas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AlbaButton onClick={() => setAlba(true)}>Crear con Alba</AlbaButton>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0">
            <Plus className="h-4 w-4" /> Nueva
          </button>
        </div>
      </header>


      {recipes.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar receta..."
              className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex rounded-full bg-cream-deep p-1">
            {(["all", "fav"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  filter === f ? "bg-card shadow-soft" : "text-muted-foreground"
                }`}
              >
                {f === "all" ? "Todas" : "★ Favoritas"}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-soft h-72 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState onCreate={() => setOpen(true)} />
      ) : filtered.length === 0 ? (
        <div className="card-soft p-10 text-center text-sm text-muted-foreground">Nada coincide con tu búsqueda.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article key={r.id} className="card-soft group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-pop animate-[fadeIn_0.4s_ease-out]">
              <div className="relative">
                {r.image_url ? (
                  <img src={r.image_url} alt={r.title} loading="lazy" className="h-44 w-full object-cover" />
                ) : (
                  <div className="h-44 bg-gradient-to-br from-blush via-cream-deep to-mist" />
                )}
                <button
                  onClick={() => fav.mutate({ id: r.id, value: !r.is_favorite })}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 backdrop-blur transition-transform hover:scale-110"
                  aria-label="Favorita"
                >
                  <Heart className={`h-4 w-4 ${r.is_favorite ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg font-semibold leading-tight">{r.title}</h3>
                {r.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {r.servings}</span>
                  {r.prep_minutes && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.prep_minutes} min</span>}
                  <span className="ml-auto">{(r.ingredients as unknown as Ingredient[])?.length ?? 0} ingr.</span>
                </div>
                <button onClick={() => del.mutate(r.id)} className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive">
                  <Trash2 className="h-3 w-3" /> Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && <NewRecipeModal onClose={() => setOpen(false)} userId={user!.id} onCreated={() => qc.invalidateQueries({ queryKey: ["recipes"] })} />}
      <AlbaRecipeCreator open={alba} onClose={() => setAlba(false)} userId={user!.id} onCreated={() => qc.invalidateQueries({ queryKey: ["recipes"] })} />

    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card-soft p-12 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-cream-deep text-3xl">📖</div>
      <h3 className="font-display text-2xl font-semibold">Tu recetario está vacío</h3>
      <p className="mt-2 text-muted-foreground">Añade tu primera receta para empezar a planear.</p>
      <button onClick={onCreate} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        <Plus className="h-4 w-4" /> Crear receta
      </button>
    </div>
  );
}

function NewRecipeModal({ onClose, userId, onCreated }: { onClose: () => void; userId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState(4);
  const [prep, setPrep] = useState<number | "">("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", quantity: undefined, unit: "" }]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadRecipePhoto(file, userId);
      setImageUrl(url);
      toast.success("Foto subida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Pon un título");
    setSaving(true);
    const { error } = await supabase.from("recipes").insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      servings,
      prep_minutes: prep === "" ? null : Number(prep),
      category: category.trim() || null,
      ingredients: ingredients.filter((i) => i.name.trim()) as never,
      steps: steps.filter((s) => s.trim()) as never,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Receta guardada");
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-pop animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] sm:rounded-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Nueva receta</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-cream-deep"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Photo uploader */}
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Foto</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid h-40 w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-cream-deep/40 transition-colors hover:border-accent"
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors hover:bg-black/40">
                    <span className="rounded-full bg-card/90 px-3 py-1 text-xs opacity-0 transition-opacity hover:opacity-100">Cambiar</span>
                  </div>
                </>
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <ImagePlus className="mx-auto mb-1 h-6 w-6" />
                  Toca para subir foto
                  <div className="text-[10px]">JPG, PNG, WEBP · máx 5 MB</div>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </div>

          <Input label="Título" value={title} onChange={setTitle} placeholder="Pasta al pesto" />
          <Input label="Descripción" value={description} onChange={setDescription} placeholder="Breve descripción..." />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Porciones" type="number" value={String(servings)} onChange={(v) => setServings(Number(v) || 1)} />
            <Input label="Minutos" type="number" value={String(prep)} onChange={(v) => setPrep(v === "" ? "" : Number(v))} />
            <Input label="Categoría" value={category} onChange={setCategory} placeholder="Cena" />
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Ingredientes</div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <input className="auth-input flex-1" placeholder="Tomate" value={ing.name}
                    onChange={(e) => setIngredients(arr => arr.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                  <input className="auth-input w-20" placeholder="200" type="number" value={ing.quantity ?? ""}
                    onChange={(e) => setIngredients(arr => arr.map((x, idx) => idx === i ? { ...x, quantity: e.target.value ? Number(e.target.value) : undefined } : x))} />
                  <input className="auth-input w-20" placeholder="g" value={ing.unit ?? ""}
                    onChange={(e) => setIngredients(arr => arr.map((x, idx) => idx === i ? { ...x, unit: e.target.value } : x))} />
                  <button onClick={() => setIngredients(arr => arr.filter((_, idx) => idx !== i))} className="px-2 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setIngredients(arr => [...arr, { name: "", quantity: undefined, unit: "" }])} className="text-sm font-medium text-accent hover:underline">+ Añadir ingrediente</button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pasos</div>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2.5 w-6 text-sm font-medium text-muted-foreground">{i + 1}.</span>
                  <textarea className="auth-input flex-1" rows={2} value={s}
                    onChange={(e) => setSteps(arr => arr.map((x, idx) => idx === i ? e.target.value : x))} />
                  <button onClick={() => setSteps(arr => arr.filter((_, idx) => idx !== i))} className="px-2 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setSteps(arr => [...arr, ""])} className="text-sm font-medium text-accent hover:underline">+ Añadir paso</button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-medium hover:bg-cream-deep">Cancelar</button>
          <button onClick={save} disabled={saving || uploading} className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar receta"}
          </button>
        </div>

        <style>{`
          .auth-input {
            border-radius: 10px; border: 1px solid var(--border); background: var(--background);
            padding: 0.55rem 0.75rem; font-size: 0.9rem; outline: none; transition: border-color 150ms ease;
          }
          .auth-input:focus { border-color: var(--ring); }
        `}</style>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent" />
    </label>
  );
}
