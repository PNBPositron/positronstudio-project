import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles, Wand2, X } from "lucide-react";
import { useEditor, newText, newShape, newIcon, type AnyElement, type Page } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import {
  askCohereAdvisor,
  editCurrentSlide,
  redesignSlideVariations,
  type AiElementInput,
  type AiPage,
} from "@/lib/ai-templates.functions";
import { SlideThumbnail } from "../SlideThumbnail";

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

// Convert current page elements back to AI shape for context
function toAi(els: AnyElement[]): AiElementInput[] {
  return els
    .map((e): AiElementInput | null => {
      if (e.type === "text")
        return {
          type: "text",
          text: e.text,
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          fontSize: e.fontSize,
          color: e.color,
          fontFamily: e.fontFamily,
          fontWeight: e.fontWeight,
          align: e.align,
          italic: e.italic,
          underline: e.underline,
          bullet: e.bullet,
          href: e.href,
        };
      if (e.type === "shape")
        return {
          type: "shape",
          shape: e.shape,
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          fill: e.fill,
          stroke: e.stroke,
          strokeWidth: e.strokeWidth,
          effect: e.effect,
          shadow: e.shadow,
        };
      if (e.type === "icon")
        return {
          type: "icon",
          name: e.name,
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          color: e.color,
          strokeWidth: e.strokeWidth,
        };
      return null;
    })
    .filter((x): x is AiElementInput => x !== null);
}

type ChatMsg = { role: "user" | "assistant"; text: string };

const QUICK_PROMPTS = [
  "Make the headline bigger and bolder",
  "Add a glowing accent shape behind the title",
  "Switch palette to deep purple + neon pink",
  "Add bullet points summarizing the slide",
  "Center align everything",
];

export function AiChatPanel() {
  const { elements, bgColor, canvasW, canvasH, loadTemplate } = useEditor();
  const edit = useServerFn(editCurrentSlide);
  const redesign = useServerFn(redesignSlideVariations);
  const askAdvisor = useServerFn(askCohereAdvisor);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<AiPage[] | null>(null);
  const [redesigning, setRedesigning] = useState(false);
  const [advisorInput, setAdvisorInput] = useState("");
  const [advisorMsgs, setAdvisorMsgs] = useState<ChatMsg[]>([]);
  const [advisorBusy, setAdvisorBusy] = useState(false);

  const askForAdvice = async () => {
    const prompt = advisorInput.trim();
    if (!prompt || advisorBusy) return;
    setAdvisorBusy(true);
    setAdvisorMsgs((m) => [...m, { role: "user", text: prompt }]);
    setAdvisorInput("");
    try {
      const res = await askAdvisor({
        data: {
          prompt,
          context: `Canvas ${canvasW}x${canvasH}, background ${bgColor}, ${elements.length} elements.`,
        },
      });
      setAdvisorMsgs((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e) {
      setAdvisorMsgs((m) => [
        ...m,
        { role: "assistant", text: e instanceof Error ? e.message : "Cohere could not answer." },
      ]);
    } finally {
      setAdvisorBusy(false);
    }
  };

  const run = async (prompt: string) => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    setMsgs((m) => [...m, { role: "user", text: prompt }]);
    setInput("");
    try {
      const res = await edit({
        data: {
          prompt,
          width: canvasW,
          height: canvasH,
          page: { bg: bgColor, elements: toAi(elements) },
        },
      });
      loadTemplate(buildFromAi(res.elements), res.bg);
      setMsgs((m) => [...m, { role: "assistant", text: "Done — slide updated." }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setBusy(false);
    }
  };

  const runRedesign = async () => {
    if (redesigning) return;
    setRedesigning(true);
    setError(null);
    try {
      const res = await redesign({
        data: {
          width: canvasW,
          height: canvasH,
          page: { bg: bgColor, elements: toAi(elements) },
          count: 3,
        },
      });
      setVariants(res.variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redesign failed");
    } finally {
      setRedesigning(false);
    }
  };

  const pickVariant = (v: AiPage) => {
    loadTemplate(buildFromAi(v.elements), v.bg);
    setVariants(null);
  };

  return (
    <div className="space-y-3">
      <PanelHeader title="AI Edit" />
      <p className="font-mono text-[10px] text-teal/60">
        &gt; Chat to edit the CURRENT slide. Restyle, add elements, rewrite copy.
      </p>

      <section className="brutal-border-2 bg-surface p-3" aria-labelledby="cohere-advisor-title">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="cohere-advisor-title"
            className="font-display text-[11px] tracking-[0.16em] text-teal"
          >
            COHERE ADVISOR
          </h2>
          <span className="border border-teal/40 px-1.5 py-0.5 font-mono text-[8px] text-teal/60">
            ADVICE ONLY
          </span>
        </div>
        <p className="mt-1 font-mono text-[9px] leading-relaxed text-teal/60">
          Ask for critique and design direction. Cohere cannot create or modify slides.
        </p>
        <div className="mt-2 max-h-44 min-h-16 overflow-y-auto border border-teal/20 bg-ink/5 p-2">
          {advisorMsgs.length === 0 ? (
            <p className="font-mono text-[10px] text-teal/45">&gt; ask Cohere about this slide_</p>
          ) : (
            advisorMsgs.map((m, i) => (
              <div
                key={i}
                className="mb-2 font-mono text-[10px] leading-relaxed text-teal last:mb-0"
              >
                <span className="opacity-50">{m.role === "user" ? "▸ you: " : "▹ cohere: "}</span>
                {m.text}
              </div>
            ))
          )}
          {advisorBusy && (
            <div className="font-mono text-[10px] text-teal/60">Cohere is thinking…</div>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <textarea
            value={advisorInput}
            onChange={(e) => setAdvisorInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.metaKey || e.ctrlKey) &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault();
                askForAdvice();
              }
            }}
            placeholder="How can I improve this slide?"
            rows={2}
            aria-label="Ask Cohere for advice"
            className="min-w-0 flex-1 resize-none border border-teal/40 bg-ink p-2 font-mono text-[10px] text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
          />
          <button
            onClick={askForAdvice}
            disabled={advisorBusy || !advisorInput.trim()}
            aria-label="Ask Cohere"
            className="brutal-border brutal-press self-end bg-blue px-3 py-2 text-ink disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </section>

      <button
        onClick={runRedesign}
        disabled={redesigning || busy}
        className="brutal-border-2 brutal-press flex w-full items-center justify-center gap-2 bg-[#ff0080] px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
      >
        {redesigning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wand2 className="h-3.5 w-3.5" strokeWidth={2.5} />
        )}
        {redesigning ? "REDESIGNING..." : "REDESIGN THIS SLIDE"}
      </button>
      <p className="font-mono text-[9px] text-teal/50">
        &gt; keeps every word — restyles layout & composition. pick a variation.
      </p>

      <div className="brutal-border-2 max-h-64 min-h-24 space-y-2 overflow-y-auto bg-surface p-2">
        {msgs.length === 0 ? (
          <p className="font-mono text-[10px] text-teal/40">&gt; no messages yet_</p>
        ) : (
          msgs.map((m, i) => (
            <div
              key={i}
              className={`font-mono text-[10px] ${
                m.role === "user" ? "text-teal" : "text-[#7df9ff]/80"
              }`}
            >
              <span className="opacity-50">{m.role === "user" ? "▸ you: " : "▹ ai:  "}</span>
              {m.text}
            </div>
          ))
        )}
        {busy && (
          <div className="flex items-center gap-1 font-mono text-[10px] text-teal/60">
            <Loader2 className="h-3 w-3 animate-spin" /> thinking…
          </div>
        )}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(input);
        }}
        placeholder="e.g. make headline neon green, add 3 bullet points…"
        rows={3}
        className="w-full resize-none border border-teal/40 bg-ink p-2 font-mono text-[11px] text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
      />
      <button
        onClick={() => run(input)}
        disabled={busy || !input.trim()}
        className="brutal-border brutal-press flex w-full items-center justify-center gap-2 bg-blue px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        {busy ? "EDITING..." : "APPLY EDIT"}
      </button>
      {error && <p className="font-mono text-[10px] text-[#ff0080]">! {error}</p>}

      <div className="space-y-1 pt-2">
        <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Quick prompts
        </div>
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            onClick={() => run(q)}
            disabled={busy}
            className="flex w-full items-center gap-2 border border-teal/30 bg-ink px-2 py-1.5 text-left font-mono text-[10px] text-teal/80 hover:border-teal hover:text-teal disabled:opacity-40"
          >
            <Sparkles className="h-3 w-3 shrink-0" /> {q}
          </button>
        ))}
      </div>

      {variants && (
        <VariationPicker
          variants={variants}
          canvasW={canvasW}
          canvasH={canvasH}
          onPick={pickVariant}
          onClose={() => setVariants(null)}
        />
      )}
    </div>
  );
}

function VariationPicker({
  variants,
  canvasW,
  canvasH,
  onPick,
  onClose,
}: {
  variants: AiPage[];
  canvasW: number;
  canvasH: number;
  onPick: (v: AiPage) => void;
  onClose: () => void;
}) {
  // Build a Page shape for the thumbnail preview.
  const asPage = (v: AiPage): Page => ({
    id: "preview",
    bgColor: v.bg,
    duration: 3,
    elements: buildFromAi(v.elements),
  });
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-6"
      onClick={onClose}
    >
      <div
        className="brutal-border-2 relative w-full max-w-6xl bg-ink p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center border-2 border-teal/40 text-teal hover:border-teal"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-1 font-display text-lg tracking-[0.2em] text-teal">▸ PICK A REDESIGN</h2>
        <p className="mb-4 font-mono text-[11px] text-teal/60">
          Same content, different layouts. Click one to apply.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {variants.map((v, i) => (
            <button
              key={i}
              onClick={() => onPick(v)}
              className="brutal-border-2 brutal-press group flex flex-col gap-2 bg-surface p-2 text-left hover:border-teal"
            >
              <SlideThumbnail
                page={asPage(v)}
                canvasW={canvasW}
                canvasH={canvasH}
                className="w-full"
              />
              <div className="flex items-center justify-between px-1 pb-1 font-display text-[11px] tracking-[0.2em] text-teal">
                <span>VARIATION {i + 1}</span>
                <span className="text-[10px] text-teal/60 group-hover:text-teal">APPLY →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
