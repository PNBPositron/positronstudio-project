import type { ShapeElement, ShapeKind } from "@/store/editor";

// Reusable path generators (normalized 0-100 viewBox) so previews and canvas share geometry.
function pathFor(kind: ShapeKind): string | null {
  switch (kind) {
    case "heart":
      return "M50 88 C 18 66, 6 44, 18 26 C 28 12, 44 14, 50 28 C 56 14, 72 12, 82 26 C 94 44, 82 66, 50 88 Z";
    case "diamond":
      return "M50 4 L 96 50 L 50 96 L 4 50 Z";
    case "hexagon":
      return "M25 6 L 75 6 L 96 50 L 75 94 L 25 94 L 4 50 Z";
    case "pentagon":
      return "M50 4 L 96 38 L 78 94 L 22 94 L 4 38 Z";
    case "parallelogram":
      return "M22 8 L 96 8 L 78 92 L 4 92 Z";
    case "trapezoid":
      return "M22 8 L 78 8 L 96 92 L 4 92 Z";
    case "cross":
      return "M38 4 L 62 4 L 62 38 L 96 38 L 96 62 L 62 62 L 62 96 L 38 96 L 38 62 L 4 62 L 4 38 L 38 38 Z";
    case "lightning":
      return "M58 4 L 18 56 L 44 56 L 36 96 L 82 40 L 54 40 L 64 4 Z";
    case "cloud":
      return "M22 72 C 4 72, 4 46, 22 46 C 22 28, 48 22, 54 38 C 64 26, 84 32, 84 50 C 96 50, 96 72, 84 72 Z";
    case "speech":
      return "M8 14 L 92 14 L 92 70 L 50 70 L 30 92 L 32 70 L 8 70 Z";
    default:
      return null;
  }
}

export function shapePathD(kind: ShapeKind): string | null {
  return pathFor(kind);
}

export function ShapeRender({ element }: { element: ShapeElement }) {
  const { shape, fill, stroke, strokeWidth, width, height, gradient, cornerRadius } = element;
  const gradId = `g-${element.id}`;
  const fillRef = gradient ? `url(#${gradId})` : fill;
  const defs = gradient ? (
    <defs>
      {(gradient.type ?? "linear") === "radial" ? (
        <radialGradient id={gradId} gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0%" stopColor={gradient.from} />
          <stop offset="100%" stopColor={gradient.to} />
        </radialGradient>
      ) : (
        <linearGradient
          id={gradId}
          gradientUnits="objectBoundingBox"
          x1="0"
          y1="0"
          x2={Math.cos((gradient.angle * Math.PI) / 180)}
          y2={Math.sin((gradient.angle * Math.PI) / 180)}
        >
          <stop offset="0%" stopColor={gradient.from} />
          <stop offset="100%" stopColor={gradient.to} />
        </linearGradient>
      )}
    </defs>
  ) : null;
  const dash =
    element.strokeStyle === "dashed"
      ? `${Math.max(6, strokeWidth * 3)} ${Math.max(4, strokeWidth * 2)}`
      : element.strokeStyle === "dotted"
        ? `0.1 ${Math.max(4, strokeWidth * 2.2)}`
        : undefined;
  const common = {
    width: "100%",
    height: "100%",
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none" as const,
    strokeDasharray: dash,
    strokeLinecap: element.strokeStyle === "dotted" ? ("round" as const) : undefined,
    style: { opacity: element.opacity ?? 1 },
  };
  if (shape === "rect") {
    const r = Math.max(0, cornerRadius ?? 0);
    return (
      <svg {...common}>
        {defs}
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={width - strokeWidth}
          height={height - strokeWidth}
          rx={r}
          ry={r}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }
  if (shape === "circle") {
    return (
      <svg {...common}>
        {defs}
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2 - strokeWidth / 2}
          ry={height / 2 - strokeWidth / 2}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }
  if (shape === "triangle") {
    return (
      <svg {...common}>
        {defs}
        <polygon
          points={`${width / 2},${strokeWidth} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  if (shape === "star") {
    const cx = width / 2,
      cy = height / 2;
    const rO = Math.min(width, height) / 2 - strokeWidth;
    const rI = rO * 0.45;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rO : rI;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    return (
      <svg {...common}>
        {defs}
        <polygon
          points={pts.join(" ")}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  if (shape === "arrow") {
    const h = height;
    const w = width;
    const tail = h * 0.3;
    const headW = w * 0.35;
    return (
      <svg {...common}>
        {defs}
        <polygon
          points={`${strokeWidth},${h / 2 - tail / 2} ${w - headW},${h / 2 - tail / 2} ${w - headW},${strokeWidth} ${w - strokeWidth},${h / 2} ${w - headW},${h - strokeWidth} ${w - headW},${h / 2 + tail / 2} ${strokeWidth},${h / 2 + tail / 2}`}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  const d = pathFor(shape);
  if (d) {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        strokeDasharray={dash}
        style={{ opacity: element.opacity ?? 1 }}
      >
        {defs}
        <path
          d={d}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth / 2}
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  return null;
}
