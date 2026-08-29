import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, ImagePlus, X, Heart, Grid3x3 } from "lucide-react";
import {
  useEditor,
  newText,
  newShape,
  newIcon,
  DEFAULT_PAGE_DURATION,
  type AnyElement,
  type Page,
} from "@/store/editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelHeader } from "./TextPanel";
import {
  generateAiTemplate,
  type AiElementInput,
  type AiStyle,
} from "@/lib/ai-templates.functions";
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

function buildFromAi(els: AiElementInput[]): AnyElement[] {
  return els
    .map((e): AnyElement | null => {
      if (e.type === "text") {
        return newText({
          text: e.text,
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          fontSize: e.fontSize,
          color: e.color,
          fontFamily: e.fontFamily ?? "Archivo Black",
          fontWeight: e.fontWeight ?? 700,
          align: e.align ?? "left",
          italic: e.italic,
          underline: e.underline,
          bullet: e.bullet,
          href: e.href,
        });
      }
      if (e.type === "shape") {
        return newShape(e.shape, {
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          fill: e.fill,
          stroke: e.stroke,
          strokeWidth: e.strokeWidth,
          effect: e.effect,
          shadow: e.shadow,
        });
      }
      if (e.type === "icon") {
        return newIcon(e.name, {
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          color: e.color,
          strokeWidth: e.strokeWidth ?? 2,
        });
      }
      return null;
    })
    .filter((e): e is AnyElement => e !== null);
}

const STYLE_OPTIONS: { id: AiStyle; label: string }[] = [
  { id: "auto", label: "Auto (detect from prompt)" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "liquid_glass", label: "Liquid Glass" },
  { id: "minimal", label: "Minimal" },
  { id: "editorial", label: "Editorial" },
  { id: "brutalist", label: "Brutalist" },
  { id: "retro_80s", label: "Retro 80s" },
  { id: "organic", label: "Organic" },
  { id: "art_deco", label: "Art Deco" },
  { id: "memphis", label: "Memphis" },
  { id: "y2k", label: "Y2K" },
];

export function TemplatesPanel() {
  const { canvasW, canvasH } = useEditor();
  const generate = useServerFn(generateAiTemplate);
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const aiModel = useSettings((s) => s.aiModel);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<AiStyle>("auto");
  const [slideCount, setSlideCount] = useState(5);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
      if (isLiked) next.delete(id);
      else next.add(id);
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
        if (isLiked) next.add(id);
        else next.delete(id);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? 1 : -1)),
      }));
      setError(e instanceof Error ? e.message : "Like failed");
    }
  };

  const onPickImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB)");
      return;
    }
    const r = new FileReader();
    r.onload = () => setImageDataUrl(r.result as string);
    r.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if ((!prompt.trim() && !imageDataUrl) || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await generate({
        data: {
          prompt: prompt.trim() || "Use the attached image as the brief",
          width: canvasW,
          height: canvasH,
          style,
          imageDataUrl: imageDataUrl ?? undefined,
          slideCount,
          model: aiModel,
        },
      });
      const newPages: Page[] = res.pages.map((p) => ({
        id: Math.random().toString(36).slice(2, 10),
        bgColor: p.bg,
        elements: buildFromAi(p.elements),
        duration: DEFAULT_PAGE_DURATION,
      }));
      useEditor.getState().loadPages(newPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Templates" />

      {!aiEnabled ? (
        <div className="brutal-border-2 bg-surface p-3 font-mono text-[10px] text-teal/50">
          &gt; AI features are turned off in settings
        </div>
      ) : (
        <div className="brutal-border-2 space-y-2 bg-surface p-3">
          <div className="flex items-center gap-2 font-display text-[11px] tracking-[0.2em] text-teal">
            <Sparkles className="h-3.5 w-3.5" /> AI_GENERATOR
          </div>

          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as AiStyle)}
            className="w-full border border-teal/40 bg-ink px-2 py-1.5 font-mono text-[11px] text-teal focus:border-teal focus:outline-none"
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] text-teal/70">slides:</label>
            <input
              type="number"
              min={1}
              max={10}
              value={slideCount}
              onChange={(e) =>
                setSlideCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))
              }
              className="w-16 border border-teal/40 bg-ink px-2 py-1 font-mono text-[11px] text-teal focus:border-teal focus:outline-none"
            />
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. midnight rave poster · or leave blank if using image"
            rows={3}
            className="w-full resize-none border border-teal/40 bg-ink p-2 font-mono text-[11px] text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
          />

          {imageDataUrl ? (
            <div className="relative">
              <img
                src={imageDataUrl}
                alt="AI reference image preview"
                className="h-20 w-full border border-teal/40 object-cover"
              />
              <button
                onClick={() => setImageDataUrl(null)}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center bg-ink/90 text-teal hover:text-[#ff0080]"
                title="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-teal/40 bg-ink px-2 py-2 font-mono text-[10px] text-teal/70 hover:border-teal hover:text-teal"
            >
              <ImagePlus className="h-3.5 w-3.5" /> reference image (optional)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickImage(f);
              e.target.value = "";
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || (!prompt.trim() && !imageDataUrl)}
            className="brutal-border brutal-press flex w-full items-center justify-center gap-2 bg-blue px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "GENERATING..." : "GENERATE"}
          </button>
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
          &gt; no community templates yet. Be the first — sign in and click the share icon in the
          toolbar.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {sortTemplates(community, likeCounts, "likes")
            .slice(0, 8)
            .map((c) => (
              <div
                key={c.id}
                className="brutal-border-2 group relative overflow-hidden bg-surface text-left hover:border-teal"
              >
                <button
                  onClick={() => {
                    if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`))
                      return;
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
                      <div
                        style={{
                          aspectRatio: `${c.canvas_w} / ${c.canvas_h}`,
                          background: "#0a0f1f",
                        }}
                      />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(c.id);
                  }}
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
          <span className="font-mono text-[10px] uppercase tracking-wider text-teal/60">
            Sort by:
          </span>
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
                    if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`))
                      return;
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
                      <div
                        style={{
                          aspectRatio: `${c.canvas_w} / ${c.canvas_h}`,
                          background: "#0a0f1f",
                        }}
                      />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(c.id);
                  }}
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
