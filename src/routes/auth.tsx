import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/AppShell";
import { ArrowLeft, Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot"]).catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Entrar · Pla.to" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [authLoading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo si es necesario.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Te enviamos un email para recuperar tu contraseña.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setSubmitting(false);
    }
  };

  const google = async () => {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error con Google");
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left: brand */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Logo />
        <div>
          <p className="font-display text-4xl leading-tight">
            "Sé qué cocinar el lunes,<br />
            <span className="italic text-accent">y lo que falta en la nevera.</span>"
          </p>
          <p className="mt-4 text-sm opacity-70">— Cada familia que prueba Pla.to</p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>

      {/* Right: form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="md:hidden"><Logo /></div>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">
            {mode === "signup" && "Crea tu cuenta"}
            {mode === "login" && "Bienvenido de vuelta"}
            {mode === "forgot" && "Recuperar acceso"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "signup" && "Empieza a planificar en 30 segundos."}
            {mode === "login" && "Tus recetas y plan te esperan."}
            {mode === "forgot" && "Te enviaremos un email para reestablecer."}
          </p>

          {mode !== "forgot" && (
            <button
              onClick={google}
              disabled={submitting}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-medium hover:bg-cream-deep disabled:opacity-50"
            >
              <GoogleIcon /> Continuar con Google
            </button>
          )}

          {mode !== "forgot" && (
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> o con email <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Tu nombre">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="María" className="input" />
              </Field>
            )}
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="input" />
            </Field>
            {mode !== "forgot" && (
              <Field label="Contraseña">
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input" />
              </Field>
            )}
            <button type="submit" disabled={submitting} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" && "Crear cuenta"}
              {mode === "login" && "Iniciar sesión"}
              {mode === "forgot" && "Enviar enlace"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            {mode === "login" && (
              <>
                <Link to="/auth" search={{ mode: "signup" }} className="text-muted-foreground hover:text-foreground">Crear cuenta</Link>
                <Link to="/auth" search={{ mode: "forgot" }} className="text-muted-foreground hover:text-foreground">Olvidé mi contraseña</Link>
              </>
            )}
            {mode === "signup" && (
              <Link to="/auth" search={{ mode: "login" }} className="text-muted-foreground hover:text-foreground">¿Ya tienes cuenta? Inicia sesión</Link>
            )}
            {mode === "forgot" && (
              <Link to="/auth" search={{ mode: "login" }} className="text-muted-foreground hover:text-foreground">Volver al login</Link>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card);
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 150ms;
        }
        .input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px oklch(0.52 0.19 295 / 0.15); }
      `}</style>
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
