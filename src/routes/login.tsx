import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeelMark } from "@/components/keel-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { adminStatus, getPanelState } from "@/lib/panel/server";

export const Route = createFileRoute("/login")({
  loader: async () => {
    const [status, state] = await Promise.all([adminStatus(), getPanelState()]);
    return { ...status, hostname: state.settings.hostname };
  },
  component: LoginPage,
});

function LoginPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const [email, setEmail] = useState(data.hasAdmin ? "" : "admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const firstRun = !data.hasAdmin;

  function resolveEmail(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value) return "";
    if (value.includes("@")) return value;
    const host = data.hostname.includes(".") ? data.hostname : `${data.hostname}.local`;
    return `${value}@${host}`;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const resolved = resolveEmail(email);
    if (!resolved || password.length < 8) {
      toast.error("Use an email (or admin) and a password of 8+ characters.");
      return;
    }
    setBusy(true);
    try {
      if (firstRun) {
        const { error } = await authClient.signUp.email({
          email: resolved,
          password,
          name: "Admin",
          callbackURL: "/",
        });
        if (error) throw new Error(error.message || "Could not create admin");
      } else {
        const { error } = await authClient.signIn.email({
          email: resolved,
          password,
          callbackURL: "/",
        });
        if (error) throw new Error(error.message || "Wrong email or password");
      }
      toast.success(firstRun ? "Admin account created" : "Welcome back");
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <KeelMark className="size-8" />
          <span className="text-lg font-semibold tracking-tight">Keel</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstRun ? "Create the admin account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {firstRun
            ? "This box has no admin yet. Pick an email and a password. Store the password somewhere safe."
            : `Panel on ${data.hostname}`}
        </p>
        <form className="mt-8 grid gap-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email or username</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              placeholder="admin"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={firstRun ? "new-password" : "current-password"}
              minLength={8}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : firstRun ? "Create admin" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
