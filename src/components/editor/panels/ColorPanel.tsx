import { useRef } from "react";
import { useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ImagePlus, X } from "lucide-react";

const PALETTES: { name: string; colors: string[] }[] = [
  {
    name: "Cyber Ink",
    colors: ["#0a0f1f", "#101a2e", "#1a2742", "#0f3460", "#16213e", "#1b1b2f"],
  },
  {
    name: "Neon",
    colors: ["#7df9ff", "#00d9ff", "#0ea5e9", "#4d7cff", "#1f3fb8", "#a855f7"],
  },
  {
    name: "Hot",
    colors: ["#ff0080", "#ff4081", "#ff6b35", "#ffd84a", "#fbbf24", "#f97316"],
  },
  {
    name: "Acid",
    colors: ["#39ff14", "#84cc16", "#22c55e", "#10b981", "#06b6d4", "#14b8a6"],
  },
  {
    name: "Pastel",
    colors: ["#fef3c7", "#fce7f3", "#dbeafe", "#dcfce7", "#ede9fe", "#ffe4e6"],
  },
  {
    name: "Mono",
    colors: ["#000000", "#1f1f1f", "#404040", "#737373", "#d4d4d4", "#ffffff"],
  },
];

export function ColorPanel() {
  const { bgColor, setBg, pages, currentIndex, setBgImage } = useEditor();
  const page = pages[currentIndex];
  const bgImage = page.bgImage;
  const bgFit = page.bgFit ?? "cover";
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB)");
      return;
    }
    const r = new FileReader();
    r.onload = () => setBgImage(r.result as string, bgFit);
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Background" />

      <div className="brutal-border-2 space-y-2 bg-surface p-3">
        <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Background image
        </div>
        {bgImage ? (
          <div className="relative">
            <img
              src={bgImage}
              alt="Background image preview"
              className="h-20 w-full border border-teal/40 object-cover"
            />
            <button
              onClick={() => setBgImage(undefined)}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center bg-ink/90 text-teal hover:text-[#ff0080]"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 border border-dashed border-teal/40 bg-ink px-2 py-2 font-mono text-[10px] text-teal/70 hover:border-teal hover:text-teal"
          >
            <ImagePlus className="h-3.5 w-3.5" /> upload image
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
        <input
          type="url"
          placeholder="…or paste image URL"
          defaultValue={bgImage?.startsWith("http") ? bgImage : ""}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) setBgImage(v, bgFit);
          }}
          className="w-full border border-teal/40 bg-ink px-2 py-1.5 font-mono text-[10px] text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
        />
        {bgImage && (
          <div className="flex gap-1">
            {(["cover", "contain"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setBgImage(bgImage, f)}
                className={`brutal-border-2 flex-1 py-1 font-mono text-[10px] uppercase ${
                  bgFit === f
                    ? "bg-blue text-ink border-teal"
                    : "bg-surface text-teal hover:border-teal"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {PALETTES.map((p) => (
        <div key={p.name}>
          <label className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
            ▸ {p.name}
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {p.colors.map((c) => (
              <button
                key={c}
                onClick={() => setBg(c)}
                title={c}
                className={`brutal-border-2 h-9 transition-all ${
                  bgColor === c ? "border-teal scale-110 glow-teal" : "hover:border-teal"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      ))}

      <div>
        <label className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Custom
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBg(e.target.value)}
            className="brutal-border-2 h-12 w-16 bg-surface"
          />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => setBg(e.target.value)}
            className="brutal-border-2 h-12 flex-1 bg-surface px-2 font-mono text-xs text-teal focus:border-teal focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
