import { createFileRoute } from "@tanstack/react-router";
import { DemoStage, usePortraitStage } from "@/components/demo/DemoStage";

type DemoSearch = { view?: "phone" | "desktop" };

export const Route = createFileRoute("/demo")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): DemoSearch => {
    const view = search["view"];
    return view === "phone" || view === "desktop" ? { view } : {};
  },
  head: () => ({
    meta: [
      { title: "Classroom Coach — Guided demo" },
      {
        name: "description",
        content:
          "A self-playing walkthrough of Classroom Coach: design a situation, rehearse it as it unfolds, and review what changed.",
      },
      { property: "og:title", content: "Classroom Coach — Guided demo" },
      {
        property: "og:description",
        content: "Watch a difficult professional moment get designed, rehearsed, and reviewed end to end.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Coach Demo" },
      { name: "theme-color", content: "#0f1f3d" },
    ],
    links: [{ rel: "manifest", href: "/demo.webmanifest" }],
  }),
  component: DemoPage,
});

function DemoPage() {
  const { view } = Route.useSearch();
  const portrait = usePortraitStage(view);

  if (portrait) {
    return (
      <div className="min-h-[100dvh] w-full bg-background">
        <DemoStage compact />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-8 py-8">
      <DemoStage />
    </div>
  );
}
