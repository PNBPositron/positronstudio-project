import { useMemo, useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";
import { useEditor, newImage } from "@/store/editor";
import { PanelHeader } from "./TextPanel";

const HIGHLIGHTS = [
  "Arrow-1.svg",
  "Arrow-2.svg",
  "Arrow-3.svg",
  "Arrow-4.svg",
  "Arrow-5.svg",
  "Arrow-6.svg",
  "Arrow-7.svg",
  "Arrow-8.svg",
  "Arrow-9.svg",
  "Arrow-10.svg",
  "Arrow-11.svg",
  "Arrow-12.svg",
  "Arrow-13.svg",
  "Arrow-14.svg",
  "Arrow-15.svg",
  "Arrow-16.svg",
  "Arrow-17.svg",
  "Blob-1.svg",
  "Blob-2.svg",
  "Blob-3.svg",
  "Blob-4.svg",
  "Blob-5.svg",
  "Blob-6.svg",
  "Blob-7.svg",
  "Blob-8.svg",
  "Blob-9.svg",
  "Blob-10.svg",
  "Blob-11.svg",
  "Blob-12.svg",
  "Doodle-1.svg",
  "Doodle-2.svg",
  "Doodle-3.svg",
  "Doodle-4.svg",
  "Doodle-5.svg",
  "Doodle-6.svg",
  "Doodle-7.svg",
  "Doodle-8.svg",
  "Doodle-9.svg",
  "Doodle-10.svg",
  "Doodle-11.svg",
  "Doodle-12.svg",
  "Doodle-13.svg",
  "Doodle-14.svg",
  "Donuts-1.svg",
  "Donuts-2.svg",
  "Line-1.svg",
  "Line-2.svg",
  "Loop-1.svg",
  "Loop-2.svg",
  "Spiral-1.svg",
  "Spiral-2.svg",
  "Scribble-1.svg",
  "Scribble-2.svg",
];
const OPEN_PEEPS = [
  "Afro.svg",
  "Airy.svg",
  "Baggy-Pants.svg",
  "Ball.svg",
  "Caesar.svg",
  "Chongo.svg",
  "Cube.svg",
  "Cube-2.svg",
  "Curly.svg",
  "Hijab-1.svg",
  "Hijab2.svg",
  "Home.svg",
  "Hoodie.svg",
  "Jacket.svg",
  "Jacket-2.svg",
  "Long.svg",
  "Long-Sleeve.svg",
  "No-Hair.svg",
  "Plants.svg",
  "Pointing-Forward.svg",
  "Pointing-Up.svg",
  "Pony.svg",
  "Pregnant.svg",
  "Rad.svg",
  "Short-1.svg",
  "Short-2.svg",
  "Short-Beard.svg",
  "Shorts.svg",
  "Skinny-Jeans.svg",
  "Skinny-Jeans-Walk.svg",
  "Skirt.svg",
];
const ASSETS = [
  ...HIGHLIGHTS.map((file) => ({ file, group: "Highlights" })),
  ...OPEN_PEEPS.map((file) => ({ file, group: "Open Peeps" })),
];

export function IllustrationsPanel() {
  const { add } = useEditor();
  const [group, setGroup] = useState<"All" | "Highlights" | "Open Peeps">("All");
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
          50+ CC0 assets. Click an illustration to place it on the canvas.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(["All", "Highlights", "Open Peeps"] as const).map((item) => (
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
        {assets.map(({ file, group: assetGroup }) => {
          const src = `/illustrations/${file}`;
          const name = file.replace(/\.svg$/i, "").replaceAll("-", " ");
          return (
            <button
              key={file}
              onClick={() => add(newImage(src))}
              title={`Add ${name}`}
              className="group brutal-border-2 brutal-press overflow-hidden bg-surface p-1 hover:border-teal"
            >
              <div className="grid h-24 place-items-center bg-surface-2 p-2">
                <div className="grid size-full place-items-center bg-paper/80">
                  <img
                    src={src}
                    alt={`${assetGroup} illustration: ${name}`}
                    className="max-h-full max-w-full object-contain"
                    draggable={false}
                    onError={(event) => {
                      const fallback = src.replace(/\.svg$/i, ".png");
                      if (event.currentTarget.src.endsWith(fallback))
                        event.currentTarget.style.display = "none";
                      else event.currentTarget.src = fallback;
                    }}
                  />
                </div>
              </div>
              <span className="flex items-center gap-1 truncate px-1 py-1 font-mono text-[9px] text-teal/70">
                <ImagePlus className="size-3 shrink-0" />
                {name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="font-mono text-[8px] leading-relaxed text-teal/45">
        Illustrations: Highlights by Outdraw Design and Open Peeps-style character assets. CC0
        attribution per supplied collections.
      </p>
    </div>
  );
}
