import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SettingsDialog } from "@/components/editor/SettingsDialog";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Positron Studio" },
      {
        name: "description",
        content: "Customize Positron Studio editor behavior, AI features, panels, motion, and themes.",
      },
      { property: "og:title", content: "Settings — Positron Studio" },
      { property: "og:description", content: "Customize your Positron Studio design editor experience." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://positronstudio.lovable.app/settings" }],
  }),
});

function SettingsPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-ink">
      <h1 className="sr-only">Positron Studio settings</h1>
      <SettingsDialog onClose={() => navigate({ to: "/" })} />
    </main>
  );
}
