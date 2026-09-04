import { useEditor, newShape, type ShapeKind } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { shapePathD } from "../ShapeRender";

const SHAPES: { kind: ShapeKind; label: string }[] = [
  { kind: "rect", label: "Rectangle" },
  { kind: "holographic_grid", label: "Holographic Grid" },
  { kind: "glitch", label: "Glitch" },
  { kind: "honeycomb", label: "Honeycomb" },
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
];

const FILLS = ["#7df9ff", "#ff0080"];

const GRADIENTS: Array<{ from: string; to: string }> = [
  { from: "#7df9ff", to: "#4d7cff" },
  { from: "#ff0080", to: "#ffd84a" },
  { from: "#b16bff", to: "#ff6ec7" },
  { from: "#ccff00", to: "#00e5ff" },
];

export function ShapesPanel() {
  const { add } = useEditor();

  return (
    <div className="space-y-4">
      <PanelHeader title="Shapes" />

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Shapes</div>
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

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Gradient shapes</div>
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
