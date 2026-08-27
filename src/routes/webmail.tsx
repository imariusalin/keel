import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/webmail")({
  component: WebmailLayout,
});

function WebmailLayout() {
  return <Outlet />;
}
