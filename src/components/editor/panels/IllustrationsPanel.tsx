import { useMemo, useState } from "react";
import { useSettings } from "@/store/settings";
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
  "Line-3.svg",
  "Line-4.svg",
  "Line-5.svg",
  "Line-6.svg",
  "Line-7.svg",
  "Line-8.svg",
  "Line-9.svg",
  "Line-10.svg",
  "Line-11.svg",
  "Loop-3.svg",
  "Loop-4.svg",
  "Loop-5.svg",
  "Loop-6.svg",
  "Loop-7.svg",
  "Loop-8.svg",
  "Spiral-3.svg",
  "Spiral-4.svg",
  "Spiral-5.svg",
  "Spiral-6.svg",
  "Spiral-7.svg",
  "Spiral-8.svg",
  "Scribble-3.svg",
  "Scribble-4.svg",
  "Scribble-5.svg",
  "Scribble-6.svg",
  "Scribble-7.svg",
  "Scribble-8.svg",
  "Scribble-9.svg",
  "Scribble-10.svg",
  "Punctuation-1.svg",
  "Punctuation-2.svg",
  "Punctuation-3.svg",
  "Punctuation-4.svg",
  "Punctuation-5.svg",
  "Punctuation-6.svg",
  "Punctuation-7.svg",
  "Punctuation-8.svg",
  "Punctuation-9.svg",
  "Sprinkle-1.svg",
  "Sprinkle-2.svg",
  "Sprinkle-3.svg",
  "Sprinkle-4.svg",
  "Sprinkle-5.svg",
  "Sprinkle-6.svg",
  "Sprinkle-7.svg",
  "Sprinkle-8.svg",
  "Underline-1.svg",
  "Underline-2.svg",
  "Underline-3.svg",
  "Underline-4.svg",
  "Underline-5.svg",
  "Underline-6.svg",
  "Underline-7.svg",
  "Underline-8.svg",
  "Underline-9.svg",
  "Underline-10.svg",
  "Whirl-1.svg",
  "Whirl-2.svg",
  "Whirl-3.svg",
  "Whirl-4.svg",
  "Whirl-5.svg",
  "Whirl-6.svg",
  "Whirl-7.svg",
  "Whirl-8.svg",
];
const TRANSHUMANS = [
  "Entertainment.svg", "Pilot.svg", "Walking Contradiction.svg", "Ecto Plasma.svg", "Roboto.svg",
  "Gamestation.svg", "Wont Stop.svg", "Consumer.svg", "Mechanical Love.svg", "Whoa.svg",
  "Cube Leg.svg", "Coffee.svg", "Rogue.svg", "Runner.svg", "Pacheco.svg", "Polka Pup.svg",
  "Mask.svg", "Looking Ahead.svg", "Puppy.svg", "Bueno.svg", "Chaotic Good.svg", "Jumping.svg",
  "Experiments.svg", "Fling.svg", "Waiting.svg", "Astro.svg", "Pondering.svg", "Late for Class.svg",
  "Groceries.svg", "Kiddo.svg", "Growth.svg", "Meela Pantalones.svg", "Feliz.svg", "Reflecting.svg",
  "Chilly.svg", "Chillin.svg",
];
const GROUPS = ["All", "Highlights", "Transhumans"] as const;
const ASSETS = [
  ...HIGHLIGHTS.map((file) => ({ file, group: "Highlights" as const })),
  ...TRANSHUMANS.map((file) => ({ file, group: "Transhumans" as const })),
];

export function IllustrationsPanel() {
  const { add } = useEditor();
  const editorTheme = useSettings((s) => s.editorTheme);
  const [tint, setTint] = useState("#0a0f1f");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("All");
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
      <label className="flex items-center justify-between border border-teal/25 bg-surface px-2 py-1.5 font-mono text-[9px] uppercase text-teal/70">
        Illustration color
        <input
          type="color"
          value={tint}
          onChange={(event) => setTint(event.target.value)}
          aria-label="Illustration color"
          className="size-5 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>
      <div className="grid grid-cols-2 gap-1">
        {GROUPS.map((item) => (
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
              onClick={() =>
                add(newImage(src, { tint: editorTheme.includes("dark") ? "#ffffff" : tint }))
              }
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
        Illustrations: Highlights by Outdraw Design. CC0 attribution per supplied collection.
      </p>
    </div>
  );
}
