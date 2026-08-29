import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  useSettings,
  PANEL_LABELS,
  AI_MODELS,
  EDITOR_THEMES,
  springEasing,
  type PanelId,
} from "@/store/settings";
import { useAuth } from "@/hooks/use-auth";
import {
  listMyPublicTemplates,
  renamePublicTemplate,
  deletePublicTemplate,
  type PublicTemplate,
} from "@/lib/designs";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const {
    aiEnabled,
    setAiEnabled,
    aiModel,
    setAiModel,
    panels,
    togglePanel,
    resetPanels,
    panelDurationMs,
    setPanelDurationMs,
    panelStiffness,
    setPanelStiffness,
    reduceMotion,
    setReduceMotion,
    resetMotion,
    editorTheme,
    setEditorTheme,
  } = useSettings();
  const { user } = useAuth();
  const [motionOpen, setMotionOpen] = useState(false);
  const [templates, setTemplates] = useState<PublicTemplate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTemplates([]);
      return;
    }
    listMyPublicTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load templates"));
  }, [user]);

  const rename = async (t: PublicTemplate) => {
    const name = window.prompt("Template name", t.name);
    if (!name || name === t.name) return;
    setBusy(t.id);
    try {
      await renamePublicTemplate(t.id, name);
      setTemplates((list) => (list ?? []).map((x) => (x.id === t.id ? { ...x, name } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (t: PublicTemplate) => {
    if (!window.confirm(`Unpublish "${t.name}"? This removes it from the community.`)) return;
    setBusy(t.id);
    try {
      await deletePublicTemplate(t.id);
      setTemplates((list) => (list ?? []).filter((x) => x.id !== t.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/85 p-6"
      onClick={onClose}
    >
      <div
        className="brutal-border-2 relative my-6 w-full max-w-2xl bg-ink p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center border-2 border-teal/40 text-teal hover:border-teal"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-1 font-display text-lg tracking-[0.2em] text-teal">▸ SETTINGS</h2>
        <p className="mb-5 font-mono text-[11px] text-teal/60">
          preferences are stored on this device.
        </p>

        {/* AI toggle */}
        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-display text-[12px] tracking-[0.2em] text-teal">AI FEATURES</div>
              <p className="font-mono text-[10px] text-teal/60">
                &gt; generator, chat edit, redesign, translate, import
              </p>
            </div>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              role="switch"
              aria-checked={aiEnabled}
              className={`brutal-border brutal-press px-4 py-2 font-display text-[11px] tracking-[0.2em] ${
                aiEnabled ? "bg-blue text-ink" : "bg-surface-2 text-teal/70"
              }`}
            >
              {aiEnabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>
        </section>

        {/* AI model */}
        {aiEnabled && (
          <section className="brutal-border-2 mb-4 bg-surface p-4">
            <div className="mb-1 font-display text-[12px] tracking-[0.2em] text-teal">AI MODEL</div>
            <p className="mb-3 font-mono text-[10px] text-teal/60">
              &gt; used by the deck generator, chat edit and redesign
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AI_MODELS.map((m) => {
                const on = aiModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setAiModel(m.id)}
                    className={`border px-2 py-2 text-left transition-colors duration-150 ${
                      on
                        ? "border-teal bg-blue-deep text-teal"
                        : "border-teal/30 bg-ink text-teal/60 hover:border-teal/60"
                    }`}
                  >
                    <div className="font-display text-[11px] tracking-[0.15em]">
                      [{on ? "x" : " "}] {m.label}
                    </div>
                    <div className="font-mono text-[9px] opacity-70">{m.hint}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Panels */}
        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-display text-[12px] tracking-[0.2em] text-teal">
              VISIBLE PANELS
            </div>
            <button
              onClick={resetPanels}
              className="font-mono text-[10px] text-teal/60 underline hover:text-teal"
            >
              reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(PANEL_LABELS) as PanelId[]).map((id) => {
              const on = panels[id];
              const locked = id === "ai" && !aiEnabled;
              return (
                <button
                  key={id}
                  onClick={() => togglePanel(id)}
                  disabled={locked}
                  className={`border px-2 py-2 text-left font-mono text-[11px] ${
                    on && !locked
                      ? "border-teal bg-blue-deep text-teal"
                      : "border-teal/30 bg-ink text-teal/45"
                  } disabled:opacity-50`}
                >
                  [{on && !locked ? "x" : " "}] {PANEL_LABELS[id]}
                  {locked && <span className="block text-[9px] text-teal/40">ai off</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Panel motion */}
        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setMotionOpen((v) => !v)}
              aria-expanded={motionOpen}
              className="flex items-center gap-2 font-display text-[12px] tracking-[0.2em] text-teal"
            >
              {motionOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              PANEL MOTION
            </button>
            <button
              onClick={resetMotion}
              className="font-mono text-[10px] text-teal/60 underline hover:text-teal"
            >
              reset
            </button>
          </div>
          {motionOpen && (
            <>
              <p className="mb-3 font-mono text-[10px] text-teal/60">
                &gt; how the tool panel slides open and closed
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="font-mono text-[10px] text-teal/70">
                    duration · {panelDurationMs}ms
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1200}
                    step={20}
                    value={panelDurationMs}
                    disabled={reduceMotion}
                    onChange={(e) => setPanelDurationMs(+e.target.value)}
                    className="w-full accent-teal disabled:opacity-40"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] text-teal/70">
                    spring stiffness · {panelStiffness}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={panelStiffness}
                    disabled={reduceMotion}
                    onChange={(e) => setPanelStiffness(+e.target.value)}
                    className="w-full accent-teal disabled:opacity-40"
                  />
                </label>
                <div className="h-8 border border-teal/30 bg-ink" aria-hidden>
                  <div
                    key={`${panelDurationMs}-${panelStiffness}-${reduceMotion}`}
                    className="h-full w-1/3 bg-blue"
                    style={{
                      animation: reduceMotion
                        ? undefined
                        : `panel-motion-demo ${panelDurationMs}ms ${springEasing(panelStiffness)} both`,
                    }}
                  />
                </div>
                <button
                  onClick={() => setReduceMotion(!reduceMotion)}
                  role="switch"
                  aria-checked={reduceMotion}
                  className={`brutal-border brutal-press w-full px-4 py-2 font-display text-[11px] tracking-[0.2em] ${
                    reduceMotion ? "bg-blue text-ink" : "bg-surface-2 text-teal/70"
                  }`}
                >
                  REDUCED MOTION {reduceMotion ? "ON" : "OFF"}
                </button>
                <p className="font-mono text-[9px] text-teal/50">
                  &gt; motion is also disabled automatically when your system prefers reduced
                  motion.
                </p>
              </div>
            </>
          )}
        </section>

        {/* Editor theme */}
        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="mb-1 font-display text-[12px] tracking-[0.2em] text-teal">
            EDITOR THEME
          </div>
          <p className="mb-3 font-mono text-[10px] text-teal/60">
            &gt; skins the whole editor, same style packs as the components panel
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EDITOR_THEMES.map((t) => {
              const on = editorTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setEditorTheme(t.id)}
                  className={`border px-2 py-2 text-left transition-colors duration-150 ${
                    on
                      ? "border-teal bg-blue-deep text-teal"
                      : "border-teal/30 bg-ink text-teal/60 hover:border-teal/60"
                  }`}
                >
                  <div className="font-display text-[11px] tracking-[0.15em]">
                    [{on ? "x" : " "}] {t.label}
                  </div>
                  <div className="font-mono text-[9px] opacity-70">{t.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Published templates */}
        <section className="brutal-border-2 bg-surface p-4">
          <div className="mb-2 font-display text-[12px] tracking-[0.2em] text-teal">
            MY PUBLISHED TEMPLATES
          </div>
          {!user ? (
            <p className="font-mono text-[10px] text-teal/50">
              &gt; sign in to manage your templates
            </p>
          ) : templates === null ? (
            <div className="flex items-center gap-2 font-mono text-[10px] text-teal/60">
              <Loader2 className="h-3 w-3 animate-spin" /> loading…
            </div>
          ) : templates.length === 0 ? (
            <p className="font-mono text-[10px] text-teal/50">
              &gt; you haven't published any templates yet
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center gap-3 border border-teal/30 bg-ink p-2">
                  {t.thumbnail ? (
                    <img
                      src={t.thumbnail}
                      alt=""
                      className="h-10 w-16 border border-teal/30 object-cover"
                    />
                  ) : (
                    <div className="h-10 w-16 border border-teal/20 bg-surface-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[11px] tracking-[0.15em] text-teal">
                      {t.name}
                    </div>
                    <div className="font-mono text-[9px] text-teal/50">
                      {new Date(t.created_at).toLocaleDateString()} · {t.pages?.length ?? 0} slides
                    </div>
                  </div>
                  <button
                    onClick={() => rename(t)}
                    disabled={busy === t.id}
                    aria-label={`Rename ${t.name}`}
                    className="grid h-8 w-8 place-items-center border border-teal/40 text-teal hover:border-teal disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t)}
                    disabled={busy === t.id}
                    aria-label={`Unpublish ${t.name}`}
                    className="grid h-8 w-8 place-items-center border border-teal/40 text-[#ff0080] hover:border-[#ff0080] disabled:opacity-50"
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
          {error && <p className="mt-2 font-mono text-[10px] text-[#ff0080]">! {error}</p>}
        </section>
      </div>
    </div>
  );
}
