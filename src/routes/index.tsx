import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, CalendarDays, ShoppingBasket, Heart, Check } from "lucide-react";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pla.to · Planifica comidas en familia sin estrés" },
      { name: "description", content: "Menús semanales, recetas y listas de compras inteligentes. Pla.to consolida ingredientes automáticamente para que sepas qué cocinar y comprar en menos de 2 minutos." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:inline"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Empezar gratis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-24 sm:pt-20">
        <div className="pill mb-6">
          <Sparkles className="h-3 w-3 text-accent" /> Nuevo · Listas inteligentes
        </div>
        <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl md:text-[88px]">
          Qué cocinar.<br />
          Qué comprar.<br />
          <span className="italic text-accent">En 2 minutos.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted-foreground">
          Pla.to es el planificador de comidas familiar que consolida ingredientes,
          escala porciones y arma tu lista de compras automáticamente.
          Menos estrés. Menos desperdicio. Más tiempo en familia.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Crea tu primer plan
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-base font-medium hover:bg-cream-deep"
          >
            Ya tengo cuenta
          </Link>
        </div>

        {/* Floating cards */}
        <div className="mt-20 grid gap-5 sm:grid-cols-3">
          <FeatureCard
            tint="bg-[oklch(0.95_0.05_300)]"
            icon={<CalendarDays className="h-5 w-5" />}
            title="Plan semanal"
            body="Arrastra recetas a tus días. Repite la semana anterior con un toque."
          />
          <FeatureCard
            tint="bg-[oklch(0.94_0.05_10)]"
            icon={<ShoppingBasket className="h-5 w-5" />}
            title="Lista mágica"
            body="3 recetas con tomate = una sola entrada con la cantidad total."
          />
          <FeatureCard
            tint="bg-[oklch(0.93_0.05_210)]"
            icon={<Heart className="h-5 w-5" />}
            title="Hecho en familia"
            body="Configura tamaño, preferencias y restricciones. El resto, automático."
          />
        </div>
      </section>

      {/* How */}
      <section className="border-y border-border bg-cream-deep py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Así de simple.</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              { n: "01", t: "Guarda tus recetas", d: "Sube fotos, ingredientes y pasos. Marca favoritas." },
              { n: "02", t: "Planifica la semana", d: "Asigna comidas por día. Sugerencias inteligentes." },
              { n: "03", t: "Comparte la lista", d: "Exporta a WhatsApp en un toque, lista para el súper." },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-display text-7xl text-accent/60">{s.n}</div>
                <h3 className="mt-2 font-display text-2xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bullets */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            "Consolida ingredientes repetidos automáticamente",
            "Escala porciones al tamaño de tu familia",
            "Categoriza la lista por pasillos del súper",
            "Reduce el desperdicio de comida cada semana",
            "Mobile-first, instalable como app",
            "Tus recetas, siempre privadas",
          ].map((b) => (
            <div key={b} className="flex items-start gap-3">
              <div className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-foreground">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-foreground/90">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="card-brutal relative overflow-hidden p-10 text-center sm:p-16">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">
            Empieza esta semana.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Gratis para tu familia. Sin tarjeta. Listo en 30 segundos.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground"
          >
            Crear cuenta <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Pla.to · Hecho con cariño para familias.
      </footer>
    </div>
  );
}

function FeatureCard({ tint, icon, title, body }: { tint: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card-soft group relative overflow-hidden p-6 transition-transform hover:-translate-y-1">
      <div className={`mb-4 inline-grid h-10 w-10 place-items-center rounded-xl ${tint}`}>{icon}</div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
