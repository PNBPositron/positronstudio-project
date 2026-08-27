import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelId =
  | "templates"
  | "ai"
  | "text"
  | "components"
  | "shapes"
  | "uploads"
  | "design";

export const PANEL_LABELS: Record<PanelId, string> = {
  templates: "Templates",
  ai: "AI Edit",
  text: "Text",
  components: "Components",
  shapes: "Shapes",
  uploads: "Uploads",
  design: "Design",
};

export type BrandKit = {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  headingFont: string;
  bodyFont: string;
};

export const DEFAULT_BRAND_KIT: BrandKit = {
  primary: "#2b6bff",
  secondary: "#7df9ff",
  accent: "#ff0080",
  bg: "#0a0f1f",
  text: "#ffffff",
  headingFont: "Archivo Black",
  bodyFont: "Inter",
};

type SettingsState = {
  aiEnabled: boolean;
  autoHidePanel: boolean;
  aiModel: string;
  editorTheme: string;
  panels: Record<PanelId, boolean>;
  panelDurationMs: number;
  panelStiffness: number; // 0 = soft ease, 100 = springy overshoot
  reduceMotion: boolean; // force-disable panel motion
  brandKit: BrandKit;
  setBrandKit: (patch: Partial<BrandKit>) => void;
  resetBrandKit: () => void;
  setAiEnabled: (v: boolean) => void;
  setAutoHidePanel: (v: boolean) => void;
  setAiModel: (v: string) => void;
  setEditorTheme: (v: string) => void;
  setPanelDurationMs: (v: number) => void;
  setPanelStiffness: (v: number) => void;
  setReduceMotion: (v: boolean) => void;
  resetMotion: () => void;
  togglePanel: (id: PanelId) => void;
  resetPanels: () => void;
};

export const DEFAULT_PANEL_DURATION = 460;
export const DEFAULT_PANEL_STIFFNESS = 45;

/** maps a 0-100 stiffness to a cubic-bezier with increasing overshoot */
export const springEasing = (stiffness: number) => {
  const k = Math.max(0, Math.min(100, stiffness)) / 100;
  return `cubic-bezier(0.16, ${(1 + k * 0.85).toFixed(3)}, ${(0.4 - k * 0.15).toFixed(3)}, 1)`;
};

export const AI_MODELS: Array<{ id: string; label: string; hint: string }> = [
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash", hint: "fast · balanced (default)" },
  { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", hint: "cheapest · quickest" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", hint: "deepest reasoning" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "strong multimodal" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", hint: "balanced openai" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", hint: "fast openai" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", hint: "frontier quality" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", hint: "cheap openai" },
  { id: "openrouter/openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)", hint: "openrouter · free" },
  { id: "openrouter/nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (free)", hint: "openrouter · free" },
  { id: "openrouter/google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)", hint: "openrouter · free" },
];

export const DEFAULT_AI_MODEL = AI_MODELS[0].id;

export const EDITOR_THEMES: Array<{ id: string; label: string; hint: string }> = [
  { id: "cyber", label: "Cyber", hint: "teal neon on ink (default)" },
  { id: "glass", label: "Glass", hint: "soft frosted greys" },
  { id: "neobrutalist", label: "Neobrutalist", hint: "paper white + hot accents" },
  { id: "matrix", label: "Matrix", hint: "green terminal" },
  { id: "midnight", label: "Midnight", hint: "deep indigo dark" },
];

export const DEFAULT_EDITOR_THEME = "cyber";

const ALL_ON: Record<PanelId, boolean> = {
  templates: true,
  ai: true,
  text: true,
  components: true,
  shapes: true,
  uploads: true,
  design: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      aiEnabled: true,
      autoHidePanel: false,
      aiModel: DEFAULT_AI_MODEL,
      editorTheme: DEFAULT_EDITOR_THEME,
      panels: { ...ALL_ON },
      panelDurationMs: DEFAULT_PANEL_DURATION,
      panelStiffness: DEFAULT_PANEL_STIFFNESS,
      reduceMotion: true,
      brandKit: { ...DEFAULT_BRAND_KIT },
      setBrandKit: (patch) => set((s) => ({ brandKit: { ...s.brandKit, ...patch } })),
      resetBrandKit: () => set({ brandKit: { ...DEFAULT_BRAND_KIT } }),
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setAutoHidePanel: (autoHidePanel) => set({ autoHidePanel }),
      setAiModel: (aiModel) => set({ aiModel }),
      setEditorTheme: (editorTheme) => set({ editorTheme }),
      setPanelDurationMs: (panelDurationMs) => set({ panelDurationMs }),
      setPanelStiffness: (panelStiffness) => set({ panelStiffness }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      resetMotion: () =>
        set({
          panelDurationMs: DEFAULT_PANEL_DURATION,
          panelStiffness: DEFAULT_PANEL_STIFFNESS,
          reduceMotion: true,
        }),
      togglePanel: (id) =>
        set((s) => {
          const next = { ...s.panels, [id]: !s.panels[id] };
          // never let the user hide every panel
          if (!Object.values(next).some(Boolean)) return s;
          return { panels: next };
        }),
      resetPanels: () => set({ panels: { ...ALL_ON } }),
    }),
    {
      name: "positron.settings",
      version: 3,
      migrate: (state) => ({
        ...(state as SettingsState),
        reduceMotion: true,
        brandKit: { ...DEFAULT_BRAND_KIT, ...((state as SettingsState)?.brandKit ?? {}) },
      }),
    },
  ),
);