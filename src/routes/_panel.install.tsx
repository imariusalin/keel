import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_panel/install")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: function InstallGone() {
    return null;
  },
});
