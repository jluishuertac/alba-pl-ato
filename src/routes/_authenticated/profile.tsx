import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Perfil · Pla.to" }] }),
  component: Profile,
});

const PREFS = ["Mediterránea", "Vegetariana", "Vegana", "Alta proteína", "Bajo en carbo"];
const RESTS = ["Sin gluten", "Sin lactosa", "Sin frutos secos", "Sin mariscos", "Sin cerdo"];
const GOALS = ["Ahorrar dinero", "Comer saludable", "Perder peso", "Ganar músculo", "Cocinar rápido", "Alimentación familiar"];
const LEVELS = ["Principiante", "Intermedio", "Avanzado"];
const TIMES = ["menos de 15 min", "15-30 min", "30-60 min", "más de 60 min"];

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [size, setSize] = useState(2);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [rests, setRests] = useState<string[]>([]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setSize(profile.household_size);
      setPrefs(profile.dietary_preferences ?? []);
      setRests(profile.dietary_restrictions ?? []);
    }
  }, [profile]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      display_name: name, household_size: size, dietary_preferences: prefs, dietary_restrictions: rests, onboarded: true, updated_at: new Date().toISOString(),
    }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil guardado");
  };

  const out = async () => { await signOut(); navigate({ to: "/", replace: true }); };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="mb-8 font-display text-4xl font-bold tracking-tight sm:text-5xl">Perfil</h1>

      <div className="card-soft space-y-5 p-6">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent" />
        </Field>
        <Field label="Tamaño de familia">
          <div className="flex items-center gap-3">
            <button onClick={() => setSize(Math.max(1, size - 1))} className="h-10 w-10 rounded-full border border-border">−</button>
            <div className="w-12 text-center font-display text-2xl font-bold">{size}</div>
            <button onClick={() => setSize(size + 1)} className="h-10 w-10 rounded-full border border-border">+</button>
            <span className="text-sm text-muted-foreground">personas</span>
          </div>
        </Field>
        <Field label="Preferencias">
          <div className="flex flex-wrap gap-2">
            {PREFS.map((p) => (
              <button key={p} onClick={() => toggle(prefs, setPrefs, p)}
                className={`rounded-full border px-3 py-1.5 text-xs ${prefs.includes(p) ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>
                {p}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Restricciones">
          <div className="flex flex-wrap gap-2">
            {RESTS.map((p) => (
              <button key={p} onClick={() => toggle(rests, setRests, p)}
                className={`rounded-full border px-3 py-1.5 text-xs ${rests.includes(p) ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>
                {p}
              </button>
            ))}
          </div>
        </Field>
        <button onClick={save} className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground">Guardar cambios</button>
      </div>

      <div className="mt-8 text-center">
        <div className="mb-3 text-sm text-muted-foreground">{user?.email}</div>
        <button onClick={out} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
