import { useEffect, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/hooks/use-auth";
import {
  CUSTOM_THEME_PREFIX,
  DEFAULT_THEME_TOKENS,
  THEME_TOKEN_FIELDS,
  deletePublicTheme,
  listMyPublicThemes,
  publishTheme,
  type PublicTheme,
  type ThemeTokens,
} from "@/lib/themes";

export function ThemeStudio() {
  const { user } = useAuth();
  const { customThemes, addCustomTheme, removeCustomTheme, editorTheme, setEditorTheme } =
    useSettings();
  const [tokens, setTokens] = useState<ThemeTokens>({ ...DEFAULT_THEME_TOKENS });
  const [name, setName] = useState("My theme");
  const [mine, setMine] = useState<PublicTheme[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMine([]);
      return;
    }
    listMyPublicThemes()
      .then(setMine)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load themes"));
  }, [user]);

  const set = (key: keyof ThemeTokens, value: string) =>
    setTokens((t) => ({ ...t, [key]: value }));

  const saveLocal = () => {
    const id = `local-${Date.now().toString(36)}`;
    addCustomTheme({ id, name: name.trim() || "My theme", tokens });
    setEditorTheme(`${CUSTOM_THEME_PREFIX}${id}`);
    setNote("saved to this device and applied");
  };

  const publish = async () => {
    setBusy("publish");
    setError(null);
    try {
      const t = await publishTheme(name.trim() || "My theme", tokens);
      setMine((list) => [t, ...(list ?? [])]);
      addCustomTheme({ id: t.id, name: t.name, tokens: t.tokens });
      setEditorTheme(`${CUSTOM_THEME_PREFIX}${t.id}`);
      setNote("published to the marketplace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async (t: PublicTheme) => {
    if (!window.confirm(`Unpublish "${t.name}"?`)) return;
    setBusy(t.id);
    try {
      await deletePublicTheme(t.id);
      setMine((list) => (list ?? []).filter((x) => x.id !== t.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="brutal-border-2 mb-4 bg-surface p-4">
      <div className="mb-1 font-display text-[12px] tracking-[0.2em] text-teal">THEME STUDIO</div>
      <p className="mb-3 font-mono text-[10px] text-teal/60">
        &gt; pick your nine tokens, save locally, or publish to the marketplace
      </p>

      <label className="mb-3 block">
        <span className="font-mono text-[10px] text-teal/70">theme name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full border border-teal/40 bg-ink px-2 py-1.5 font-mono text-[11px] text-teal outline-none focus:border-teal"
        />
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {THEME_TOKEN_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 border border-teal/25 bg-ink p-1.5">
            <input
              type="color"
              value={tokens[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              aria-label={f.label}
              className="h-7 w-8 shrink-0 cursor-pointer border border-teal/30 bg-transparent"
            />
            <span className="min-w-0 truncate font-mono text-[9px] text-teal/70">{f.label}</span>
          </label>
        ))}
      </div>

      {/* Live preview */}
      <div
        className="mt-3 border p-3"
        style={{ background: tokens.paper, borderColor: tokens.grid }}
        aria-label="Theme preview"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 border" style={{ background: tokens.ink, borderColor: tokens.grid }} />
          <div className="flex-1">
            <div className="font-display text-[11px] tracking-[0.18em]" style={{ color: tokens.teal }}>
              PREVIEW
            </div>
            <div className="font-mono text-[9px]" style={{ color: tokens.tealDeep }}>
              &gt; surfaces, accent and text
            </div>
          </div>
          <span
            className="px-2 py-1 font-display text-[10px] tracking-[0.15em]"
            style={{ background: tokens.blue, color: tokens.ink }}
          >
            ACCENT
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="h-6 flex-1" style={{ background: tokens.surface }} />
          <div className="h-6 flex-1" style={{ background: tokens.surface2 }} />
          <div className="h-6 flex-1" style={{ background: tokens.blueDeep }} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={saveLocal}
          className="brutal-border brutal-press bg-surface-2 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-teal"
        >
          SAVE LOCALLY
        </button>
        <button
          onClick={publish}
          disabled={!user || busy === "publish"}
          className="brutal-border brutal-press flex items-center gap-2 bg-blue px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
        >
          {busy === "publish" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          PUBLISH
        </button>
        <button
          onClick={() => setTokens({ ...DEFAULT_THEME_TOKENS })}
          className="font-mono text-[10px] text-teal/60 underline hover:text-teal"
        >
          reset tokens
        </button>
      </div>
      {!user && (
        <p className="mt-2 font-mono text-[10px] text-teal/50">&gt; sign in to publish themes</p>
      )}
      {note && <p className="mt-2 font-mono text-[10px] text-teal/70">&gt; {note}</p>}
      {error && <p className="mt-2 font-mono text-[10px] text-[#ff0080]">! {error}</p>}

      {/* Saved on this device */}
      {customThemes.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 font-display text-[11px] tracking-[0.2em] text-teal">
            SAVED ON THIS DEVICE
          </div>
          <ul className="space-y-1.5">
            {customThemes.map((t) => {
              const on = editorTheme === `${CUSTOM_THEME_PREFIX}${t.id}`;
              return (
                <li key={t.id} className="flex items-center gap-2 border border-teal/25 bg-ink p-2">
                  <span className="flex gap-1">
                    {[t.tokens.ink, t.tokens.surface, t.tokens.teal, t.tokens.blue].map((c, i) => (
                      <span key={i} className="h-4 w-4 border border-teal/20" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-teal/80">
                    {t.name}
                  </span>
                  <button
                    onClick={() => setEditorTheme(`${CUSTOM_THEME_PREFIX}${t.id}`)}
                    className="border border-teal/40 px-2 py-1 font-mono text-[9px] text-teal hover:border-teal"
                  >
                    {on ? "active" : "apply"}
                  </button>
                  <button
                    onClick={() => removeCustomTheme(t.id)}
                    aria-label={`Remove ${t.name}`}
                    className="grid h-7 w-7 place-items-center border border-teal/40 text-[#ff0080] hover:border-[#ff0080]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Published themes */}
      <div className="mt-4">
        <div className="mb-2 font-display text-[11px] tracking-[0.2em] text-teal">
          MY PUBLISHED THEMES
        </div>
        {!user ? (
          <p className="font-mono text-[10px] text-teal/50">&gt; sign in to manage your themes</p>
        ) : mine === null ? (
          <div className="flex items-center gap-2 font-mono text-[10px] text-teal/60">
            <Loader2 className="h-3 w-3 animate-spin" /> loading…
          </div>
        ) : mine.length === 0 ? (
          <p className="font-mono text-[10px] text-teal/50">&gt; nothing published yet</p>
        ) : (
          <ul className="space-y-1.5">
            {mine.map((t) => (
              <li key={t.id} className="flex items-center gap-2 border border-teal/25 bg-ink p-2">
                <span className="flex gap-1">
                  {[t.tokens.ink, t.tokens.surface, t.tokens.teal, t.tokens.blue].map((c, i) => (
                    <span key={i} className="h-4 w-4 border border-teal/20" style={{ background: c }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-teal/80">
                  {t.name}
                </span>
                <button
                  onClick={() => unpublish(t)}
                  disabled={busy === t.id}
                  aria-label={`Unpublish ${t.name}`}
                  className="grid h-7 w-7 place-items-center border border-teal/40 text-[#ff0080] hover:border-[#ff0080] disabled:opacity-50"
                >
                  {busy === t.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
