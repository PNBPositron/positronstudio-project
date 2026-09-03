import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, Heart, Grid3x3, ArrowLeft } from "lucide-react";
import { useEditor, type Page } from "@/store/editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelHeader } from "./TextPanel";
import { generateDeckCopy, type DeckCopy } from "@/lib/ai-templates.functions";
import {
  buildPagesFromCopy,
  buildPagesFromTemplate,
  COPY_PALETTES,
} from "@/lib/deck-copy";
import { SUGGESTIONS, type LayoutId } from "@/lib/designer";
import {
  listPublicTemplates,
  listTemplateLikeCounts,
  listMyLikedTemplateIds,
  likeTemplate,
  unlikeTemplate,
  type PublicTemplate,
} from "@/lib/designs";
import { SlideThumbnail } from "../SlideThumbnail";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/hooks/use-auth";

type LayoutChoice =
  | { kind: "layout"; id: LayoutId; label: string; hint: string }
  | { kind: "template"; id: string; label: string; hint: string; template: PublicTemplate };


export function TemplatesPanel() {
  const { canvasW, canvasH } = useEditor();
  const genCopy = useServerFn(generateDeckCopy);
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [copy, setCopy] = useState<DeckCopy | null>(null);
  const [paletteId, setPaletteId] = useState(COPY_PALETTES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<PublicTemplate[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<"likes" | "recent">("likes");

  useEffect(() => {
    setCommunityLoading(true);
    listPublicTemplates()
      .then(async (tpls) => {
        setCommunity(tpls);
        const ids = tpls.map((t) => t.id);
        const [counts, mine] = await Promise.all([
          listTemplateLikeCounts(ids),
          listMyLikedTemplateIds().catch(() => new Set<string>()),
        ]);
        setLikeCounts(counts);
        setLikedIds(mine);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setCommunityLoading(false));
  }, [user?.id]);

  const toggleLike = async (id: string) => {
    if (!user) {
      setError("Sign in to like templates");
      return;
    }
    const isLiked = likedIds.has(id);
    // optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(id); else next.add(id);
      return next;
    });
    setLikeCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? -1 : 1)) }));
    try {
      if (isLiked) await unlikeTemplate(id);
      else await likeTemplate(id);
    } catch (e) {
      // revert
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(id); else next.delete(id);
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? 1 : -1)) }));
      setError(e instanceof Error ? e.message : "Like failed");
    }
  };

  const palette =
    COPY_PALETTES.find((p) => p.id === paletteId)?.palette ?? COPY_PALETTES[0].palette;

  const choices: LayoutChoice[] = useMemo(
    () => [
      ...SUGGESTIONS.map(
        (s): LayoutChoice => ({ kind: "layout", id: s.id, label: s.label, hint: s.hint }),
      ),
      ...community.slice(0, 6).map(
        (t): LayoutChoice => ({
          kind: "template",
          id: t.id,
          label: t.name,
          hint: "community layout",
          template: t,
        }),
      ),
    ],
    [community],
  );

  const previews = useMemo(() => {
    if (!copy) return [] as Array<{ choice: LayoutChoice; pages: Page[] }>;
    return choices
      .map((choice) => ({
        choice,
        pages:
          choice.kind === "layout"
            ? buildPagesFromCopy(copy, choice.id, canvasW, canvasH, palette)
            : buildPagesFromTemplate(copy, choice.template.pages as Page[], canvasW, canvasH),
      }))
      .filter((p) => p.pages.length > 0);
  }, [copy, choices, canvasW, canvasH, palette]);

  const handleGenerateCopy = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await genCopy({ data: { prompt: prompt.trim(), slideCount } });
      setCopy(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy generation failed");
    } finally {
      setLoading(false);
    }
  };

  const applyChoice = (pages: Page[], choice: LayoutChoice) => {
    if (!window.confirm("Apply this layout — this replaces your current pages.")) return;
    if (choice.kind === "template") {
      useEditor.getState().setCanvasSize(choice.template.canvas_w, choice.template.canvas_h);
    }
    useEditor.getState().loadPages(pages);
    setCopy(null);
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Templates" />

      {!aiEnabled ? (
        <div className="brutal-border-2 bg-surface p-3 font-mono text-[10px] text-teal/50">
          &gt; AI features are turned off in settings
        </div>
      ) : !copy ? (
        <div className="brutal-border-2 space-y-2 bg-surface p-3">
          <div className="flex items-center gap-2 font-display text-[11px] tracking-[0.2em] text-teal">
            <Sparkles className="h-3.5 w-3.5" /> AI_COPYWRITER
          </div>
          <p className="font-mono text-[10px] text-teal/60">
            &gt; step 1 · write the words · step 2 · pick a layout
          </p>

          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] text-teal/70">slides:</label>
            <input
              type="number"
              min={2}
              max={12}
              value={slideCount}
              onChange={(e) => setSlideCount(Math.max(2, Math.min(12, parseInt(e.target.value) || 5)))}
              className="w-16 border border-teal/40 bg-ink px-2 py-1 font-mono text-[11px] text-teal focus:border-teal focus:outline-none"
            />
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. pitch deck for a solar rooftop startup"
            rows={3}
            className="w-full resize-none border border-teal/40 bg-ink p-2 font-mono text-[11px] text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
          />

          <button
            onClick={handleGenerateCopy}
            disabled={loading || !prompt.trim()}
            className="brutal-border brutal-press flex w-full items-center justify-center gap-2 bg-blue px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? "WRITING..." : "GENERATE COPY"}
          </button>
          {error && <p className="font-mono text-[10px] text-[#ff0080]">! {error}</p>}
        </div>
      ) : (
        <div className="brutal-border-2 space-y-3 bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-display text-[11px] tracking-[0.2em] text-teal">
                {copy.deckTitle}
              </div>
              <div className="font-mono text-[9px] text-teal/60">
                {copy.slides.length} slides · pick a layout
              </div>
            </div>
            <button
              onClick={() => setCopy(null)}
              className="flex items-center gap-1 border border-teal/40 px-2 py-1 font-mono text-[10px] text-teal hover:border-teal"
            >
              <ArrowLeft className="h-3 w-3" /> back
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-teal/60">palette:</span>
            {COPY_PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPaletteId(p.id)}
                className={`border px-2 py-1 font-mono text-[9px] ${
                  paletteId === p.id ? "border-teal text-teal" : "border-teal/30 text-teal/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {previews.map(({ choice, pages }) => (
              <button
                key={`${choice.kind}-${choice.id}`}
                onClick={() => applyChoice(pages, choice)}
                className="brutal-border-2 overflow-hidden bg-ink text-left hover:border-teal"
                title={`Use ${choice.label}`}
              >
                <SlideThumbnail
                  page={pages[Math.min(1, pages.length - 1)]}
                  canvasW={choice.kind === "template" ? choice.template.canvas_w : canvasW}
                  canvasH={choice.kind === "template" ? choice.template.canvas_h : canvasH}
                  className="w-full border-b border-teal/30"
                />
                <div className="truncate px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-teal">
                  {choice.label}
                </div>
                <div className="truncate px-2 pb-1 font-mono text-[9px] text-teal/50">
                  {choice.hint}
                </div>
              </button>
            ))}
          </div>

          <details className="border border-teal/25 bg-ink p-2">
            <summary className="cursor-pointer font-mono text-[10px] text-teal/70">
              review copy
            </summary>
            <ul className="mt-2 space-y-2">
              {copy.slides.map((s, i) => (
                <li key={i} className="font-mono text-[9px] text-teal/70">
                  <span className="text-teal">{i + 1}. {s.title}</span>
                  {s.bullets.length > 0 && (
                    <ul className="ml-3 list-disc text-teal/50">
                      {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </details>
          {error && <p className="font-mono text-[10px] text-[#ff0080]">! {error}</p>}
        </div>
      )}


      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
        ▸ Top community templates
      </div>

      {communityLoading ? (
        <div className="flex items-center gap-2 font-mono text-[11px] text-teal/70">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
        </div>
      ) : community.length === 0 ? (
        <p className="font-mono text-[10px] text-teal/50">
          &gt; no community templates yet. Be the first — sign in and click the share icon in the toolbar.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {sortTemplates(community, likeCounts, "likes").slice(0, 8).map((c) => (
            <div
              key={c.id}
              className="brutal-border-2 group relative overflow-hidden bg-surface text-left hover:border-teal"
            >
              <button
                onClick={() => {
                  if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`)) return;
                  useEditor.getState().loadPages(c.pages as Page[]);
                  useEditor.getState().setCanvasSize(c.canvas_w, c.canvas_h);
                }}
                className="block w-full text-left"
                title={`Load ${c.name}`}
              >
                <div className="w-full border-b border-teal/30">
                  {c.pages?.[0] ? (
                    <SlideThumbnail
                      page={c.pages[0] as Page}
                      canvasW={c.canvas_w}
                      canvasH={c.canvas_h}
                      className="w-full"
                    />
                  ) : (
                    <div style={{ aspectRatio: `${c.canvas_w} / ${c.canvas_h}`, background: "#0a0f1f" }} />
                  )}
                </div>
                <div className="bg-ink px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-teal truncate">
                  {c.name}
                </div>
                <div className="bg-ink px-2 pb-1 font-mono text-[9px] text-teal/50">
                  {c.pages?.length ?? 0} slides
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(c.id); }}
                disabled={!user}
                title={user ? (likedIds.has(c.id) ? "Unlike" : "Like") : "Sign in to like"}
                className={`absolute right-1.5 top-1.5 flex items-center gap-1 border bg-ink/85 px-1.5 py-0.5 font-mono text-[10px] backdrop-blur transition ${
                  likedIds.has(c.id)
                    ? "border-[#ff0080] text-[#ff0080]"
                    : "border-teal/40 text-teal/80 hover:border-teal hover:text-teal"
                } ${!user ? "opacity-60" : ""}`}
              >
                <Heart
                  className="h-3 w-3"
                  fill={likedIds.has(c.id) ? "currentColor" : "none"}
                  strokeWidth={2}
                />
                {likeCounts[c.id] ?? 0}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAll(true)}
        disabled={community.length === 0}
        className="brutal-border-2 brutal-press flex w-full items-center justify-center gap-2 bg-surface px-3 py-2 font-display text-[11px] tracking-[0.2em] text-teal hover:border-teal disabled:opacity-40"
      >
        <Grid3x3 className="h-3.5 w-3.5" /> SHOW ALL TEMPLATES
      </button>

      <AllTemplatesDialog
        open={showAll}
        onOpenChange={setShowAll}
        templates={community}
        likeCounts={likeCounts}
        likedIds={likedIds}
        toggleLike={toggleLike}
        canLike={!!user}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
    </div>
  );
}

function sortTemplates(
  tpls: PublicTemplate[],
  likes: Record<string, number>,
  sortBy: "likes" | "recent",
): PublicTemplate[] {
  const arr = [...tpls];
  if (sortBy === "likes") {
    arr.sort((a, b) => (likes[b.id] ?? 0) - (likes[a.id] ?? 0));
  } else {
    arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return arr;
}

function AllTemplatesDialog({
  open,
  onOpenChange,
  templates,
  likeCounts,
  likedIds,
  toggleLike,
  canLike,
  sortBy,
  setSortBy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: PublicTemplate[];
  likeCounts: Record<string, number>;
  likedIds: Set<string>;
  toggleLike: (id: string) => void;
  canLike: boolean;
  sortBy: "likes" | "recent";
  setSortBy: (s: "likes" | "recent") => void;
}) {
  const sorted = sortTemplates(templates, likeCounts, sortBy);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden border-teal bg-paper p-0 flex flex-col">
        <DialogHeader className="border-b border-teal/30 bg-ink px-5 py-3">
          <DialogTitle className="font-display text-sm uppercase tracking-[0.25em] text-teal">
            ▌ All community templates · {templates.length}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-teal/20 bg-surface px-5 py-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-teal/60">Sort by:</span>
          {(["likes", "recent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`brutal-border-2 px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                sortBy === s ? "bg-blue text-ink border-teal" : "bg-ink text-teal hover:border-teal"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((c) => (
              <div
                key={c.id}
                className="brutal-border-2 group relative overflow-hidden bg-surface hover:border-teal"
              >
                <button
                  onClick={() => {
                    if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`)) return;
                    useEditor.getState().loadPages(c.pages as Page[]);
                    useEditor.getState().setCanvasSize(c.canvas_w, c.canvas_h);
                    onOpenChange(false);
                  }}
                  className="block w-full text-left"
                  title={`Load ${c.name}`}
                >
                  <div className="w-full border-b border-teal/30">
                    {c.pages?.[0] ? (
                      <SlideThumbnail
                        page={c.pages[0] as Page}
                        canvasW={c.canvas_w}
                        canvasH={c.canvas_h}
                        className="w-full"
                      />
                    ) : (
                      <div style={{ aspectRatio: `${c.canvas_w} / ${c.canvas_h}`, background: "#0a0f1f" }} />
                    )}
                  </div>
                  <div className="bg-ink px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-teal truncate">
                    {c.name}
                  </div>
                  <div className="bg-ink px-2 pb-1 font-mono text-[9px] text-teal/50">
                    {c.pages?.length ?? 0} slides
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(c.id); }}
                  disabled={!canLike}
                  title={canLike ? (likedIds.has(c.id) ? "Unlike" : "Like") : "Sign in to like"}
                  className={`absolute right-1.5 top-1.5 flex items-center gap-1 border bg-ink/85 px-1.5 py-0.5 font-mono text-[10px] backdrop-blur transition ${
                    likedIds.has(c.id)
                      ? "border-[#ff0080] text-[#ff0080]"
                      : "border-teal/40 text-teal/80 hover:border-teal hover:text-teal"
                  } ${!canLike ? "opacity-60" : ""}`}
                >
                  <Heart
                    className="h-3 w-3"
                    fill={likedIds.has(c.id) ? "currentColor" : "none"}
                    strokeWidth={2}
                  />
                  {likeCounts[c.id] ?? 0}
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
