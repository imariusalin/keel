import { createFileRoute, redirect } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Shell } from "@/components/shell";
import { getPanelState, sessionUser } from "@/lib/panel/server";

export const Route = createFileRoute("/_panel")({
  loader: async () => {
    const user = await sessionUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return getPanelState();
  },
  component: PanelLayout,
});