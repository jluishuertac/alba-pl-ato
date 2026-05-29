import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Bienvenido · Pla.to" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [size, setSize] = useState(4);
  const [saving, setSaving] = useState(false);

  const next = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ household_size: size, onboarded: true }).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-5 py-8 sm:px-8">
      <p className="text-sm text-muted-foreground">Empecemos</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">¿Cuántos son en casa?</h1>
      <p className="mt-3 text-muted-foreground">Usamos esto para escalar porciones y armar tu lista.</p>

      <div className="my-12 flex items-center justify-center gap-6">
        <button onClick={() => setSize(Math.max(1, size - 1))} className="h-14 w-14 rounded-full border border-border text-2xl">−</button>
        <div className="font-display text-7xl font-bold">{size}</div>
        <button onClick={() => setSize(size + 1)} className="h-14 w-14 rounded-full border border-border text-2xl">+</button>
      </div>

      <button onClick={next} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
        Continuar <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
