import { useState } from "react";
import { Wand2 } from "lucide-react";
import { useEditor, CANVAS_PRESETS } from "@/store/editor";
import { PanelHeader } from "./TextPanel";

export function SizePanel() {
  const { canvasW, canvasH, setCanvasSize, magicResize } = useEditor();
  const [w, setW] = useState(canvasW);
  const [h, setH] = useState(canvasH);
  const [magic, setMagic] = useState(true);
  const resize = (nw: number, nh: number) => (magic ? magicResize(nw, nh) : setCanvasSize(nw, nh));

  const apply = () => {
    const cw = Math.max(100, Math.min(8000, Math.round(w)));
    const ch = Math.max(100, Math.min(8000, Math.round(h)));
    resize(cw, ch);
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Canvas Size" />

      <button
        onClick={() => setMagic((v) => !v)}
        className={`brutal-border-2 brutal-press flex w-full items-center gap-2 px-2 py-2 text-left ${
          magic ? "border-teal bg-blue-deep text-teal glow-blue" : "bg-surface text-teal/70"
        }`}
      >
        <Wand2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[10px] uppercase tracking-[0.18em]">
            Magic resize {magic ? "on" : "off"}
          </span>
          <span className="block font-mono text-[9px] opacity-70">
            reflow every slide into the new ratio
          </span>
        </span>
      </button>

      <div>
        <div className="mb-2 font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CANVAS_PRESETS.map((p) => {
            const active = canvasW === p.w && canvasH === p.h;
            const max = 44;
            const ratio = p.w / p.h;
            const tw = ratio >= 1 ? max : max * ratio;
            const th = ratio >= 1 ? max / ratio : max;
            return (
              <button
                key={p.name}
                onClick={() => {
                  resize(p.w, p.h);
                  setW(p.w);
                  setH(p.h);
                }}
                className={`brutal-border-2 brutal-press flex flex-col items-center gap-1 p-2 ${
                  active
                    ? "bg-blue-deep text-teal border-teal glow-blue"
                    : "bg-surface text-teal/80 hover:border-teal hover:text-teal"
                }`}
              >
                <div className="grid h-12 w-full place-items-center">
                  <div className="border border-current" style={{ width: tw, height: th }} />
                </div>
                <span className="font-display text-[10px] uppercase tracking-wider">{p.name}</span>
                <span className="font-mono text-[9px] opacity-70">
                  {p.w}×{p.h}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Custom
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-teal/60">
              W
            </span>
            <input
              type="number"
              value={w}
              onChange={(e) => setW(+e.target.value)}
              className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-teal/60">
              H
            </span>
            <input
              type="number"
              value={h}
              onChange={(e) => setH(+e.target.value)}
              className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
            />
          </label>
        </div>
        <button
          onClick={apply}
          className="brutal-border brutal-press w-full bg-blue py-2 font-display text-xs uppercase tracking-[0.2em] text-ink"
        >
          ▸ Apply size
        </button>
      </div>
    </div>
  );
}
