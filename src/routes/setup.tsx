import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/setup")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: function SetupGone() {
    return null;
  },
});
