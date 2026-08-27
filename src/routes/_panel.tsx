import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { getPanelState } from "@/lib/panel/server";

export const Route = createFileRoute("/_panel")({
  loader: async () => {
    const state = await getPanelState();
    if (!state.settings.setupComplete) {
      throw redirect({ to: "/setup" });
    }
    return state;
  },
  component: PanelLayout,
});

function PanelLayout() {
  const data = Route.useLoaderData();
  return <Shell settings={data.settings} modules={data.modules} />;
}
