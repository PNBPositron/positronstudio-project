import { useState } from "react";
import {
  useEditor,
  newImage,
  newShape,
  type ShapeKind,
} from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { Upload } from "lucide-react";
import { shapePathD } from "../ShapeRender";

const SHAPES: { kind: ShapeKind; label: string }[] = [
  { kind: "rect", label: "Rectangle" },
  { kind: "holographic_grid", label: "Holographic Grid" },
  { kind: "glitch", label: "Glitch Fragment" },
  { kind: "honeycomb", label: "Honeycomb Cell" },
  { kind: "circuit", label: "Circuit Traces" },
  { kind: "cyber_frame", label: "Cyber Frame" },
  { kind: "data_shard", label: "Data Shard" },
  { kind: "tech_chevron", label: "Tech Chevron" },
  { kind: "scanner", label: "Scanner Reticle" },
  { kind: "circle", label: "Circle" },
  { kind: "triangle", label: "Triangle" },
  { kind: "star", label: "Star" },
  { kind: "arrow", label: "Arrow" },
  { kind: "heart", label: "Heart" },
  { kind: "diamond", label: "Diamond" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "parallelogram", label: "Parallelogram" },
  { kind: "trapezoid", label: "Trapezoid" },
  { kind: "cross", label: "Cross" },
  { kind: "lightning", label: "Lightning" },
  { kind: "cloud", label: "Cloud" },
  { kind: "speech", label: "Speech" },
  { kind: "frame_cut", label: "Cut-corner Frame" },
  { kind: "diagonal_stripes", label: "Diagonal Stripes" },
  { kind: "dot_grid", label: "Dot Grid" },
  { kind: "dotted_triangle", label: "Dotted Triangle" },
  { kind: "accent_slash", label: "Accent Slash" },
];

const FILLS = ["#7df9ff", "#ff0080"];

const GRADIENTS: Array<{ from: string; to: string }> = [
  { from: "#7df9ff", to: "#4d7cff" },
  { from: "#ff0080", to: "#ffd84a" },
  { from: "#b16bff", to: "#ff6ec7" },
  { from: "#ccff00", to: "#00e5ff" },
];

export function ElementsPanel() {
  const { add } = useEditor();
  const [uploads, setUploads] = useState<string[]>([]);

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
      <PanelHeader title="Elements" />

      {/* Images Section */}
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
        ▸ Images
      </div>
      <label className="brutal-border brutal-press flex cursor-pointer flex-col items-center gap-2 bg-blue-deep p-4 text-teal glow-blue">
        <Upload className="h-6 w-6" strokeWidth={2.5} />
        <span className="font-display text-[11px] uppercase tracking-[0.2em]">▸ Upload image</span>
        <span className="font-mono text-[9px] text-teal/60">PNG · JPG · SVG</span>
        <input type="file" accept="image/*" multiple onChange={onFile} className="hidden" />
      </label>

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

      {/* Shapes Section */}
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
        ▸ Shapes
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SHAPES.flatMap((s) =>
          FILLS.map((fill) => (
            <button
              key={s.kind + fill}
              onClick={() =>
                add(
                  newShape(s.kind, {
                    fill,
                    stroke: fill === "#0a0f1f" ? "#7df9ff" : "#0a0f1f",
                  }),
                )
              }
              className="brutal-border-2 brutal-press grid h-20 place-items-center bg-surface hover:border-teal"
              title={s.label}
            >
              <ShapePreview kind={s.kind} fill={fill} />
            </button>
          )),
        )}
      </div>

      {/* Gradient Shapes Section */}
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
        ▸ Gradient shapes
      </div>
      <div className="grid grid-cols-4 gap-2">
        {GRADIENTS.map((g) =>
          (["rect", "circle"] as ShapeKind[]).map((kind) => (
            <button
              key={kind + g.from}
              onClick={() =>
                add(
                  newShape(kind, {
                    fill: g.from,
                    stroke: "transparent",
                    strokeWidth: 0,
                    cornerRadius: kind === "rect" ? 24 : 0,
                    gradient: { from: g.from, to: g.to, angle: 45, type: "linear" },
                  }),
                )
              }
              className="brutal-border-2 brutal-press h-14 bg-surface hover:border-teal"
              title={`Gradient ${kind}`}
              style={{
                background: `linear-gradient(45deg, ${g.from}, ${g.to})`,
                borderRadius: kind === "circle" ? 999 : undefined,
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}

function ShapePreview({ kind, fill }: { kind: ShapeKind; fill: string }) {
  const stroke = fill === "#0a0f1f" ? "#7df9ff" : "#0a0f1f";
  const sw = 3;
  if (kind === "rect")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <rect x="3" y="3" width="38" height="38" fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  if (kind === "circle")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="19" fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  if (kind === "triangle")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <polygon points="22,4 40,40 4,40" fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  if (kind === "star")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <polygon
          points="22,4 27,17 41,17 30,26 34,40 22,32 10,40 14,26 3,17 17,17"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    );
  if (kind === "arrow")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <polygon
          points="3,17 28,17 28,8 41,22 28,36 28,27 3,27"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    );
  const d = shapePathD(kind);
  if (!d) return null;
  return (
    <svg width="44" height="44" viewBox="0 0 100 100">
      <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}
