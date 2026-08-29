import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  useEditor,
  newImage,
  DEFAULT_PAGE_DURATION,
  type AnyElement,
  type Page,
  newText,
  newShape,
  newIcon,
} from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { Upload, Loader2, FileUp } from "lucide-react";
import {
  importTemplateFromFile,
  type AiElementInput,
  type AiStyle,
} from "@/lib/ai-templates.functions";
import { useSettings } from "@/store/settings";

const STYLE_OPTIONS: { id: AiStyle; label: string }[] = [
  { id: "auto", label: "Auto (match source)" },
  { id: "minimal", label: "Minimal" },
  { id: "editorial", label: "Editorial" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "liquid_glass", label: "Liquid Glass" },
  { id: "brutalist", label: "Brutalist" },
  { id: "retro_80s", label: "Retro 80s" },
  { id: "organic", label: "Organic" },
  { id: "art_deco", label: "Art Deco" },
  { id: "memphis", label: "Memphis" },
  { id: "y2k", label: "Y2K" },
];

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

export function UploadsPanel() {
  const { add, canvasW, canvasH } = useEditor();
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const [uploads, setUploads] = useState<string[]>([]);
  const importFn = useServerFn(importTemplateFromFile);
  const [style, setStyle] = useState<AiStyle>("auto");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importName, setImportName] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const onImportFile = (file: File) => {
    setImportError(null);
    const ok =
      file.type === "application/pdf" ||
      file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      /\.(pdf|pptx)$/i.test(file.name);
    if (!ok) {
      setImportError("Please choose a .pdf or .pptx file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImportError("File too large (max 15MB)");
      return;
    }
    setImportName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      setImporting(true);
      try {
        const res = await importFn({
          data: {
            fileDataUrl: reader.result as string,
            fileName: file.name,
            width: canvasW,
            height: canvasH,
            style,
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
        setImportError(e instanceof Error ? e.message : "Import failed");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        setUploads((u) => [src, ...u]);
      };
      reader.readAsDataURL(f);
    });
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Uploads" />
      <label className="brutal-border brutal-press flex cursor-pointer flex-col items-center gap-2 bg-blue-deep p-4 text-teal glow-blue">
        <Upload className="h-6 w-6" strokeWidth={2.5} />
        <span className="font-display text-[11px] uppercase tracking-[0.2em]">▸ Upload image</span>
        <span className="font-mono text-[9px] text-teal/60">PNG · JPG · SVG</span>
        <input type="file" accept="image/*" multiple onChange={onFile} className="hidden" />
      </label>

      {aiEnabled && (
        <div className="brutal-border-2 space-y-2 bg-surface p-3">
          <div className="flex items-center gap-2 font-display text-[11px] tracking-[0.2em] text-teal">
            <FileUp className="h-3.5 w-3.5" /> IMPORT_TEMPLATE
          </div>
          <p className="font-mono text-[10px] text-teal/60">
            &gt; upload a .pdf or .pptx · AI reads it &amp; rebuilds it as an editable deck
            (replaces current pages)
          </p>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as AiStyle)}
            disabled={importing}
            className="w-full border border-teal/40 bg-ink px-2 py-1.5 font-mono text-[11px] text-teal focus:border-teal focus:outline-none disabled:opacity-40"
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            ref={importRef}
            type="file"
            accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="brutal-border brutal-press flex w-full items-center justify-center gap-2 bg-blue px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="h-3.5 w-3.5" />
            )}
            {importing ? "ANALYZING..." : "CHOOSE PDF / PPTX"}
          </button>
          {importName && !importError && (
            <p className="truncate font-mono text-[10px] text-teal/60">▸ {importName}</p>
          )}
          {importError && <p className="font-mono text-[10px] text-[#ff0080]">! {importError}</p>}
        </div>
      )}

      {uploads.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {uploads.map((src, i) => (
            <button
              key={i}
              onClick={() => add(newImage(src))}
              className="brutal-border-2 brutal-press overflow-hidden bg-surface hover:border-teal"
            >
              <img src={src} alt="" className="h-24 w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : (
        <div className="brutal-border-2 bg-surface p-4 font-mono text-[11px] text-teal/50">
          &gt; no uploads in buffer
          <br />
          &gt; drop files above_
        </div>
      )}
    </div>
  );
}
