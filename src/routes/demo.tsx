import { createFileRoute } from "@tanstack/react-router";
import { DemoStage } from "@/components/demo/DemoStage";

export const Route = createFileRoute("/demo")({
  ssr: false,
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
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-8 py-8">
      <DemoStage />
    </div>
  );
}
