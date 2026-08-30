import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useEditor, type Page, type AnyElement } from "@/store/editor";
import {
  Undo2,
  Redo2,
  Trash2,
  Download,
  Play,
  Save,
  Cloud,
  FolderOpen,
  LogOut,
  FilePlus,
  Loader2,
  User as UserIcon,
  ChevronDown,
  Share2,
  Upload,
  Languages,
  Settings,
} from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { saveDesign, publishAsTemplate } from "@/lib/designs";
import { MyDesignsDialog } from "./MyDesignsDialog";
import {
  exportPNG,
  exportPDF,
  exportPPTX,
  exportGIF,
  exportHTML,
  exportJSON,
  importJSONFile,
} from "@/lib/export";
import { useServerFn } from "@tanstack/react-start";
import { translateTexts } from "@/lib/ai-templates.functions";
import { useSettings } from "@/store/settings";
import { useUi } from "@/store/ui";

const LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Arabic",
  "Hindi",
  "Russian",
  "Turkish",
  "Polish",
  "Swedish",
  "English",
];

export function Toolbar() {
  const { undo, redo, clear, designId, designName, setDesignName, setDesignMeta, newDesign } =
    useEditor();
  const { user } = useAuth();
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const translate = useServerFn(translateTexts);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const [exporting, setExporting] = useState<
    null | "png" | "pdf" | "pptx" | "gif" | "html" | "json"
  >(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const runExport = async (kind: "png" | "pdf" | "pptx" | "gif" | "html" | "json") => {
    setExportOpen(false);
    setExporting(kind);
    try {
      const n = designName || "positron";
      if (kind === "png") await exportPNG(n);
      else if (kind === "pdf") await exportPDF(n);
      else if (kind === "pptx") await exportPPTX(n);
      else if (kind === "html") await exportHTML(n);
      else if (kind === "json") exportJSON(n);
      else await exportGIF(n);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (file: File) => {
    try {
      await importJSONFile(file);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { pages, canvasW, canvasH } = useEditor.getState();
      const saved = await saveDesign({
        id: designId,
        name: designName || "Untitled design",
        canvas_w: canvasW,
        canvas_h: canvasH,
        pages,
      });
      setDesignMeta({ id: saved.id, name: saved.name });
      setSavedAt(Date.now());
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!user || publishing) return;
    const name = window.prompt("Template name?", designName || "Untitled template");
    if (!name) return;
    setPublishing(true);
    try {
      const { pages, canvasW, canvasH } = useEditor.getState();
      const tpl = await publishAsTemplate({
        name,
        canvas_w: canvasW,
        canvas_h: canvasH,
        pages,
      });
      const link = `${window.location.origin}/t/${tpl.id}`;
      setShareLink(link);
      try {
        await navigator.clipboard.writeText(link);
      } catch {
        /* clipboard blocked — link is shown in the dialog */
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleTranslate = async (target: string) => {
    setLangOpen(false);
    if (translating) return;
    setTranslating(true);
    try {
      const { pages, loadPages } = useEditor.getState();
      // Collect strings with a stable path index.
      const strings: string[] = [];
      const paths: Array<{
        p: number;
        i: number;
        field: "text" | "question" | "opt";
        oi?: number;
      }> = [];
      pages.forEach((pg, p) => {
        pg.elements.forEach((el, i) => {
          if (el.type === "text" && el.text) {
            strings.push(el.text);
            paths.push({ p, i, field: "text" });
          }
          if (el.type === "button" && el.text) {
            strings.push(el.text);
            paths.push({ p, i, field: "text" });
          }
          if (el.type === "quiz") {
            if (el.question) {
              strings.push(el.question);
              paths.push({ p, i, field: "question" });
            }
            el.options.forEach((o, oi) => {
              if (o.text) {
                strings.push(o.text);
                paths.push({ p, i, field: "opt", oi });
              }
            });
          }
        });
      });
      if (strings.length === 0) {
        alert("No text to translate.");
        return;
      }

      const { translations } = await translate({ data: { texts: strings, target } });

      const nextPages: Page[] = pages.map((pg) => ({
        ...pg,
        elements: pg.elements.map((e) => ({ ...e })) as AnyElement[],
      }));
      paths.forEach((path, idx) => {
        const t = translations[idx];
        if (typeof t !== "string") return;
        const el = nextPages[path.p].elements[path.i] as AnyElement;
        if (el.type === "text" && path.field === "text") el.text = t;
        else if (el.type === "button" && path.field === "text") el.text = t;
        else if (el.type === "quiz") {
          if (path.field === "question") el.question = t;
          else if (path.field === "opt" && typeof path.oi === "number") {
            el.options = el.options.map((o, oi) => (oi === path.oi ? { ...o, text: t } : o));
          }
        }
      });
      loadPages(nextPages);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <header className="relative flex items-center justify-between gap-4 border-b border-teal/40 bg-ink px-5 py-3">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent opacity-80" />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3"></div>
        <div className="ml-4 hidden items-center gap-2 md:flex">
          <input
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            className="brutal-border-2 bg-surface px-3 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal focus:bg-surface-2"
          />
          {savedAt && <span className="font-mono text-[10px] text-teal/70">✓ saved</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <IconBtn onClick={undo} title="Undo">
          <Undo2 className="h-4 w-4" strokeWidth={2.5} />
        </IconBtn>
        <IconBtn onClick={redo} title="Redo">
          <Redo2 className="h-4 w-4" strokeWidth={2.5} />
        </IconBtn>
        {user ? (
          <BentoMenu
            onSettings={() => setSettingsOpen(true)}
            onNewDesign={newDesign}
            onMyDesigns={() => setOpen(true)}
            onShare={handlePublish}
            onExport={() => setExportOpen((v) => !v)}
            publishing={publishing}
            exporting={!!exporting}
          />
        ) : (
          <IconBtn onClick={clear} title="Clear">
            <Trash2 className="h-4 w-4" strokeWidth={2.5} />
          </IconBtn>
        )}
        <IconBtn onClick={() => importRef.current?.click()} title="Import .json design">
          <Upload className="h-4 w-4" strokeWidth={2.5} />
        </IconBtn>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = "";
          }}
        />

        {user ? (
          <>
            {aiEnabled && (
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  disabled={translating}
                  title="Translate deck"
                  aria-label="Translate deck"
                  className="brutal-border-2 brutal-press grid h-10 w-10 place-items-center bg-surface text-teal hover:bg-surface-2 hover:border-teal disabled:opacity-60"
                >
                  {translating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" strokeWidth={2.5} />
                  )}
                </button>
                {langOpen && (
                  <div className="brutal-border-2 absolute right-0 top-12 z-50 max-h-72 w-52 overflow-y-auto bg-ink p-1">
                    <div className="border-b border-teal/30 px-3 py-1.5 font-mono text-[10px] text-teal/60">
                      TRANSLATE TO...
                    </div>
                    {LANGUAGES.map((l) => (
                      <button
                        key={l}
                        onClick={() => handleTranslate(l)}
                        className="flex w-full items-center px-3 py-2 font-display text-[11px] tracking-[0.15em] text-teal hover:bg-surface"
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="brutal-border brutal-press flex items-center gap-2 bg-surface px-4 py-2 font-display text-xs tracking-[0.2em] text-teal hover:bg-teal/10 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" strokeWidth={3} />
              )}
              SAVE
            </button>
            <UserMenu email={user.email ?? ""} />
          </>
        ) : (
          <Link
            to="/auth"
            search={{ next: undefined }}
            className="brutal-border brutal-press flex items-center gap-2 bg-surface px-4 py-2 font-display text-xs tracking-[0.2em] text-teal hover:bg-teal/10"
          >
            <Cloud className="h-3.5 w-3.5" strokeWidth={3} />
            SIGN IN
          </Link>
        )}

        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={!!exporting}
            className="brutal-border brutal-shadow-sm brutal-press flex items-center gap-2 bg-blue px-4 py-2 font-display text-xs tracking-[0.2em] text-ink disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={3} />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={3} />
            )}
            {exporting ? exporting.toUpperCase() : "EXPORT"}
            <ChevronDown className="h-3 w-3" strokeWidth={3} />
          </button>
          {exportOpen && (
            <div className="brutal-border-2 absolute right-0 top-12 z-50 w-52 bg-ink p-1">
              {(["png", "pdf", "pptx", "html", "json", "gif"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => runExport(k)}
                  className="flex w-full items-center justify-between px-3 py-2 font-display text-[11px] tracking-[0.2em] text-teal hover:bg-surface"
                >
                  <span>EXPORT .{k.toUpperCase()}</span>
                  <span className="font-mono text-[9px] text-teal/60">
                    {k === "png"
                      ? "current"
                      : k === "gif"
                        ? "animated"
                        : k === "html"
                          ? "interactive"
                          : k === "json"
                            ? "editable"
                            : "all pages"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && <MyDesignsDialog onClose={() => setOpen(false)} />}
      {shareLink && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-6">
          <div className="brutal-border-2 w-full max-w-md bg-surface p-6">
            <div className="font-display text-sm tracking-[0.2em] text-teal">
              ✓ PUBLISHED · SHARE LINK
            </div>
            <p className="mt-2 font-mono text-[11px] text-teal/60">
              Anyone with this link can view your deck.
            </p>
            <input
              readOnly
              value={shareLink}
              onFocus={(e) => e.currentTarget.select()}
              className="brutal-border-2 mt-4 w-full bg-ink px-3 py-2 font-mono text-xs text-teal"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(shareLink).catch(() => {})}
                className="brutal-border brutal-press flex-1 bg-blue px-4 py-2 font-display text-xs tracking-[0.2em] text-ink"
              >
                COPY LINK
              </button>
              <button
                onClick={() => setShareLink(null)}
                className="brutal-border brutal-press flex-1 bg-surface px-4 py-2 font-display text-xs tracking-[0.2em] text-teal"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function BentoMenu({
  onSettings,
  onNewDesign,
  onMyDesigns,
  onShare,
  onExport,
  publishing,
  exporting,
}: {
  onSettings: () => void;
  onNewDesign: () => void;
  onMyDesigns: () => void;
  onShare: () => void;
  onExport: () => void;
  publishing: boolean;
  exporting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "Settings", icon: Settings, action: onSettings },
    { label: "New design", icon: FilePlus, action: onNewDesign },
    { label: "My designs", icon: FolderOpen, action: onMyDesigns },
    {
      label: publishing ? "Sharing..." : "Share",
      icon: publishing ? Loader2 : Share2,
      action: onShare,
    },
    { label: exporting ? "Exporting..." : "Export", icon: Download, action: onExport },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open editor menu"
        title="Editor menu"
        className="brutal-border-2 brutal-press grid h-10 w-10 place-items-center bg-blue text-ink"
      >
        <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
        </span>
      </button>
      {open && (
        <div className="brutal-border-2 absolute right-0 top-12 z-50 grid w-52 grid-cols-2 gap-1 bg-ink p-1">
          {items.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={() => {
                action();
                setOpen(false);
              }}
              className="flex min-h-16 flex-col items-center justify-center gap-1 bg-surface px-2 py-2 font-display text-[9px] tracking-[0.12em] text-teal hover:bg-blue-deep"
            >
              <Icon
                className={label === "Sharing..." ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                strokeWidth={2.5}
              />
              {label.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={email}
        className="brutal-border-2 brutal-press grid h-10 w-10 place-items-center bg-blue-deep text-teal glow-blue"
      >
        <UserIcon className="h-4 w-4" strokeWidth={2.5} />
      </button>
      {open && (
        <div
          className="brutal-border-2 absolute right-0 top-12 z-50 w-56 bg-ink p-2"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="border-b border-teal/30 px-2 py-1.5 font-mono text-[10px] text-teal/70 truncate">
            {email}
          </div>
          <button
            onClick={() => signOut()}
            className="mt-1 flex w-full items-center gap-2 px-2 py-1.5 font-display text-[11px] tracking-[0.2em] text-teal hover:bg-surface"
          >
            <LogOut className="h-3.5 w-3.5" /> SIGN OUT
          </button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="brutal-border-2 brutal-press grid h-10 w-10 place-items-center bg-surface text-teal hover:bg-surface-2 hover:text-teal hover:border-teal"
    >
      {children}
    </button>
  );
}
