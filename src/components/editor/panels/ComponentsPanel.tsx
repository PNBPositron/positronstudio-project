import { useState } from "react";
import {
  HelpCircle, BarChart3, LineChart, PieChart, AreaChart, MousePointerClick, Youtube, Globe,
  Square, Hash, Gauge, AlertTriangle, ListChecks, Quote, User, CreditCard, Command, TrendingUp,
  AppWindow, Chrome, Search, TerminalSquare, Smartphone, MessageSquare, Rows3, ToggleRight, LogIn, Bell,
  PanelBottom, PanelLeft, LayoutPanelTop, FolderOpen, SlidersHorizontal, Terminal,
} from "lucide-react";
import {
  useEditor, newQuiz, newPoll, newChart, newButton, newEmbed, newUi, toEmbedSrc,
  UI_STYLE_THEMES, chartStylePatch, solidThemeBg, type ChartKind, type ButtonAction, type UiKind, type UiStyle,
} from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { UiRender } from "../UiRender";

const UI_KINDS: Array<{ kind: UiKind; label: string; Icon: typeof Square }> = [
  { kind: "card", label: "Card", Icon: Square },
  { kind: "stat", label: "Stat", Icon: TrendingUp },
  { kind: "badge", label: "Badge", Icon: Hash },
  { kind: "progress", label: "Progress", Icon: Gauge },
  { kind: "alert", label: "Alert", Icon: AlertTriangle },
  { kind: "list", label: "List", Icon: ListChecks },
  { kind: "quote", label: "Quote", Icon: Quote },
  { kind: "profile", label: "Profile", Icon: User },
  { kind: "pricing", label: "Pricing", Icon: CreditCard },
  { kind: "kbd", label: "Key", Icon: Command },
];

const REAL_UI_KINDS: Array<{ kind: UiKind; label: string; Icon: typeof Square }> = [
  { kind: "window", label: "Window", Icon: AppWindow },
  { kind: "browser", label: "Browser", Icon: Chrome },
  { kind: "search", label: "Search bar", Icon: Search },
  { kind: "terminal", label: "Terminal", Icon: TerminalSquare },
  { kind: "phone", label: "Phone", Icon: Smartphone },
  { kind: "modal", label: "Modal", Icon: MessageSquare },
  { kind: "tabs", label: "Tabs", Icon: Rows3 },
  { kind: "toggle", label: "Toggles", Icon: ToggleRight },
  { kind: "login", label: "Login", Icon: LogIn },
  { kind: "notification", label: "Toast", Icon: Bell },
  { kind: "taskbar", label: "Window taskbar", Icon: PanelBottom },
  { kind: "vtabs", label: "Vertical tabs", Icon: PanelLeft },
  { kind: "kdePanel", label: "Desktop panel", Icon: LayoutPanelTop },
  { kind: "kdeFiles", label: "File manager", Icon: FolderOpen },
  { kind: "kdeRunner", label: "Command runner", Icon: Terminal },
  { kind: "kdeSettings", label: "System settings", Icon: SlidersHorizontal },
];

const STYLES = Object.keys(UI_STYLE_THEMES) as UiStyle[];

export function ComponentsPanel() {
  const { add, selectedId, elements, update } = useEditor();
  const [style, setStyle] = useState<UiStyle>("cyber");
  const [embedUrl, setEmbedUrl] = useState("");

  const selected = elements.find((e) => e.id === selectedId);

  const pickStyle = (s: UiStyle) => {
    setStyle(s);
    if (selected?.type === "ui") {
      update(selected.id, { uiStyle: s, accentColor: UI_STYLE_THEMES[s].accent });
    }
    if (selected?.type === "chart") {
      update(selected.id, chartStylePatch(s));
    }
  };

  const themedQuiz = () => {
    const t = UI_STYLE_THEMES[style];
    return newQuiz({ bgColor: solidThemeBg(style), fgColor: t.fg, accentColor: t.accent });
  };
  const themedChart = (kind: ChartKind, label: string) => {
    return newChart(kind, { title: `${label} chart`, ...chartStylePatch(style) });
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Components" />

      <div className="brutal-border-2 space-y-2 bg-surface p-3">
        <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Style</div>
        <div className="grid grid-cols-4 gap-1.5">
          {STYLES.map((s) => {
            const t = UI_STYLE_THEMES[s];
            const active = style === s;
            return (
              <button
                key={s}
                onClick={() => pickStyle(s)}
                className={`brutal-press border px-1.5 py-2 font-display text-[9px] uppercase tracking-[0.12em] ${
                  active ? "border-teal glow-teal" : "border-teal/30"
                }`}
                style={{ background: t.bg.startsWith("#") ? t.bg : t.bg.includes("gradient") ? t.bg : "#2a3550", color: t.fg }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="font-mono text-[9px] text-teal/50">
          &gt; Applies to new components, charts{selected?.type === "ui" || selected?.type === "chart" ? " and the selected one" : ""}.
        </p>
      </div>

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Interfaces</div>
      <div className="grid grid-cols-2 gap-2">
        {REAL_UI_KINDS.map(({ kind, label, Icon }) => (
          <button
            key={kind}
            onClick={() => add(newUi(kind, style))}
            className="brutal-border-2 brutal-press flex flex-col items-center gap-1.5 bg-surface p-2 text-teal hover:border-teal"
          >
            <div className="pointer-events-none h-16 w-full overflow-hidden">
              <UiRender element={newUi(kind, style, { id: `prev-${kind}` })} preview />
            </div>
            <span className="flex items-center gap-1 font-display text-[9px] uppercase tracking-[0.15em]">
              <Icon className="h-3 w-3" /> {label}
            </span>
          </button>
        ))}
      </div>

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ UI</div>
      <div className="grid grid-cols-2 gap-2">
        {UI_KINDS.map(({ kind, label, Icon }) => (
          <button
            key={kind}
            onClick={() => add(newUi(kind, style))}
            className="brutal-border-2 brutal-press flex flex-col items-center gap-1.5 bg-surface p-2 text-teal hover:border-teal"
          >
            <div className="pointer-events-none h-16 w-full overflow-hidden">
              <UiRender element={newUi(kind, style, { id: `prev-${kind}` })} preview />
            </div>
            <span className="flex items-center gap-1 font-display text-[9px] uppercase tracking-[0.15em]">
              <Icon className="h-3 w-3" /> {label}
            </span>
          </button>
        ))}
      </div>

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Interactive</div>
      <button
        onClick={() => add(themedQuiz())}
        className="brutal-border-2 brutal-press flex w-full items-center justify-center gap-2 bg-blue px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> ADD QUIZ
      </button>
      <button
        onClick={() => {
          const t = UI_STYLE_THEMES[style];
          add(newPoll({ bgColor: solidThemeBg(style), fgColor: t.fg, accentColor: t.accent }));
        }}
        className="brutal-border-2 brutal-press flex w-full items-center justify-center gap-2 bg-surface px-3 py-2 font-display text-[11px] tracking-[0.2em] text-teal hover:border-teal"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> ADD LIVE POLL
      </button>
      <div className="grid grid-cols-2 gap-2">
        {([
          { label: "NEXT →", action: "next-slide" },
          { label: "← BACK", action: "prev-slide" },
          { label: "RESTART", action: "first-slide" },
          { label: "LINK ↗", action: "link" },
        ] as Array<{ label: string; action: ButtonAction }>).map((b) => {
          const t = UI_STYLE_THEMES[style];
          const bg = solidThemeBg(style);
          return (
            <button
              key={b.action}
              onClick={() =>
                add(
                  newButton({
                    text: b.label,
                    action: b.action,
                    bgColor: t.accent,
                    fgColor: t.onAccent ?? "#ffffff",
                    borderColor: t.border,
                    borderWidth: t.borderWidth,
                    cornerRadius: t.radius,
                    fontFamily: t.font.split(",")[0].replace(/'/g, ""),
                  }),
                )
              }
              className="brutal-border-2 brutal-press flex items-center justify-center gap-1 py-2 font-display text-[10px] tracking-[0.15em]"
              style={{ background: bg, color: t.fg, borderColor: t.border }}
            >
              <MousePointerClick className="h-3 w-3" /> {b.label}
            </button>
          );
        })}
      </div>

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Embed</div>
      <div className="brutal-border-2 space-y-2 bg-surface p-3">
        <div className="flex items-center gap-2 font-display text-[11px] tracking-[0.2em] text-teal">
          <Globe className="h-3.5 w-3.5" /> IFRAME_URL
        </div>
        <input
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="youtube.com/watch?v=… · vimeo.com/… · any embed url"
          className="w-full border border-teal/40 bg-ink px-2 py-1.5 font-mono text-[11px] text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
        />
        <button
          onClick={() => {
            const src = toEmbedSrc(embedUrl);
            if (!src) return;
            add(newEmbed(src));
            setEmbedUrl("");
          }}
          disabled={!embedUrl.trim()}
          className="brutal-border brutal-press flex w-full items-center justify-center gap-2 bg-blue px-3 py-1.5 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
        >
          <Youtube className="h-3.5 w-3.5" /> ADD EMBED
        </button>
        <p className="font-mono text-[9px] text-teal/50">
          &gt; YouTube / Vimeo / any allow-listed iframe URL. Interactive in Present.
        </p>
      </div>

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Charts & Graphs</div>
      <div className="grid grid-cols-2 gap-2">
        {([
          { kind: "bar", label: "Bar", Icon: BarChart3 },
          { kind: "line", label: "Line", Icon: LineChart },
          { kind: "area", label: "Area", Icon: AreaChart },
          { kind: "pie", label: "Pie", Icon: PieChart },
          { kind: "donut", label: "Donut", Icon: PieChart },
        ] as Array<{ kind: ChartKind; label: string; Icon: typeof BarChart3 }>).map(({ kind, label, Icon }) => (
          <button
            key={kind}
            onClick={() => add(themedChart(kind, label))}
            className="brutal-border-2 brutal-press flex flex-col items-center justify-center gap-1 bg-surface py-3 text-teal hover:border-teal"
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            <span className="font-display text-[10px] uppercase tracking-[0.15em]">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
