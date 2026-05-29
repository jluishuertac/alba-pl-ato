import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nueva contraseña · Pla.to" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">Nueva contraseña</h1>
        <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••" className="mt-6 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-accent" />
        <button disabled={busy} className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          Actualizar
        </button>
      </form>
    </div>
  );
}
