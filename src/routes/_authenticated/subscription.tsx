import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePlan, FREE_RECIPE_LIMIT } from "@/lib/premium";
import { PremiumBadge } from "@/components/alba/PremiumBadge";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "Suscripción · Pla.to" }] }),
  component: Subscription,
});

const FREE_FEATURES = [
  `Hasta ${FREE_RECIPE_LIMIT} recetas guardadas`,
  "Planificación semanal manual",
  "Lista de compras consolidada",
  "Exportar a WhatsApp",
];

const PRO_FEATURES = [
  "Recetas ilimitadas",
  "Alba ilimitada (recetas, plan, compras)",
  "Planificación automática semanal",
  "Optimización inteligente de compras",
  "Sustituciones y mejoras nutricionales",
  "Acceso anticipado a nuevas funciones",
];

function Subscription() {
  const { user } = useAuth();
  const { tier, isPro } = usePlan();

  const { data: sub } = useQuery({
    queryKey: ["sub", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const upgrade = () => {
    // Stripe Checkout placeholder. Conecta STRIPE_SECRET_KEY y crea un server route
    // POST /api/billing/checkout que devuelva la URL de Stripe.
    toast.message("Stripe Checkout aún no está conectado", {
      description: "Configura STRIPE_SECRET_KEY y STRIPE_PUBLISHABLE_KEY para activar el pago.",
    });
  };

  const portal = () => {
    toast.message("Customer Portal aún no está conectado", {
      description: "Necesitas Stripe Customer Portal habilitado.",
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Sparkles className="h-3 w-3" /> Pla.to impulsado por Alba
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Elige tu plan</h1>
        <p className="mt-3 text-muted-foreground">Empieza gratis. Sube a Pro cuando quieras desbloquear toda la magia de Alba.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {/* FREE */}
        <article className={`card-soft p-7 ${!isPro ? "ring-2 ring-foreground/10" : ""}`}>
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Free</div>
          <div className="font-display text-4xl font-bold">$0<span className="text-base font-normal text-muted-foreground">/mes</span></div>
          <p className="mt-2 text-sm text-muted-foreground">Lo esencial para organizar tu cocina.</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-muted-foreground" />{f}</li>
            ))}
          </ul>
          <button disabled className="mt-7 w-full rounded-full border border-border py-3 text-sm font-medium text-muted-foreground">
            {!isPro ? "Tu plan actual" : "Disponible"}
          </button>
        </article>

        {/* PRO */}
        <article className={`card-soft relative overflow-hidden border-accent p-7 ${isPro ? "ring-2 ring-accent" : ""}`}>
          <div className="absolute right-5 top-5"><PremiumBadge /></div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <Crown className="h-3.5 w-3.5" /> Pro
          </div>
          <div className="font-display text-4xl font-bold">$6<span className="text-base font-normal text-muted-foreground">/mes</span></div>
          <p className="mt-2 text-sm text-muted-foreground">Alba sin límites. Tu sous-chef personal.</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-accent" />{f}</li>
            ))}
          </ul>
          {isPro ? (
            <button onClick={portal} className="mt-7 w-full rounded-full border border-border py-3 text-sm font-medium hover:bg-cream-deep">
              Gestionar suscripción
            </button>
          ) : (
            <button onClick={upgrade} className="mt-7 w-full rounded-full bg-gradient-to-r from-accent to-[oklch(0.65_0.2_310)] py-3 text-sm font-medium text-accent-foreground shadow-pop transition-transform hover:-translate-y-0.5">
              Actualizar a Pro
            </button>
          )}
        </article>
      </div>

      {sub && (
        <div className="mt-8 rounded-2xl bg-secondary p-5 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Estado de tu suscripción</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-medium capitalize">{sub.status}</span>
            <span className="text-muted-foreground">·</span>
            <span className="capitalize">Plan {tier}</span>
            {sub.current_period_end && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Renueva el {new Date(sub.current_period_end).toLocaleDateString("es")}</span>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        ¿Dudas? <Link to="/profile" className="underline">Contacta desde tu perfil</Link>.
      </p>
    </div>
  );
}
