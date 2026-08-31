import { useMemo, useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";
import { useEditor, newImage } from "@/store/editor";
import { PanelHeader } from "./TextPanel";

const ASSETS = [
  { name: "Doodle 1", src: "/illustrations/Doodle-1.svg", group: "Highlights" },
  { name: "Doodle 4", src: "/illustrations/Doodle-4.svg", group: "Highlights" },
  { name: "Arrow 1", src: "/illustrations/Arrow-1.svg", group: "Highlights" },
  { name: "Underline 1", src: "/illustrations/Underline-1.svg", group: "Highlights" },
  { name: "Donuts 1", src: "/illustrations/Donuts-1.svg", group: "Highlights" },
  { name: "Pointing Forward", src: "/illustrations/Pointing-Forward.svg", group: "Humaans" },
  { name: "Lab Coat", src: "/illustrations/Lab-Coat.png", group: "Humaans" },
  { name: "Jacket", src: "/illustrations/Jacket.svg", group: "Humaans" },
  { name: "Pointing Up", src: "/illustrations/Pointing-Up.png", group: "Humaans" },
] as const;

export function IllustrationsPanel() {
  const { add } = useEditor();
  const [group, setGroup] = useState<"All" | "Highlights" | "Humaans">("All");
  const assets = useMemo(
    () => (group === "All" ? ASSETS : ASSETS.filter((asset) => asset.group === group)),
    [group],
  );

  return (
    <div className="space-y-3">
      <PanelHeader title="Illustrations" />
      <div className="flex items-start gap-2 border border-teal/25 bg-surface p-2">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-teal" />
        <p className="font-mono text-[9px] leading-relaxed text-teal/65">
          CC0 library assets. Click an illustration to place it on the canvas.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(["All", "Highlights", "Humaans"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setGroup(item)}
            className={`border px-1 py-1.5 font-mono text-[9px] uppercase tracking-wide ${group === item ? "border-teal bg-blue-deep text-teal" : "border-teal/25 bg-surface text-teal/60 hover:border-teal/60"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset) => (
          <button
            key={asset.src}
            onClick={() => add(newImage(asset.src))}
            title={`Add ${asset.name}`}
            className="group brutal-border-2 brutal-press overflow-hidden bg-surface p-1 hover:border-teal"
          >
            <div className="grid h-24 place-items-center bg-paper p-2">
              <img
                src={asset.src}
                alt={asset.name}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </div>
            <span className="flex items-center gap-1 truncate px-1 py-1 font-mono text-[9px] text-teal/70">
              <ImagePlus className="size-3 shrink-0" />
              {asset.name}
            </span>
          </button>
        ))}
      </div>
      <p className="font-mono text-[8px] leading-relaxed text-teal/45">
        Illustrations: Highlights by Outdraw Design &amp; Humaans-style Flat Assets. Licensed CC0
        per supplied collection.
      </p>
    </div>
  );
}
