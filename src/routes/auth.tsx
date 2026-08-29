import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuthStore } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next:
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
        ? s.next
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Positron Studio" },
      {
        name: "description",
        content: "Sign in to Positron Studio to save and sync your neobrutalist designs.",
      },
      { property: "og:title", content: "Sign in — Positron Studio" },
      {
        property: "og:description",
        content: "Sign in to Positron Studio to save and sync your neobrutalist designs.",
      },
      { property: "og:url", content: "https://positronstudio.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://positronstudio.lovable.app/auth" }],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (next) window.location.replace(next);
    else navigate({ to: "/" });
  }, [user, navigate, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: next ? window.location.origin + next : window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? window.location.origin + next : window.location.origin,
    });
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    if (next) window.location.replace(next);
    else navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink scanlines p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="brutal-border-2 brutal-shadow-lg relative w-full max-w-md bg-surface p-6">
        <Link to="/" className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center bg-blue-deep brutal-border glow-blue">
            <Zap className="h-5 w-5 text-teal" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="font-display text-xl tracking-[0.18em] text-teal text-glow">
            POSITRON<span className="text-blue text-glow-blue">//</span>STUDIO
          </div>
        </Link>

        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-teal">
          {mode === "signin" ? "// Sign in" : "// Create account"}
        </h1>
        <p className="mt-1 font-mono text-[11px] text-teal/60">
          &gt; cloud sync · save your designs · pick up anywhere
        </p>

        <button
          onClick={google}
          disabled={loading}
          className="brutal-border brutal-press mt-5 flex w-full items-center justify-center gap-2 bg-paper px-4 py-2.5 font-display text-xs tracking-[0.2em] text-ink disabled:opacity-50"
        >
          <GoogleIcon /> CONTINUE WITH GOOGLE
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-teal/20" />
          <span className="font-mono text-[10px] text-teal/50">OR EMAIL</span>
          <div className="h-px flex-1 bg-teal/20" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cyberpunk_42"
                className="brutal-border-2 w-full bg-ink px-3 py-2 font-mono text-sm text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@neon.io"
              className="brutal-border-2 w-full bg-ink px-3 py-2 font-mono text-sm text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="brutal-border-2 w-full bg-ink px-3 py-2 font-mono text-sm text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
            />
          </Field>

          {error && <p className="font-mono text-[11px] text-[#ff0080]">! {error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="brutal-border brutal-shadow-sm brutal-press flex w-full items-center justify-center gap-2 bg-blue px-4 py-2.5 font-display text-xs tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "SIGN IN →" : "CREATE ACCOUNT →"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-4 w-full font-mono text-[11px] text-teal/70 hover:text-teal"
        >
          {mode === "signin"
            ? "&gt; no account yet? sign_up_"
            : "&gt; already have an account? sign_in_"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
        ▸ {label}
      </span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3.1.5 4.3 1.5l3.2-3.2C17.5 1.4 14.9.4 12 .4 7.4.4 3.5 3 1.5 6.7l3.7 2.9C6.2 6.9 8.9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.5l3.7 2.9c2.2-2 3.7-5 3.7-8.6z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4L1.5 6.7C.6 8.3.1 10.1.1 12s.5 3.7 1.4 5.3l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23.6c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-1.9-6.8-4.6L1.5 17.3C3.5 21 7.4 23.6 12 23.6z"
      />
    </svg>
  );
}
