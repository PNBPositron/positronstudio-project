import { newText, DEFAULT_PAGE_DURATION, type AnyElement, type Page } from "@/store/editor";
import { applyLayout, type LayoutId } from "./designer";
import type { DeckCopy, DeckCopySlide } from "./ai-templates.functions";

export type CopyPalette = {
  bg: string;
  title: string;
  body: string;
  accent: string;
  titleFont: string;
  bodyFont: string;
};

export const COPY_PALETTES: Array<{ id: string; label: string; palette: CopyPalette }> = [
  {
    id: "ink",
    label: "Ink",
    palette: {
      bg: "#faf7f0",
      title: "#0a0f1f",
      body: "#2b3244",
      accent: "#1f4dff",
      titleFont: "Archivo Black",
      bodyFont: "Inter",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    palette: {
      bg: "#0a0f1f",
      title: "#eef3ff",
      body: "#b9c4dd",
      accent: "#7aa2ff",
      titleFont: "Archivo Black",
      bodyFont: "Inter",
    },
  },
  {
    id: "sun",
    label: "Sun",
    palette: {
      bg: "#ffd84a",
      title: "#0a0f1f",
      body: "#3a2f00",
      accent: "#ff0080",
      titleFont: "Archivo Black",
      bodyFont: "Inter",
    },
  },
];

const uid = () => Math.random().toString(36).slice(2, 10);

/** Text-only elements for one slide, before a layout is applied. */
function slideElements(
  slide: DeckCopySlide,
  W: number,
  H: number,
  p: CopyPalette,
): AnyElement[] {
  const els: AnyElement[] = [];
  const big = slide.kind === "title";
  els.push(
    newText({
      text: slide.title,
      x: 0,
      y: 0,
      width: Math.round(W * 0.7),
      height: Math.round(H * (big ? 0.24 : 0.16)),
      fontSize: Math.round(H * (big ? 0.11 : 0.075)),
      color: p.title,
      fontFamily: p.titleFont,
      fontWeight: 900,
      align: "left",
    }),
  );
  if (slide.subtitle) {
    els.push(
      newText({
        text: slide.subtitle,
        x: 0,
        y: 0,
        width: Math.round(W * 0.6),
        height: Math.round(H * 0.1),
        fontSize: Math.round(H * 0.038),
        color: p.accent,
        fontFamily: p.bodyFont,
        fontWeight: 600,
        align: "left",
      }),
    );
  }
  if (slide.bullets.length) {
    els.push(
      newText({
        text: slide.bullets.join("\n"),
        x: 0,
        y: 0,
        width: Math.round(W * 0.62),
        height: Math.round(H * 0.09 * slide.bullets.length),
        fontSize: Math.round(H * 0.032),
        color: p.body,
        fontFamily: p.bodyFont,
        fontWeight: 400,
        align: "left",
        bullet: true,
      }),
    );
  }
  return els;
}

/** Build deck pages from pure copy using one of the deterministic layouts. */
export function buildPagesFromCopy(
  copy: DeckCopy,
  layout: LayoutId,
  W: number,
  H: number,
  palette: CopyPalette,
): Page[] {
  return copy.slides.map((slide) => ({
    id: uid(),
    bgColor: palette.bg,
    duration: DEFAULT_PAGE_DURATION,
    elements: applyLayout(
      slideElements(slide, W, H, palette),
      slide.kind === "title" ? "hero" : layout,
      W,
      H,
    ),
  }));
}

/** Build deck pages by pouring the copy into a community template's text slots. */
export function buildPagesFromTemplate(
  copy: DeckCopy,
  templatePages: Page[],
  W: number,
  H: number,
): Page[] {
  const source = templatePages.filter((p) => !!p);
  if (source.length === 0) return [];
  return copy.slides.map((slide, i) => {
    const tpl = source[Math.min(i, source.length - 1)] ?? source[0];
    const slots = [
      slide.title,
      ...(slide.subtitle ? [slide.subtitle] : []),
      ...slide.bullets,
    ];
    let slot = 0;
    const elements = (tpl.elements ?? []).map((el): AnyElement => {
      const clone = { ...el, id: uid() } as AnyElement;
      if (clone.type === "text") {
        const next = slots[slot];
        slot += 1;
        return { ...clone, text: next ?? "" };
      }
      return clone;
    });
    // Anything the template had no slot for gets appended, laid out under the rest.
    const leftovers = slots.slice(slot);
    if (leftovers.length) {
      elements.push(
        newText({
          text: leftovers.join("\n"),
          x: Math.round(W * 0.08),
          y: Math.round(H * 0.66),
          width: Math.round(W * 0.6),
          height: Math.round(H * 0.26),
          fontSize: Math.round(H * 0.03),
          color: "#0a0f1f",
          fontFamily: "Inter",
          fontWeight: 400,
          align: "left",
          bullet: true,
        }),
      );
    }
    return {
      ...tpl,
      id: uid(),
      duration: tpl.duration ?? DEFAULT_PAGE_DURATION,
      elements: elements.filter((e) => !(e.type === "text" && !e.text.trim())),
    };
  });
}
