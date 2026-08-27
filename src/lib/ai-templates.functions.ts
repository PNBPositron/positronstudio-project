import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Text models users can pick in Settings. Keep in sync with AI_MODELS in src/store/settings.ts.
const ALLOWED_TEXT_MODELS = [
  "google/gemini-3.6-flash",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
  "openai/gpt-5.5",
  "openai/gpt-5.4-mini",
  // OpenRouter free tier (requires OPENROUTER_API_KEY)
  "openrouter/openai/gpt-oss-20b:free",
  "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/google/gemma-4-31b-it:free",
];
const DEFAULT_TEXT_MODEL = "google/gemini-3.6-flash";

function pickModel(m?: string) {
  return typeof m === "string" && ALLOWED_TEXT_MODELS.includes(m) ? m : DEFAULT_TEXT_MODEL;
}

// GPT-5.6 models require reasoning_effort to be set explicitly.
function reasoningFor(model: string) {
  return model.startsWith("openai/gpt-5.6") ? { reasoning_effort: "none" as const } : {};
}

const OR_PREFIX = "openrouter/";

/** Chat completion against Lovable AI, or OpenRouter for `openrouter/*` models. */
async function chatComplete(
  model: string,
  messages: unknown[],
  extra: Record<string, unknown> = {},
): Promise<string> {
  const or = model.startsWith(OR_PREFIX);
  const apiKey = or ? process.env.OPENROUTER_API_KEY : process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      or
        ? "OpenRouter is not configured yet — add an OPENROUTER_API_KEY to use free models."
        : "Missing LOVABLE_API_KEY",
    );
  }
  const res = await fetch(
    or ? "https://openrouter.ai/api/v1/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(or ? { Authorization: `Bearer ${apiKey}` } : { "Lovable-API-Key": apiKey }),
      },
      body: JSON.stringify({
        model: or ? model.slice(OR_PREFIX.length) : model,
        ...(or ? {} : reasoningFor(model)),
        messages,
        ...extra,
      }),
    },
  );
  if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return content;
}

// Robustly extract a JSON object from a model response that may include
// markdown fences, prose, or multiple back-to-back objects.
function parseLooseJson<T>(raw: string): T {
  let s = (raw ?? "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(s) as T; } catch { /* fall through */ }
  const start = s.indexOf("{");
  if (start === -1) throw new Error("AI returned invalid JSON");
  // Walk braces respecting strings to find the matching close.
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return JSON.parse(s.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error("AI returned invalid JSON");
}

export type AiShadow = { x: number; y: number; blur: number; color: string };

export type AiElementInput =
  | {
      type: "text";
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize: number;
      color: string;
      fontFamily?: string;
      fontWeight?: number;
      align?: "left" | "center" | "right";
      italic?: boolean;
      underline?: boolean;
      bullet?: boolean;
      href?: string;
    }
  | {
      type: "shape";
      shape:
        | "rect" | "circle" | "triangle" | "star" | "arrow"
        | "heart" | "diamond" | "hexagon" | "pentagon"
        | "parallelogram" | "trapezoid" | "cross"
        | "lightning" | "cloud" | "speech";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      stroke: string;
      strokeWidth: number;
      effect?: "none" | "liquid_glass" | "neon" | "soft_shadow" | "inner_glow";
      shadow?: AiShadow;
    }
  | {
      type: "icon";
      name: string; // lucide PascalCase
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      strokeWidth?: number;
    }
  | {
      type: "model3d";
      shape: "sphere";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      spinSpeed?: number;
      tiltX?: number;
      tiltY?: number;
    };

export type AiTemplate = {
  bg: string;
  elements: AiElementInput[];
};

export type AiPage = { bg: string; elements: AiElementInput[] };
export type AiDeck = { pages: AiPage[] };

export type AiStyle =
  | "auto"
  | "cyberpunk"
  | "liquid_glass"
  | "minimal"
  | "editorial"
  | "brutalist"
  | "retro_80s"
  | "organic"
  | "art_deco"
  | "memphis"
  | "y2k";

const STYLE_GUIDES: Record<AiStyle, string> = {
  auto:
    "AUTO-DETECT STYLE. Read the user's prompt (and reference image if provided) carefully, then pick the single most appropriate visual style from this list: cyberpunk, liquid_glass, minimal, editorial, brutalist, retro_80s, organic, art_deco, memphis, y2k — or invent a closely related one if none fits. Treat keywords as required signals: 'corporate/clean/SaaS' → minimal; 'magazine/editorial/serif' → editorial; 'rave/neon/synthwave/cyber' → cyberpunk or retro_80s; 'glass/translucent/dreamy/iOS' → liquid_glass; 'raw/print/zine/punk' → brutalist; 'nature/wellness/calm/earth' → organic; 'luxury/gold/gatsby' → art_deco; 'playful/90s/squiggle/kids' → memphis; 'chrome/holographic/bubblegum/futuristic 2000s' → y2k. Commit to one direction with conviction — palette, type, shapes must all reinforce it. Use real hex codes and at least one shape effect (liquid_glass/neon/soft_shadow/inner_glow) appropriate to the chosen style. State the chosen style implicitly through the design — do NOT mention it in any text element.",
  cyberpunk:
    "CYBERPUNK / NEOBRUTALIST. Palette: ink #0a0f1f, surface #101a2e, neon teal #7df9ff, electric blue #4d7cff, hot magenta #ff0080. Heavy display type, dramatic scale contrast, geometric shapes, mono labels. Use shape effect 'neon' on key shapes.",
  liquid_glass:
    "LIQUID GLASS / GLASSMORPHISM. Palette: deep gradient backgrounds (indigo→violet→cyan), translucent surfaces, soft pastels (#a78bfa, #67e8f9, #f0abfc, #ffffff). Use overlapping circles/blobs as 'glass orbs' and ALWAYS set shape effect to 'liquid_glass' on at least 2 shapes. Soft, airy, refined typography.",
  minimal:
    "SWISS MINIMALIST. Palette: paper #f5f3ee, ink #0d0d0d, single accent (#ff3b30 OR #1a73e8). Massive negative space, tiny labels, one giant headline, hairline strokes only. Use 'soft_shadow' sparingly.",
  editorial:
    "EDITORIAL / MAGAZINE. Palette: warm off-white #f8f4ec, deep ink #1a1a1a, gold accent #c9a84c. Mixing serif headlines with mono details. Asymmetric grid, generous margins, refined.",
  brutalist:
    "RAW BRUTALIST. Palette: stark white #ffffff, pure black #000000, single saturated accent (lime #ccff00 OR red #ff0000). Heavy borders, exposed grid, raw hierarchy. Use 'soft_shadow' on key blocks.",
  retro_80s:
    "RETRO 80s / SYNTHWAVE. Palette: deep purple #1a0033, hot pink #ff006e, cyan #00f0ff, sun yellow #ffe600. Sunset gradients, bold display, chrome-style headlines. Use 'neon' effect on shapes.",
  organic:
    "ORGANIC / NATURAL. Palette: cream #f5f0e8, sage #87a878, terracotta #c4654a, mossy #4a6741. Soft rounded shapes, hand-feel, gentle hierarchy.",
  art_deco:
    "ART DECO. Palette: black #0a0a0a, gold #d4a017, ivory #f5e6c8. Symmetric geometric ornament, tall display type, gilded accents.",
  memphis:
    "MEMPHIS DESIGN. Palette: hot pink #ff5d8f, electric blue #1e88e5, lemon #ffeb3b, mint #4ecdc4, black on white. Squiggles, dots, zigzags, playful chaos.",
  y2k:
    "Y2K FUTURISM. Palette: chrome silver, holographic pastels (#c4b5fd, #67e8f9, #f0abfc), candy pink. Translucent bubble shapes — use 'liquid_glass' effect heavily — glossy feel, futuristic display.",
};

const buildSystem = (W: number, H: number, style: AiStyle, hasImage: boolean) => `You are an elite graphic designer generating a MULTI-SLIDE deck for a ${W}×${H}px canvas.
Aspect ratio: ${(W / H).toFixed(3)} (${W >= H ? "landscape/wide" : "portrait/tall"}). Compose every slide for this exact shape — fill the full ${W}px width and ${H}px height.

THINK BEFORE YOU DESIGN (do this silently, do NOT emit it):
  • Choose the palette (3-5 hex codes) and ONE typographic system.
  • Decide one repeating visual motif (a shape, an icon, a stroke pattern) that recurs across slides.
  • Sketch each slide's role and dominant element BEFORE filling coordinates.
  • For every slide, mentally check: does each element fit inside ${W}×${H}? Do text boxes have enough height for the fontSize? Does the layout feel deliberate, not centered-by-default?

DECK STRUCTURE — output the requested number of cohesive slides in this order:
  1. TITLE slide — huge headline + short subtitle/byline. Bold, no body copy.
  middle. CONTENT slides — each one has a clear role (intro / point / example / data / quote). Use DISTINCT layouts; never repeat the title format or each other.
  last. SUMMARY slide — recap of key points (bulleted or numbered) OR a closing call-to-action.
All slides MUST share the same palette, typographic system, and visual motifs so the deck feels like ONE designed artifact.

STYLE BRIEF: ${STYLE_GUIDES[style]}

${hasImage ? "An IMAGE has been attached as creative reference — extract its palette, mood, subject, and composition cues. Match the dominant colors precisely (use real hex sampled from the image). Echo the layout/feel.\n\n" : ""}AVAILABLE FONTS: "Orbitron", "JetBrains Mono", "Archivo Black", "Inter", "Georgia".

AVAILABLE ELEMENT TYPES (mix freely — use icons, 3D spheres, shape effects to amplify the style):
- text: { type:"text", text, x, y, width, height, fontSize, color, fontFamily?, fontWeight?, align?, italic?, underline?, bullet? }
- shape: { type:"shape", shape:"rect"|"circle"|"triangle"|"star"|"arrow", x, y, width, height, fill, stroke, strokeWidth, effect?:"none"|"liquid_glass"|"neon"|"soft_shadow"|"inner_glow", shadow?:{ x,y,blur,color } }
- icon: { type:"icon", name, x, y, width, height, color, strokeWidth? } — name MUST be a valid lucide-react icon in PascalCase (e.g. "Sparkles", "Zap", "Heart", "Rocket", "Star", "Sun", "Moon", "Cloud", "Flame", "Crown", "Globe", "Atom", "Infinity", "Bolt", "Leaf", "Mountain", "Waves", "Snowflake", "Music", "Camera", "ShoppingBag", "Mail", "Lock", "User", "Code", "Cpu", "Brain", "Eye", "Hand").
- model3d: { type:"model3d", shape:"sphere", x, y, width, height, color, spinSpeed?, tiltX?, tiltY? } — only spheres are supported.

SHAPE EFFECTS (use to add depth):
- "liquid_glass": frosted, translucent glassmorphism panel — gorgeous over colorful backgrounds or behind text.
- "neon": glowing outer halo using the fill color — perfect for cyberpunk/synthwave.
- "soft_shadow": realistic drop shadow under the shape — adds depth on light backgrounds.
- "inner_glow": inner color glow — use for accent badges.

Coordinates are absolute pixels within ${W}×${H}. Keep all elements inside bounds (0 ≤ x, x+width ≤ ${W}; 0 ≤ y, y+height ≤ ${H}).

Return ONLY valid JSON, no markdown, no commentary:
{
  "pages": Array<{ "bg": "#hex", "elements": Array<element> }>
}

Each slide aims for 5-12 elements. Across the deck, include at least one shape with an effect (liquid_glass or neon) when the style supports it. Make it visually striking, deliberate, and unmistakably in the requested style.`;

export const generateAiTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { prompt: string; width?: number; height?: number; style?: AiStyle; imageDataUrl?: string; slideCount?: number; model?: string }) => {
    if (!data || typeof data.prompt !== "string") throw new Error("Prompt is required");
    if (!data.prompt.trim() && !data.imageDataUrl) throw new Error("Provide a prompt or an image");
    const clamp = (n: unknown, def: number) => {
      const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : def;
      return Math.max(320, Math.min(4096, v));
    };
    const validStyles: AiStyle[] = [
      "auto", "cyberpunk", "liquid_glass", "minimal", "editorial", "brutalist",
      "retro_80s", "organic", "art_deco", "memphis", "y2k",
    ];
    const style: AiStyle = (data.style && validStyles.includes(data.style)) ? data.style : "auto";
    const img = typeof data.imageDataUrl === "string" && data.imageDataUrl.startsWith("data:image/")
      ? data.imageDataUrl.slice(0, 8_000_000)
      : undefined;
    const slideCount = Math.max(1, Math.min(10,
      typeof data.slideCount === "number" && Number.isFinite(data.slideCount) ? Math.round(data.slideCount) : 5
    ));
    return {
      prompt: data.prompt.slice(0, 1000),
      width: clamp(data.width, 1920),
      height: clamp(data.height, 1080),
      style,
      imageDataUrl: img,
      slideCount,
      model: pickModel(data.model),
    };
  })
  .handler(async ({ data }): Promise<AiDeck> => {
    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: `Design concept: ${data.prompt || "(use the attached image as the brief)"}\n\nProduce exactly ${data.slideCount} slides.` },
    ];
    if (data.imageDataUrl) {
      userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }

    const content = await chatComplete(
      data.model,
      [
        { role: "system", content: buildSystem(data.width, data.height, data.style, !!data.imageDataUrl) },
        { role: "user", content: userContent },
      ],
      { response_format: { type: "json_object" } },
    );

    let parsed: AiDeck | AiTemplate;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid JSON");
      parsed = JSON.parse(match[0]);
    }
    // Normalize: accept either { pages: [...] } or legacy { bg, elements }
    let pages: AiPage[];
    if ("pages" in parsed && Array.isArray(parsed.pages)) {
      pages = parsed.pages.filter((p) => p && Array.isArray(p.elements));
    } else if ("elements" in parsed && Array.isArray(parsed.elements)) {
      pages = [{ bg: parsed.bg ?? "#0a0f1f", elements: parsed.elements }];
    } else {
      throw new Error("AI response missing pages/elements");
    }
    if (pages.length === 0) throw new Error("AI returned an empty deck");
    return { pages };
  });

// ---------------- Icon set generator ----------------

export const suggestIcons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { prompt: string; count?: number }) => {
    if (!data?.prompt?.trim()) throw new Error("Prompt is required");
    const count = Math.max(4, Math.min(24, typeof data.count === "number" ? data.count : 12));
    return { prompt: data.prompt.slice(0, 300), count };
  })
  .handler(async ({ data }): Promise<{ icons: string[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Return ${data.count} lucide-react icon names (PascalCase) that best fit the user's theme. Use only real lucide icons. Return JSON: { "icons": string[] }. No commentary.`,
          },
          { role: "user", content: `Theme: ${data.prompt}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: { icons?: unknown };
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const icons = Array.isArray(parsed.icons)
      ? (parsed.icons as unknown[]).filter((n): n is string => typeof n === "string")
      : [];
    return { icons };
  });

// ---------------- 3D sphere scene generator ----------------

export type Ai3DScene = {
  bg?: string;
  models: Array<{
    shape: "sphere";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    spinSpeed?: number;
    tiltX?: number;
    tiltY?: number;
  }>;
};

export const generate3DScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { prompt: string; width?: number; height?: number }) => {
    if (!data?.prompt?.trim()) throw new Error("Prompt is required");
    const clamp = (n: unknown, def: number) =>
      Math.max(320, Math.min(4096, typeof n === "number" && Number.isFinite(n) ? Math.round(n) : def));
    return {
      prompt: data.prompt.slice(0, 500),
      width: clamp(data.width, 1920),
      height: clamp(data.height, 1080),
    };
  })
  .handler(async ({ data }): Promise<Ai3DScene> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const sys = `Design a 3D composition on a ${data.width}×${data.height}px canvas using ONLY spheres (planets, orbs, bubbles).
Compose 3-7 spheres, varied sizes (80-700px), thoughtful color harmony.
Coordinates absolute, must stay inside bounds.
Return JSON only: { "bg": "#hex", "models": Array<{ "shape":"sphere", "x", "y", "width", "height", "color", "spinSpeed"?, "tiltX"?, "tiltY"? }> }.
spinSpeed: 0-30 seconds (0 = static). Always set "shape" to "sphere".`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Theme: ${data.prompt}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limit hit.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: Ai3DScene;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned invalid JSON");
      parsed = JSON.parse(m[0]);
    }
    if (!Array.isArray(parsed.models)) throw new Error("Missing models array");
    // force sphere
    parsed.models = parsed.models.map((m) => ({ ...m, shape: "sphere" as const }));
    return parsed;
  });

// ---------------- Edit current slide via chat ----------------

export const editCurrentSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    prompt: string;
    width: number;
    height: number;
    page: { bg: string; elements: AiElementInput[] };
    model?: string;
  }) => {
    if (!data?.prompt?.trim()) throw new Error("Prompt is required");
    if (!data.page || !Array.isArray(data.page.elements)) throw new Error("Page is required");
    const clamp = (n: unknown, def: number) =>
      Math.max(320, Math.min(4096, typeof n === "number" && Number.isFinite(n) ? Math.round(n) : def));
    return {
      prompt: data.prompt.slice(0, 1000),
      width: clamp(data.width, 1920),
      height: clamp(data.height, 1080),
      page: { bg: data.page.bg ?? "#0a0f1f", elements: data.page.elements.slice(0, 200) },
      model: pickModel(data.model),
    };
  })
  .handler(async ({ data }): Promise<AiPage> => {
    const sys = `You are an elite graphic designer EDITING an existing slide on a ${data.width}×${data.height}px canvas.
You will receive the CURRENT slide as JSON and a user instruction. Apply the instruction and return the FULL updated slide.

Rules:
- Preserve everything the user didn't ask to change. Don't restyle unrelated elements.
- Keep all elements inside bounds (0 ≤ x, x+width ≤ ${data.width}; 0 ≤ y, y+height ≤ ${data.height}).
- Use realistic hex colors. Available fonts: "Orbitron", "JetBrains Mono", "Archivo Black", "Inter", "Georgia".
- Element types: text, shape (rect/circle/triangle/star/arrow), icon (lucide PascalCase), model3d (sphere only).
- Shape effects available: "liquid_glass", "neon", "soft_shadow", "inner_glow".

Return ONLY valid JSON, no commentary:
{ "bg": "#hex", "elements": Array<element> }`;

    const content = await chatComplete(
      data.model,
      [
        { role: "system", content: sys },
        { role: "user", content: `Current slide:\n${JSON.stringify(data.page)}\n\nInstruction: ${data.prompt}` },
      ],
      { response_format: { type: "json_object" } },
    );
    const parsed = parseLooseJson<AiPage>(content);
    if (!parsed || !Array.isArray(parsed.elements)) throw new Error("AI response missing elements");
    return { bg: parsed.bg ?? data.page.bg, elements: parsed.elements };
  });

// ---------------- Redesign current slide — N layout variations ----------------

export const redesignSlideVariations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    width: number;
    height: number;
    page: { bg: string; elements: AiElementInput[] };
    count?: number;
    style?: AiStyle;
    model?: string;
  }) => {
    if (!data.page || !Array.isArray(data.page.elements)) throw new Error("Page is required");
    const clamp = (n: unknown, def: number) =>
      Math.max(320, Math.min(4096, typeof n === "number" && Number.isFinite(n) ? Math.round(n) : def));
    const count = Math.max(2, Math.min(4, typeof data.count === "number" ? Math.round(data.count) : 3));
    const validStyles: AiStyle[] = [
      "auto", "cyberpunk", "liquid_glass", "minimal", "editorial", "brutalist",
      "retro_80s", "organic", "art_deco", "memphis", "y2k",
    ];
    const style: AiStyle = (data.style && validStyles.includes(data.style)) ? data.style : "auto";
    return {
      width: clamp(data.width, 1920),
      height: clamp(data.height, 1080),
      page: { bg: data.page.bg ?? "#0a0f1f", elements: data.page.elements.slice(0, 200) },
      count,
      style,
      model: pickModel(data.model),
    };
  })
  .handler(async ({ data }): Promise<{ variants: AiPage[] }> => {
    const sys = `You are an elite designer producing ${data.count} DISTINCT LAYOUT VARIATIONS of an existing slide.

HARD RULES — no exceptions:
- KEEP every text element's copy EXACTLY as written. Do NOT translate, rewrite, or summarize any text. Text elements' \`text\` field is verbatim.
- Keep the same LIST of core content (headlines, body, bullets, quotes). You may drop purely decorative shapes and add new decorative shapes/icons.
- Each variation must be VISUALLY DIFFERENT from the others AND from the original: different composition, alignment, hierarchy, negative space, palette register, decorative motif. Not just moved by 20px.

STYLE BRIEF: ${STYLE_GUIDES[data.style]}

Canvas: ${data.width}×${data.height}px. Keep every element within bounds (0 ≤ x, x+width ≤ ${data.width}; 0 ≤ y, y+height ≤ ${data.height}).
Available fonts: "Orbitron", "JetBrains Mono", "Archivo Black", "Inter", "Georgia".
Element types: text, shape (rect/circle/triangle/star/arrow/heart/diamond/hexagon/pentagon/parallelogram/trapezoid/cross/lightning/cloud/speech), icon (lucide PascalCase), model3d (sphere only).
Shape effects: "liquid_glass", "neon", "soft_shadow", "inner_glow".

Return ONLY valid JSON, no commentary:
{ "variants": Array<{ "bg": "#hex", "elements": Array<element> }> } — exactly ${data.count} entries.`;

    const content = await chatComplete(
      data.model,
      [
        { role: "system", content: sys },
        { role: "user", content: `Current slide:\n${JSON.stringify(data.page)}\n\nProduce ${data.count} distinct layout variations.` },
      ],
      { response_format: { type: "json_object" } },
    );
    const parsed = parseLooseJson<{ variants?: unknown }>(content);
    const arr = Array.isArray(parsed.variants) ? parsed.variants : [];
    const variants: AiPage[] = arr
      .filter((v): v is AiPage => !!v && typeof v === "object" && Array.isArray((v as AiPage).elements))
      .map((v) => ({ bg: v.bg ?? data.page.bg, elements: v.elements }));
    if (variants.length === 0) throw new Error("AI returned no variations");
    return { variants };
  });

// ---------------- Translate deck ----------------

export const translateTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { texts: string[]; target: string }) => {
    if (!Array.isArray(data?.texts)) throw new Error("texts required");
    const target = (data.target ?? "").toString().slice(0, 60).trim();
    if (!target) throw new Error("target language required");
    const texts = data.texts.slice(0, 500).map((t) => (typeof t === "string" ? t.slice(0, 4000) : ""));
    return { texts, target };
  })
  .handler(async ({ data }): Promise<{ translations: string[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    if (data.texts.length === 0) return { translations: [] };

    const sys = `You are a professional translator. Translate each string in the input array into ${data.target}.
Rules:
- Preserve the order and count of items exactly. Return the SAME number of strings.
- Preserve line breaks, punctuation, emoji, numbers, and inline formatting.
- Do NOT translate URLs, hex color codes, brand names, or code identifiers.
- If a string is empty or already in ${data.target}, return it unchanged.
Return ONLY JSON: { "translations": string[] } with exactly ${data.texts.length} entries.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify({ texts: data.texts }) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = parseLooseJson<{ translations?: unknown }>(content);
    const out = Array.isArray(parsed.translations) ? parsed.translations : [];
    const translations = data.texts.map((original, i) => {
      const t = out[i];
      return typeof t === "string" ? t : original;
    });
    return { translations };
  });

// ---------------- AI image asset generation ----------------

export const generateAiAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    prompt: string;
    size?: "1024x1024" | "1024x1536" | "1536x1024";
    model?: string;
    quality?: "low" | "medium" | "high";
  }) => {
    if (!data?.prompt?.trim()) throw new Error("Prompt is required");
    const size = data.size === "1024x1536" || data.size === "1536x1024" ? data.size : "1024x1024";
    const allowedModels = [
      "openai/gpt-image-2",
      "openai/gpt-image-1-mini",
      "google/gemini-2.5-flash-image",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3-pro-image-preview",
    ];
    const model = data.model && allowedModels.includes(data.model) ? data.model : "openai/gpt-image-2";
    const quality: "low" | "medium" | "high" =
      data.quality === "medium" || data.quality === "high" ? data.quality : "low";
    return { prompt: data.prompt.slice(0, 1000), size, model, quality };
  })
  .handler(async ({ data }): Promise<{ dataUrl: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const isGemini = data.model.startsWith("google/");
    const body = isGemini
      ? {
          model: data.model,
          messages: [{ role: "user", content: data.prompt }],
          modalities: ["image", "text"],
        }
      : {
          model: data.model,
          prompt: data.prompt,
          size: data.size,
          quality: data.quality,
          n: 1,
        };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) throw new Error("Rate limit hit. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = json.data?.[0];
    if (first?.b64_json) return { dataUrl: `data:image/png;base64,${first.b64_json}` };
    if (first?.url) return { dataUrl: first.url };
    throw new Error("AI returned no image");
  });

// ---------------- Stock photo search (Openverse) ----------------

export type StockImage = {
  id: string;
  thumb: string;
  full: string;
  title: string;
  author: string;
  source: string;
};

export const stockSearch = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; page?: number }) => {
    const query = (data?.query ?? "").toString().slice(0, 100).trim() || "abstract";
    const page = Math.max(1, Math.min(20, typeof data?.page === "number" ? Math.round(data.page) : 1));
    return { query, page };
  })
  .handler(async ({ data }): Promise<{ results: StockImage[] }> => {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(data.query)}&page=${data.page}&page_size=20&license_type=commercial&mature=false`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Positron-Studio/1.0" },
    });
    if (!res.ok) throw new Error(`Stock search failed: ${res.status}`);
    const json = (await res.json()) as {
      results?: Array<{
        id?: string;
        url?: string;
        thumbnail?: string;
        title?: string;
        creator?: string;
        source?: string;
      }>;
    };
    const results: StockImage[] = (json.results ?? [])
      .map((r) => ({
        id: r.id ?? Math.random().toString(36).slice(2),
        thumb: r.thumbnail || r.url || "",
        full: r.url || r.thumbnail || "",
        title: r.title ?? "",
        author: r.creator ?? "",
        source: r.source ?? "openverse",
      }))
      .filter((r) => r.full);
    return { results };
  });

// ---------------- Import template from PPT / PDF ----------------

export const importTemplateFromFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    fileDataUrl: string;
    fileName?: string;
    width?: number;
    height?: number;
    style?: AiStyle;
  }) => {
    if (!data?.fileDataUrl || !data.fileDataUrl.startsWith("data:")) {
      throw new Error("A PDF or PPTX file is required");
    }
    // Hard cap to keep request size sane (~15MB base64).
    if (data.fileDataUrl.length > 20_000_000) {
      throw new Error("File too large (max ~15MB). Please upload a smaller file.");
    }
    const clamp = (n: unknown, def: number) =>
      Math.max(320, Math.min(4096, typeof n === "number" && Number.isFinite(n) ? Math.round(n) : def));
    const validStyles: AiStyle[] = [
      "auto", "cyberpunk", "liquid_glass", "minimal", "editorial", "brutalist",
      "retro_80s", "organic", "art_deco", "memphis", "y2k",
    ];
    return {
      fileDataUrl: data.fileDataUrl,
      fileName: (data.fileName ?? "").toString().slice(0, 200),
      width: clamp(data.width, 1920),
      height: clamp(data.height, 1080),
      style: (data.style && validStyles.includes(data.style)) ? data.style : "auto",
    };
  })
  .handler(async ({ data }): Promise<AiDeck> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const sys = `${buildSystem(data.width, data.height, data.style, true)}

IMPORT MODE: A presentation file (PDF or PPTX) is attached. Carefully READ every slide/page — extract the text content, structure, headings, bullet points, data, and overall narrative. Then REDESIGN the whole deck as a beautiful, cohesive template on the ${data.width}×${data.height}px canvas, preserving the source's textual content and slide order but elevating the visual design.

Rules:
- Keep the SAME number of slides as the source (or as close as possible, max 12).
- Preserve headings, key phrases, bullets, and numbers verbatim where possible.
- Reinterpret the layout — do not copy the original layout. Use the style brief above.
- If the source has charts/images, replace them with iconography or shapes that evoke the same idea.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: [
              { type: "text", text: `Imported file: ${data.fileName || "(unnamed)"}. Read its slides and rebuild them as a designed template.` },
              { type: "image_url", image_url: { url: data.fileDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    const parsed = parseLooseJson<AiDeck | AiTemplate>(content);
    let pages: AiPage[];
    if ("pages" in parsed && Array.isArray(parsed.pages)) {
      pages = parsed.pages.filter((p) => p && Array.isArray(p.elements));
    } else if ("elements" in parsed && Array.isArray(parsed.elements)) {
      pages = [{ bg: parsed.bg ?? "#0a0f1f", elements: parsed.elements }];
    } else {
      throw new Error("AI response missing pages/elements");
    }
    if (pages.length === 0) throw new Error("AI returned an empty deck");
    return { pages };
  });
