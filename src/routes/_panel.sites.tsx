import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_panel/sites")({
  component: SitesLayout,
});

function SitesLayout() {
  return <Outlet />;
}
